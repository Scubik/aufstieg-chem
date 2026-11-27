"""Export inorganic.db chains into static JSON files for the web app."""

from __future__ import annotations

import json
import re
import sqlite3
import sys
import zlib
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DB_PATH = ROOT_DIR / "inorganic.db"
OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "data" / "inorganic"
CHAINS_DIR = OUT_DIR / "chains"

ELEMENT_TO_GALAXY: dict[str, str] = {}

_GALAXY_GROUPS: dict[str, tuple[str, ...]] = {
    "s": ("Li", "Na", "K", "Rb", "Cs", "Be", "Mg", "Ca", "Sr", "Ba"),
    "p": (
        "B", "Al", "Ga", "In", "Tl",
        "C", "Si", "Ge", "Sn", "Pb",
        "N", "P", "As", "Sb", "Bi",
        "O", "S", "Se", "Te",
        "F", "Cl", "Br", "I",
    ),
    "noble-gases": ("Kr", "Xe"),
    "d": (
        "Sc", "Y", "Ti", "Zr", "Hf",
        "V", "Nb", "Ta", "Cr", "Mo", "W",
        "Mn", "Tc", "Re", "Fe", "Co", "Ni",
        "Cu", "Zn", "Cd", "Hg",
    ),
    "platinum-noble": ("Ru", "Rh", "Pd", "Os", "Ir", "Pt", "Ag", "Au"),
    "f": ("Ln", "Ac", "Th", "Pa", "U", "Np", "Pu", "Am"),
}

for _gid, _symbols in _GALAXY_GROUPS.items():
    for _sym in _symbols:
        ELEMENT_TO_GALAXY[_sym.lower()] = _gid

_XML_DECL_RE = re.compile(r"^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!DOCTYPE[^>]*>\s*)?", re.IGNORECASE)
_SVG_OPEN_RE = re.compile(r"<svg\b([^>]*)>", re.IGNORECASE)
_VIEWBOX_ATTR_RE = re.compile(r'viewBox\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
_OMEGA_PERCENT_SUFFIX_RE = re.compile(r"\s*(?:,\s*%|\(\s*%\s*\)|,\s*мас\.\s*%)\s*$", re.IGNORECASE)


def parse_viewbox(viewbox: str | None, svg: str) -> str:
    raw = (viewbox or "").strip()
    if not raw:
        m = _VIEWBOX_ATTR_RE.search(svg)
        if m:
            raw = m.group(1).strip()

    nums: list[float] = []
    if raw:
        for tok in re.split(r"[\s,]+", raw):
            if not tok:
                continue
            try:
                nums.append(float(tok))
            except ValueError:
                nums = []
                break

    if len(nums) == 4 and nums[2] > 0 and nums[3] > 0:
        return raw
    return "0 0 475 700"


def normalize_omega_label(omega_label: str | None, element: str | None) -> str:
    label = (omega_label or "").strip()
    if label:
        label = _OMEGA_PERCENT_SUFFIX_RE.sub("", label).strip()
    if not label:
        el = (element or "").strip()
        label = f"ω({el})" if el else "ω"
    return label


def clean_svg(svg: str, viewbox_str: str) -> str:
    cleaned = _XML_DECL_RE.sub("", svg or "").strip()
    open_tag = (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'viewBox="{viewbox_str}">'
    )
    if _SVG_OPEN_RE.search(cleaned):
        cleaned = _SVG_OPEN_RE.sub(open_tag, cleaned, count=1)
    else:
        cleaned = f"{open_tag}{cleaned}</svg>"
    return cleaned


def main() -> int:
    if not DB_PATH.is_file():
        print(f"ERROR: inorganic.db not found at {DB_PATH}", file=sys.stderr)
        return 1

    CHAINS_DIR.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    try:
        rows = conn.execute(
            """
            SELECT id, group_num, group_title, element, title, book_page, x_count,
                   viewbox, omega_label, notes, svg_zlib
            FROM chains
            ORDER BY sort_order ASC, id ASC
            """
        ).fetchall()

        index_items: list[dict[str, object]] = []
        total_bytes = 0

        for row in rows:
            element = (row["element"] or "").strip()
            galaxy_id = ELEMENT_TO_GALAXY.get(element.lower())
            if not galaxy_id:
                print(
                    f"ERROR: Element {element!r} (id={row['id']!r}) has no galaxy mapping",
                    file=sys.stderr,
                )
                return 1

            svg_raw = zlib.decompress(row["svg_zlib"]).decode("utf-8") if row["svg_zlib"] else ""
            viewbox_str = parse_viewbox(row["viewbox"], svg_raw)
            svg_clean = clean_svg(svg_raw, viewbox_str)
            omega_label = normalize_omega_label(row["omega_label"], element)

            comp_rows = conn.execute(
                """
                SELECT x_num, formula_html, formula_plain, color, omega, sources, trivial, boxes_json
                FROM compounds
                WHERE chain_id = ?
                ORDER BY x_num ASC
                """,
                (row["id"],),
            ).fetchall()

            compounds: dict[str, dict[str, object]] = {}
            for cr in comp_rows:
                boxes = json.loads(cr["boxes_json"]) if cr["boxes_json"] else []
                compounds[str(cr["x_num"])] = {
                    "formulaHtml": cr["formula_html"] or "",
                    "formulaPlain": cr["formula_plain"] or "",
                    "color": cr["color"] or "",
                    "omega": cr["omega"] or "",
                    "sources": cr["sources"] or "",
                    "trivial": cr["trivial"] or "",
                    "boxes": boxes,
                }

            index_items.append({
                "id": row["id"],
                "element": element,
                "title": row["title"],
                "groupNum": row["group_num"],
                "groupTitle": row["group_title"],
                "galaxyId": galaxy_id,
                "bookPage": row["book_page"],
                "xCount": row["x_count"],
            })

            detail_payload = {
                "id": row["id"],
                "element": element,
                "title": row["title"],
                "groupNum": row["group_num"],
                "groupTitle": row["group_title"],
                "galaxyId": galaxy_id,
                "bookPage": row["book_page"],
                "viewbox": viewbox_str,
                "omegaLabel": omega_label,
                "notes": row["notes"] or "",
                "svg": svg_clean,
                "compounds": compounds,
            }

            chain_file = CHAINS_DIR / f"{row['id']}.json"
            encoded = json.dumps(detail_payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            chain_file.write_bytes(encoded)
            total_bytes += len(encoded)

        index_file = OUT_DIR / "index.json"
        index_bytes = json.dumps(
            {"version": 1, "items": index_items},
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        index_file.write_bytes(index_bytes)
        total_bytes += len(index_bytes)

        print(f"Exported {len(index_items)} inorganic chains ({total_bytes / (1024 * 1024):.2f} MB total)")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
