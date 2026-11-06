#!/usr/bin/env python3
"""Point the metadata at the JPGs: Nasalis-N.png -> Nasalis-N.jpg.

Reads the metadata folder (N.json, field "image") and the OpenSea CSV (column "file_name") and
writes copies with the extension changed. Every other value is left exactly as it was; the originals
are not touched.

    python3 tools/metadata_to_jpg.py ./output/metadata ./output/metadata-jpg \\
        --csv ./output/metadata-file-upload.csv ./output/metadata-file-upload-jpg.csv
"""
import argparse
import csv
import json
import os
import sys


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src_dir")
    ap.add_argument("dst_dir")
    ap.add_argument("--csv", nargs=2, metavar=("SRC", "DST"))
    ap.add_argument("--first", type=int, default=1)
    ap.add_argument("--last", type=int, default=5555)
    a = ap.parse_args()

    os.makedirs(a.dst_dir, exist_ok=True)
    for n in range(a.first, a.last + 1):
        raw = open(os.path.join(a.src_dir, f"{n}.json"), encoding="utf-8").read()
        old, new = f"Nasalis-{n}.png", f"Nasalis-{n}.jpg"
        data = json.loads(raw)
        if data.get("image") != old:
            sys.exit(f"{n}.json: image is {data.get('image')!r}, expected {old!r}")
        out = raw.replace(f'"image": "{old}"', f'"image": "{new}"', 1)
        if out == raw:
            sys.exit(f"{n}.json: could not find the image field to change")
        with open(os.path.join(a.dst_dir, f"{n}.json"), "w", encoding="utf-8", newline="") as f:
            f.write(out)
    print(f"wrote {a.last - a.first + 1} JSON files to {a.dst_dir}")

    if a.csv:
        src, dst = a.csv
        with open(src, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.reader(f))
        col = rows[0].index("file_name")
        for r in rows[1:]:
            if not r[col].lower().endswith(".png"):
                sys.exit(f"CSV: token {r[0]} file_name is {r[col]!r}, expected .png")
            r[col] = r[col][:-4] + ".jpg"
        with open(dst, "w", newline="", encoding="utf-8") as f:
            csv.writer(f, lineterminator="\r\n").writerows(rows)
        print(f"wrote {len(rows) - 1} CSV rows to {dst}")


if __name__ == "__main__":
    main()
