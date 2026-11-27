"""Pixelize, key out background, and unify palette for 8-bit observatory sprites."""

from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "art"

# Harmonized 8-color blue-cyan PICO-8 palette
PALETTE_HEX = [
    "#061326",  # deep outline / shadow navy
    "#0d254a",  # dark sapphire
    "#173f7a",  # cobalt midtone
    "#2563eb",  # royal blue
    "#38bdf8",  # sky cyan
    "#67e8f9",  # bright ice cyan
    "#818cf8",  # indigo glow
    "#e0f2fe",  # ice white highlight
]

PALETTE_RGB = np.array(
    [[int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)] for h in PALETTE_HEX],
    dtype=np.float32,
)


def _is_bg_pixel(rgb: np.ndarray, ref_colors: list[np.ndarray], dist_thresh: float = 68.0) -> bool:
    r, g, b = float(rgb[0]), float(rgb[1]), float(rgb[2])
    # Magenta chroma key check
    if (r - g) > 42.0 and (b - g) > 42.0:
        return True
    for ref in ref_colors:
        if np.linalg.norm(rgb.astype(np.float32) - ref) <= dist_thresh:
            return True
    return False


def remove_background_floodfill(img: Image.Image, mode: str) -> Image.Image:
    """Remove outer background using BFS flood-fill from image borders."""
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.uint8)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    # Sample reference background colors from top corners (or all 4 corners for sprites)
    corners = [(0, 0), (0, w - 1)]
    if mode != "mountain":
        corners.extend([(h - 1, 0), (h - 1, w - 1)])
    ref_colors = [rgb[y, x].astype(np.float32) for y, x in corners]

    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_push(y: int, x: int) -> None:
        if 0 <= y < h and 0 <= x < w and not visited[y, x]:
            if alpha[y, x] < 32 or _is_bg_pixel(rgb[y, x], ref_colors):
                visited[y, x] = True
                q.append((y, x))

    # Seed from top edge (always) and side/bottom edges for isolated sprites
    for x in range(w):
        try_push(0, x)
        if mode != "mountain":
            try_push(h - 1, x)
    if mode != "mountain":
        for y in range(h):
            try_push(y, 0)
            try_push(y, w - 1)
    else:
        # For mountains, also seed sides in upper half
        for y in range(h // 2):
            try_push(y, 0)
            try_push(y, w - 1)

    while q:
        cy, cx = q.popleft()
        alpha[cy, cx] = 0
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                if alpha[ny, nx] < 32 or _is_bg_pixel(rgb[ny, nx], ref_colors):
                    visited[ny, nx] = True
                    q.append((ny, nx))

    # Also clear isolated magenta fringe pixels anywhere
    magenta_mask = (rgb[:, :, 0].astype(np.int16) - rgb[:, :, 1].astype(np.int16) > 55) & (
        rgb[:, :, 2].astype(np.int16) - rgb[:, :, 1].astype(np.int16) > 55
    )
    alpha[magenta_mask] = 0

    arr[:, :, 3] = alpha
    return Image.fromarray(arr, mode="RGBA")


def quantize_to_palette(img: Image.Image) -> Image.Image:
    """Snap opaque pixels to the unified 8-color blue-cyan palette."""
    arr = np.array(img.convert("RGBA"), dtype=np.uint8)
    alpha = arr[:, :, 3]
    opaque = alpha >= 120
    arr[:, :, 3] = np.where(opaque, 255, 0).astype(np.uint8)

    if np.any(opaque):
        pixels = arr[opaque][:, :3].astype(np.float32)  # (N, 3)
        dists = np.linalg.norm(pixels[:, None, :] - PALETTE_RGB[None, :, :], axis=2)
        nearest = np.argmin(dists, axis=1)
        snapped = PALETTE_RGB[nearest].astype(np.uint8)
        arr[opaque, :3] = snapped

    arr[~opaque, :3] = 0
    return Image.fromarray(arr, mode="RGBA")


def process_sprite(src_path: Path, dst_path: Path, target_w: int, target_h: int, mode: str) -> None:
    img = Image.open(src_path).convert("RGBA")
    keyed = remove_background_floodfill(img, mode=mode)

    arr = np.array(keyed, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] >= 120)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError(f"Empty sprite after background removal: {src_path}")

    if mode == "mountain":
        # Crop horizontally only if needed, anchor strictly to bottom edge
        min_y = int(ys.min())
        cropped = keyed.crop((0, min_y, keyed.width, keyed.height))
        # Resize to fit target_w x target_h keeping bottom alignment
        scale = min(target_w / cropped.width, target_h / cropped.height)
        new_w = target_w
        new_h = max(12, min(target_h, round(cropped.height * scale)))
        resized = cropped.resize((new_w, new_h), Image.Resampling.BOX)
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        canvas.paste(resized, (0, target_h - new_h))
    else:
        min_x, max_x = int(xs.min()), int(xs.max()) + 1
        min_y, max_y = int(ys.min()), int(ys.max()) + 1
        cropped = keyed.crop((min_x, min_y, max_x, max_y))
        pad = 1 if target_w >= 16 else 0
        avail_w = max(1, target_w - pad * 2)
        avail_h = max(1, target_h - pad * 2)
        scale = min(avail_w / cropped.width, avail_h / cropped.height)
        new_w = max(1, round(cropped.width * scale))
        new_h = max(1, round(cropped.height * scale))
        resized = cropped.resize((new_w, new_h), Image.Resampling.BOX)
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        ox = (target_w - new_w) // 2
        oy = (target_h - new_h) // 2
        canvas.paste(resized, (ox, oy))

    final_img = quantize_to_palette(canvas)
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    final_img.save(dst_path, format="PNG")

    farr = np.array(final_img)
    fill_pct = float(np.mean(farr[:, :, 3] > 0) * 100.0)
    print(f"OK {dst_path.name:26s} {target_w}x{target_h}  fill={fill_pct:.1f}%")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, help="JSON mapping output filename -> source path")
    args = parser.parse_args()

    mapping = json.loads(Path(args.manifest).read_text(encoding="utf-8"))

    specs: dict[str, tuple[int, int, str]] = {
        "mountains-far.png": (160, 48, "mountain"),
        "mountains-near.png": (160, 48, "mountain"),
        "island-s.png": (32, 32, "island"),
        "island-p.png": (32, 32, "island"),
        "island-noble-gases.png": (32, 32, "island"),
        "island-d.png": (32, 32, "island"),
        "island-platinum-noble.png": (32, 32, "island"),
        "island-f.png": (32, 32, "island"),
        "stone-1.png": (8, 8, "stone"),
        "stone-2.png": (8, 8, "stone"),
        "stone-3.png": (8, 8, "stone"),
    }

    for out_name, (tw, th, mode) in specs.items():
        src = mapping.get(out_name)
        if not src:
            raise KeyError(f"Missing source path for {out_name}")
        process_sprite(Path(src), OUT_DIR / out_name, tw, th, mode)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
