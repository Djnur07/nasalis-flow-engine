#!/usr/bin/env python3
"""Convert the Nasalis Flow PNGs (Nasalis-1.png ... Nasalis-5555.png) to JPG.

This is the exact conversion used for the OpenSea drop: JPG quality 98, 4:4:4 colour
(no chroma subsampling), optimised encoding, same 1600 x 1600 size. Nothing is redrawn; each
JPG is made from its own original PNG. The PNGs are never modified.

    python3 convert-to-jpg/convert_to_jpg.py ./output/images ./output/images-jpg

Safe to stop and run again: finished files are skipped, and each file is written under a
temporary name first, so an interrupted run never leaves a half-written JPG.
"""
import argparse
import os
import sys
from multiprocessing import Pool

from PIL import Image

QUALITY = 98


def convert_one(job):
    n, src_dir, dst_dir, quality = job
    out = os.path.join(dst_dir, f"Nasalis-{n}.jpg")
    if os.path.exists(out) and os.path.getsize(out) > 0:
        return n, "skipped", None
    tmp = out + ".part"
    try:
        im = Image.open(os.path.join(src_dir, f"Nasalis-{n}.png"))
        if im.mode == "RGBA" and im.getchannel("A").getextrema()[0] < 255:
            return n, "error", "has transparent pixels; JPG cannot keep them"
        im = im.convert("RGB")
        im.save(tmp, "JPEG", quality=quality, subsampling=0, optimize=True)
        os.replace(tmp, out)
        return n, "converted", None
    except Exception as exc:  # report and keep going
        if os.path.exists(tmp):
            os.remove(tmp)
        return n, "error", f"{type(exc).__name__}: {exc}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src_dir", help="folder with Nasalis-N.png")
    ap.add_argument("dst_dir", help="folder for Nasalis-N.jpg (created if missing)")
    ap.add_argument("--first", type=int, default=1)
    ap.add_argument("--last", type=int, default=5555)
    ap.add_argument("--quality", type=int, default=QUALITY)
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    a = ap.parse_args()

    os.makedirs(a.dst_dir, exist_ok=True)
    jobs = [(n, a.src_dir, a.dst_dir, a.quality) for n in range(a.first, a.last + 1)]
    counts = {"converted": 0, "skipped": 0, "error": 0}
    with Pool(a.workers) as pool:
        for i, (n, status, msg) in enumerate(pool.imap_unordered(convert_one, jobs), 1):
            counts[status] += 1
            if status == "error":
                print(f"#{n}: {msg}", file=sys.stderr)
            if i % 250 == 0:
                print(f"{i}/{len(jobs)}", flush=True)
    print(f"done: {counts['converted']} converted, {counts['skipped']} already done, {counts['error']} errors")
    return 1 if counts["error"] else 0


if __name__ == "__main__":
    sys.exit(main())
