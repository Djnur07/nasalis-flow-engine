#!/usr/bin/env python3
"""Check the JPGs made by convert_to_jpg.py against their original PNGs, file by file.

For every token it checks that the JPG exists and opens, is 1600 x 1600 RGB, and compares it with
the PNG pixel by pixel (mean difference, largest difference, PSNR). Differences are on a 0-255 scale.

    python3 convert-to-jpg/verify_jpg.py ./output/images ./output/images-jpg
"""
import argparse
import os
import statistics
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image


def check_one(job):
    n, src_dir, dst_dir = job
    r = {"n": n}
    png = os.path.join(src_dir, f"Nasalis-{n}.png")
    jpg = os.path.join(dst_dir, f"Nasalis-{n}.jpg")
    try:
        if not os.path.exists(jpg):
            r["err"] = "jpg missing"
            return r
        r["bytes"] = os.path.getsize(jpg)
        with Image.open(jpg) as im:
            im.verify()
        a = Image.open(png)
        alpha_min = a.getchannel("A").getextrema()[0] if a.mode == "RGBA" else 255
        a = a.convert("RGB")
        b = Image.open(jpg)
        b.load()
        if b.size != a.size or b.mode != "RGB":
            r["err"] = f"size/mode differs: {b.size} {b.mode} vs {a.size}"
            return r
        if alpha_min < 255:
            r["err"] = "png has transparent pixels"
            return r
        d = np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16))
        mse = float((d.astype(np.float64) ** 2).mean())
        r["mean"] = float(d.mean())
        r["max"] = int(d.max())
        r["psnr"] = 10 * np.log10(255 ** 2 / mse) if mse > 0 else 99.0
    except Exception as exc:
        r["err"] = f"{type(exc).__name__}: {exc}"
    return r


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src_dir")
    ap.add_argument("dst_dir")
    ap.add_argument("--first", type=int, default=1)
    ap.add_argument("--last", type=int, default=5555)
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    a = ap.parse_args()

    jobs = [(n, a.src_dir, a.dst_dir) for n in range(a.first, a.last + 1)]
    with Pool(a.workers) as pool:
        rs = pool.map(check_one, jobs, chunksize=8)
    bad = [r for r in rs if "err" in r]
    ok = [r for r in rs if "err" not in r]
    print(f"checked {len(rs)} files: {len(ok)} ok, {len(bad)} with problems")
    for r in bad[:20]:
        print(f"  #{r['n']}: {r['err']}")
    if ok:
        means = [r["mean"] for r in ok]
        print(f"mean difference per pixel: {min(means):.2f} to {max(means):.2f} (median {statistics.median(means):.2f}) of 255")
        print(f"largest difference on any pixel: {max(r['max'] for r in ok)} of 255")
        print(f"PSNR: {min(r['psnr'] for r in ok):.1f} to {max(r['psnr'] for r in ok):.1f} dB")
        total = sum(r["bytes"] for r in ok)
        print(f"total JPG size: {total / 1e9:.2f} GB ({total / 2**30:.2f} GiB)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
