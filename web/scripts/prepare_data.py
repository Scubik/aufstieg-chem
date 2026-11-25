#!/usr/bin/env python3
"""
Prepares static web assets from android/app/src/main/assets/cbyd.db for GitHub Pages:
  - web/public/data/pack_00.bin, pack_01.bin, ... (<= 45 MB each, blob-aligned for single HTTP Range requests)
  - web/public/data/catalog.json (compact catalog + chunk/offset/length index)
  - web/public/aufstieg_logo.png (copied from Android assets)

Run from repository root:
  python web/scripts/prepare_data.py
"""

import json
import os
import shutil
import sqlite3
from pathlib import Path

MAX_CHUNK_BYTES = 45 * 1024 * 1024  # 45 MB (well below GitHub's 50 MB warning / 100 MB hard limit)


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    db_path = repo_root / "android" / "app" / "src" / "main" / "assets" / "cbyd.db"
    logo_src = repo_root / "android" / "app" / "src" / "main" / "assets" / "aufstieg_logo.png"

    public_dir = repo_root / "web" / "public"
    data_dir = public_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    if not db_path.exists():
        raise FileNotFoundError(f"Database not found at {db_path}")

    # Copy logo for PDF footer & favicon/app icon
    if logo_src.exists():
        shutil.copy2(logo_src, public_dir / "aufstieg_logo.png")

    # Clean old pack files
    for old in data_dir.glob("pack_*.bin"):
        old.unlink()

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # Load all ok syntheses in deterministic order
    cur.execute(
        """
        SELECT c.path, c.full, c.name, c.author, c.year, c.drug, s.payload
        FROM catalog c
        LEFT JOIN syntheses s ON s.path = c.path AND s.status = 'ok'
        ORDER BY c.name COLLATE NOCASE ASC
        """
    )

    chunk_idx = 0
    chunk_offset = 0
    chunk_file = open(data_dir / f"pack_{chunk_idx:02d}.bin", "wb")
    chunk_sizes: list[int] = []

    catalog_entries = []
    total_blobs = 0
    total_bytes = 0

    try:
        for path, full, name, author, year, drug, payload in cur:
            if payload is not None:
                blob = bytes(payload)
                blen = len(blob)
                if chunk_offset > 0 and chunk_offset + blen > MAX_CHUNK_BYTES:
                    chunk_file.close()
                    chunk_sizes.append(chunk_offset)
                    chunk_idx += 1
                    chunk_offset = 0
                    chunk_file = open(data_dir / f"pack_{chunk_idx:02d}.bin", "wb")

                offset = chunk_offset
                chunk_file.write(blob)
                chunk_offset += blen
                total_blobs += 1
                total_bytes += blen

                entry = {
                    "p": path or "",
                    "f": full or "",
                    "n": name or "",
                    "a": author or "",
                    "y": year or "",
                    "d": drug or "",
                    "c": chunk_idx,
                    "o": offset,
                    "l": blen,
                }
            else:
                entry = {
                    "p": path or "",
                    "f": full or "",
                    "n": name or "",
                    "a": author or "",
                    "y": year or "",
                    "d": drug or "",
                    "c": -1,
                    "o": 0,
                    "l": 0,
                }
            catalog_entries.append(entry)
    finally:
        chunk_file.close()
        chunk_sizes.append(chunk_offset)
        conn.close()

    manifest = {
        "version": 1,
        "chunks": [f"pack_{i:02d}.bin" for i in range(len(chunk_sizes))],
        "chunkSizes": chunk_sizes,
        "items": catalog_entries,
    }

    catalog_path = data_dir / "catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, separators=(",", ":"))

    cat_kb = catalog_path.stat().st_size / 1024
    print(f"Exported {len(catalog_entries)} catalog items ({total_blobs} blobs, {total_bytes / (1024*1024):.1f} MB)")
    print(f"Created {len(chunk_sizes)} chunks in {data_dir}:")
    for i, sz in enumerate(chunk_sizes):
        print(f"  pack_{i:02d}.bin: {sz / (1024*1024):.2f} MB")
    print(f"catalog.json: {cat_kb:.1f} KB")


if __name__ == "__main__":
    main()
