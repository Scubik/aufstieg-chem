"""Build realistic 8-bit chemical islands (32x32) and day mountain layers (160x48)."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "art"


def _is_bg_pixel(rgb: np.ndarray, ref_colors: list[np.ndarray], dist_thresh: float = 68.0) -> bool:
    r, g, b = float(rgb[0]), float(rgb[1]), float(rgb[2])
    if (r - g) > 42.0 and (b - g) > 42.0:
        return True
    for ref in ref_colors:
        if np.linalg.norm(rgb.astype(np.float32) - ref) <= dist_thresh:
            return True
    return False


def remove_background_floodfill(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    arr = np.array(rgba, dtype=np.uint8)
    h, w, _ = arr.shape
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]

    corners = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
    ref_colors = [rgb[y, x].astype(np.float32) for y, x in corners]

    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    def try_push(y: int, x: int) -> None:
        if 0 <= y < h and 0 <= x < w and not visited[y, x]:
            if alpha[y, x] < 32 or _is_bg_pixel(rgb[y, x], ref_colors):
                visited[y, x] = True
                q.append((y, x))

    for x in range(w):
        try_push(0, x)
        try_push(h - 1, x)
    for y in range(h):
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

    magenta_mask = (rgb[:, :, 0].astype(np.int16) - rgb[:, :, 1].astype(np.int16) > 52) & (
        rgb[:, :, 2].astype(np.int16) - rgb[:, :, 1].astype(np.int16) > 52
    )
    alpha[magenta_mask] = 0
    arr[:, :, 3] = alpha
    return Image.fromarray(arr, mode="RGBA")


def process_generated_island(src_path: Path, dst_path: Path, size: int = 32) -> None:
    img = Image.open(src_path).convert("RGBA")
    keyed = remove_background_floodfill(img)
    arr = np.array(keyed, dtype=np.uint8)
    ys, xs = np.where(arr[:, :, 3] >= 120)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError(f"Empty island sprite after keying: {src_path}")

    min_x, max_x = int(xs.min()), int(xs.max()) + 1
    min_y, max_y = int(ys.min()), int(ys.max()) + 1
    cropped = keyed.crop((min_x, min_y, max_x, max_y))

    pad = 1
    avail = size - pad * 2
    scale = min(avail / cropped.width, avail / cropped.height)
    new_w = max(1, round(cropped.width * scale))
    new_h = max(1, round(cropped.height * scale))
    resized = cropped.resize((new_w, new_h), Image.Resampling.BOX)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(resized, ((size - new_w) // 2, (size - new_h) // 2))

    out_arr = np.array(canvas, dtype=np.uint8)
    opaque = out_arr[:, :, 3] >= 120
    out_arr[:, :, 3] = np.where(opaque, 255, 0).astype(np.uint8)
    out_arr[~opaque, :3] = 0

    clean = Image.fromarray(out_arr, mode="RGBA")
    rgb_img = clean.convert("RGB").quantize(colors=10, method=Image.Quantize.MEDIANCUT).convert("RGBA")
    q_arr = np.array(rgb_img, dtype=np.uint8)
    q_arr[:, :, 3] = out_arr[:, :, 3]
    q_arr[~opaque, :3] = 0

    dst_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(q_arr, mode="RGBA").save(dst_path, format="PNG")
    print(f"OK {dst_path.name:26s} {size}x{size}  fill={np.mean(opaque) * 100:.1f}%")


def add_outline(img: Image.Image, outline_rgba: tuple[int, int, int, int]) -> Image.Image:
    arr = np.array(img, dtype=np.uint8)
    h, w, _ = arr.shape
    opaque = arr[:, :, 3] > 0
    out = arr.copy()
    for y in range(h):
        for x in range(w):
            if opaque[y, x]:
                continue
            has_neighbor = False
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx]:
                    has_neighbor = True
                    break
            if has_neighbor:
                out[y, x] = outline_rgba
    return Image.fromarray(out, mode="RGBA")


def build_procedural_islands() -> None:
    # 1. s-elements: Rock salt (halite) cubic crystal island
    s_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(s_img)
    # Underside rock salt base
    d.polygon([(5, 17), (26, 17), (21, 26), (11, 27)], fill=(186, 198, 214, 255))
    d.polygon([(8, 19), (24, 19), (20, 25), (12, 26)], fill=(148, 163, 184, 255))
    # Cubic halite crystal blocks on top
    cubes = [
        (6, 11, 13, 18, (241, 245, 249, 255), (203, 213, 225, 255), (255, 255, 255, 255)),
        (12, 7, 21, 17, (248, 250, 252, 255), (226, 232, 240, 255), (255, 255, 255, 255)),
        (19, 10, 26, 18, (226, 232, 240, 255), (186, 198, 214, 255), (248, 250, 252, 255)),
    ]
    for x0, y0, x1, y1, main_c, shade_c, hi_c in cubes:
        d.rectangle([x0, y0, x1, y1], fill=main_c)
        d.rectangle([x1 - 2, y0 + 1, x1, y1], fill=shade_c)
        d.rectangle([x0, y0, x1 - 1, y0 + 1], fill=hi_c)
    s_img = add_outline(s_img, (51, 65, 85, 255))
    s_img.save(OUT_DIR / "island-s.png", format="PNG")

    # 2. noble-gases: Dense fluffy atmospheric cloud (NOT an island)
    c_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    dc = ImageDraw.Draw(c_img)
    # Soft slate shadow underside
    dc.ellipse([4, 14, 27, 23], fill=(148, 163, 184, 255))
    # Fluffy white puffs
    dc.ellipse([5, 11, 15, 21], fill=(241, 245, 249, 255))
    dc.ellipse([10, 7, 22, 19], fill=(255, 255, 255, 255))
    dc.ellipse([17, 11, 27, 21], fill=(226, 232, 240, 255))
    dc.rectangle([7, 15, 25, 20], fill=(248, 250, 252, 255))
    dc.rectangle([8, 19, 24, 21], fill=(203, 213, 225, 255))
    c_img = add_outline(c_img, (71, 85, 105, 255))
    c_img.save(OUT_DIR / "island-noble-gases.png", format="PNG")

    # 3. d-elements: Leafless, angular, sharp steel tree on jagged metallic-rocky island
    d_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    dd = ImageDraw.Draw(d_img)
    # Dark jagged metallic-rocky base
    dd.polygon([(4, 20), (27, 20), (23, 25), (17, 28), (11, 27), (7, 24)], fill=(51, 65, 85, 255))
    dd.polygon([(7, 21), (24, 21), (20, 26), (12, 26)], fill=(30, 41, 59, 255))
    dd.polygon([(4, 20), (16, 18), (27, 20), (24, 21), (7, 21)], fill=(148, 163, 184, 255))
    dd.line([(6, 19), (15, 18), (25, 19)], fill=(226, 232, 240, 255), width=1)
    # Tapered faceted steel trunk
    dd.polygon([(14, 20), (17, 20), (16, 12), (15, 12)], fill=(100, 116, 139, 255))
    dd.line([(15, 12), (15, 20)], fill=(203, 213, 225, 255), width=1)
    # Sharp, leafless, angular steel branches
    dd.polygon([(15, 15), (15, 13), (7, 9), (4, 10), (9, 12)], fill=(100, 116, 139, 255))
    dd.line([(15, 14), (7, 9), (4, 10)], fill=(226, 232, 240, 255), width=1)
    dd.polygon([(15, 13), (14, 11), (9, 6), (7, 5), (11, 9)], fill=(148, 163, 184, 255))
    dd.line([(14, 11), (7, 5)], fill=(248, 250, 252, 255), width=1)
    # Central spire branch
    dd.polygon([(15, 12), (16, 12), (15, 4), (14, 2), (14, 7)], fill=(203, 213, 225, 255))
    dd.line([(14, 2), (15, 11)], fill=(248, 250, 252, 255), width=1)
    # Right angular branches
    dd.polygon([(16, 13), (17, 11), (20, 5), (21, 4), (18, 9)], fill=(148, 163, 184, 255))
    dd.line([(17, 11), (21, 4)], fill=(248, 250, 252, 255), width=1)
    dd.polygon([(16, 15), (17, 13), (24, 9), (27, 9), (22, 12)], fill=(100, 116, 139, 255))
    dd.line([(17, 13), (27, 9)], fill=(226, 232, 240, 255), width=1)
    dd.polygon([(16, 17), (17, 16), (22, 14), (24, 15), (20, 17)], fill=(100, 116, 139, 255))
    dd.line([(17, 16), (24, 15)], fill=(203, 213, 225, 255), width=1)
    d_img = add_outline(d_img, (15, 23, 42, 255))
    d_img.save(OUT_DIR / "island-d.png", format="PNG")

    # 4. platinum-noble: Irregular silvery metallic nugget (самородок серебристого цвета)
    p_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    dp = ImageDraw.Draw(p_img)
    # Asymmetric lumpy organic nugget silhouette
    dp.polygon(
        [(6, 16), (8, 11), (13, 8), (19, 9), (24, 12), (26, 17), (23, 22), (17, 25), (11, 24), (7, 21)],
        fill=(148, 163, 184, 255),
    )
    # Deep crevice shadow on lower/right underside
    dp.polygon(
        [(8, 20), (12, 24), (18, 24), (23, 21), (25, 17), (21, 19), (15, 21), (10, 20)],
        fill=(71, 85, 105, 255),
    )
    # Secondary metallic lobes and facets
    dp.polygon([(8, 15), (10, 10), (15, 9), (18, 12), (14, 16), (9, 17)], fill=(203, 213, 225, 255))
    dp.polygon([(16, 11), (21, 11), (24, 15), (20, 18), (15, 16)], fill=(203, 213, 225, 255))
    dp.polygon([(11, 17), (17, 16), (21, 19), (16, 22), (10, 20)], fill=(148, 163, 184, 255))
    # Specular brushed silver ridges
    dp.polygon([(10, 11), (14, 9), (17, 11), (13, 13)], fill=(241, 245, 249, 255))
    dp.line([(11, 10), (15, 10)], fill=(255, 255, 255, 255), width=1)
    dp.line([(18, 12), (22, 13)], fill=(241, 245, 249, 255), width=1)
    dp.line([(12, 16), (16, 16)], fill=(226, 232, 240, 255), width=1)
    # Subtle icy-blue platinum reflection pixels + tiny upper-ridge sparkle glint
    dp.point((18, 15), fill=(186, 230, 253, 255))
    dp.point((19, 16), fill=(186, 230, 253, 255))
    dp.point((13, 19), fill=(186, 230, 253, 255))
    dp.point((12, 11), fill=(255, 255, 255, 255))
    dp.point((11, 11), fill=(186, 230, 253, 255))
    dp.point((13, 11), fill=(186, 230, 253, 255))
    dp.point((12, 10), fill=(186, 230, 253, 255))
    dp.point((12, 12), fill=(186, 230, 253, 255))
    p_img = add_outline(p_img, (30, 41, 59, 255))
    p_img.save(OUT_DIR / "island-platinum-noble.png", format="PNG")

    # 5. f-elements: Dark basalt cliff with amber monazite veins & uraninite ore
    f_img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    df = ImageDraw.Draw(f_img)
    df.polygon([(4, 15), (27, 15), (22, 27), (9, 27)], fill=(41, 37, 36, 255))
    df.polygon([(7, 10), (15, 7), (25, 12), (27, 16), (4, 16)], fill=(68, 64, 60, 255))
    df.polygon([(12, 8), (19, 9), (22, 14), (10, 14)], fill=(87, 83, 78, 255))
    # Amber monazite veins & ore
    df.line([(10, 14), (14, 20), (13, 24)], fill=(245, 158, 11, 255), width=1)
    df.line([(19, 13), (21, 19)], fill=(251, 191, 36, 255), width=1)
    df.rectangle([15, 11, 17, 13], fill=(253, 224, 71, 255))
    # Uraninite / carnotite speck
    df.rectangle([20, 14, 22, 15], fill=(163, 230, 53, 255))
    f_img = add_outline(f_img, (12, 10, 9, 255))
    f_img.save(OUT_DIR / "island-f.png", format="PNG")

    for name in (
        "island-s.png",
        "island-noble-gases.png",
        "island-d.png",
        "island-platinum-noble.png",
        "island-f.png",
    ):
        arr = np.array(Image.open(OUT_DIR / name))
        print(f"OK {name:26s} 32x32  fill={np.mean(arr[:, :, 3] > 0) * 100:.1f}%")


def build_day_mountains() -> None:
    far_map = {
        (6, 19, 38): (110, 152, 204),
        (13, 37, 74): (138, 178, 224),
        (23, 63, 122): (168, 203, 240),
        (37, 99, 235): (194, 222, 248),
    }
    near_map = {
        (6, 19, 38): (51, 88, 136),
        (13, 37, 74): (74, 118, 170),
        (23, 63, 122): (102, 150, 202),
        (37, 99, 235): (140, 186, 232),
        (56, 189, 248): (224, 242, 254),
        (103, 232, 249): (255, 255, 255),
        (129, 140, 248): (210, 232, 252),
        (224, 242, 254): (255, 255, 255),
    }

    for src_name, dst_name, cmap in [
        ("mountains-far.png", "mountains-far-day.png", far_map),
        ("mountains-near.png", "mountains-near-day.png", near_map),
    ]:
        src_path = OUT_DIR / src_name
        dst_path = OUT_DIR / dst_name
        arr = np.array(Image.open(src_path).convert("RGBA"), dtype=np.uint8)
        out = arr.copy()
        keys = np.array(list(cmap.keys()), dtype=np.float32)
        vals = np.array(list(cmap.values()), dtype=np.uint8)
        opaque = arr[:, :, 3] > 0
        if np.any(opaque):
            pix = arr[opaque][:, :3].astype(np.float32)
            dists = np.linalg.norm(pix[:, None, :] - keys[None, :, :], axis=2)
            nearest = np.argmin(dists, axis=1)
            out[opaque, :3] = vals[nearest]
        Image.fromarray(out, mode="RGBA").save(dst_path, format="PNG")
        print(f"OK {dst_name:26s} {arr.shape[1]}x{arr.shape[0]}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--p-island", required=False, default=None, help="Path to generated green p-island image")
    args = parser.parse_args()

    if args.p_island:
        process_generated_island(Path(args.p_island), OUT_DIR / "island-p.png", size=32)
    build_procedural_islands()
    build_day_mountains()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
