# Nasalis Flow

**A 5,555-piece generative art collection — flow-field line portraits of the proboscis monkey (*Nasalis larvatus*, or *bekantan*), drawn entirely by code.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![Supply](https://img.shields.io/badge/supply-5%2C555-orange.svg)](#the-collection)

[Website](https://nasalisflow.xyz/) · [X / Twitter](https://x.com/NasalisFlow)

<p align="center">
  <img src="examples/teal.jpg" width="32%" />
  <img src="examples/copper.jpg" width="32%" />
  <img src="examples/sepia.jpg" width="32%" />
</p>

---

## What this is

Nasalis Flow is not made with an AI image generator. There is no diffusion
model, no neural network, and no text prompt anywhere in this pipeline.
Every one of the 5,555 images is produced by a deterministic procedural
algorithm: a single SHA-256 hash seeds a pseudo-random number generator,
which drives a **flow-field particle simulation** that "grows" thousands of
individual line strokes across a hidden silhouette mask of the animal.

Given the same salt and token ID, the algorithm always reproduces the exact
same image, byte for byte. Nothing is hand-drawn or touched up — what you
see is a direct, reproducible rendering of the token's hash.

This repository contains the **complete, real pipeline** used to generate
the actual collection — not a simplified demo. Anyone can clone it, run it,
and verify that a given token's artwork and traits match its hash.

## The collection

| | |
|---|---|
| **Supply** | 5,555 |
| **Resolution** | 1600×1600px |
| **Traits** | Nose Class, Palette, Flow Style, Density, Background, Guide Line |
| **Rarity** | Computed directly from trait rarity across the full supply — see [`docs/ALGORITHM.md`](docs/ALGORITHM.md#6-metadata--rarity) |
| **Technique** | Flow-field particle simulation over a silhouette mask, rendered with [`node-canvas`](https://github.com/Automattic/node-canvas) |

## Quick start

```bash
git clone https://github.com/<your-username>/nasalis-flow.git
cd nasalis-flow
npm install
```

Render a small test batch (tokens 1–10, 800px, fast):

```bash
node src/generate.js ./output 1 10 800
```

Render the entire collection exactly as it was originally produced:

```bash
node src/generate_all.js ./output 5555 1600 480
```

This runs `generate.js` in batches, then automatically rebuilds metadata
(`build_metadata.js`) and the OpenSea upload CSV (`build_csv.js`) once every
image exists on disk.

Output layout:

```
output/
├── images/
│   ├── Nasalis-1.png
│   └── ...
├── metadata/
│   ├── 1.json
│   └── ...
├── collection_metadata.json
├── rarity_summary.json
└── metadata-file-upload.csv
```

## Verifying a token

Because every trait is re-derived directly from the token's hash (never
stored or hand-edited), you can verify any token yourself:

```bash
RUN_SALT=20c35e05aecdc47e node src/generate.js ./verify 2401 2401 1600
```

This is the exact salt used for the real collection — running it for any
token ID between 1 and 5555 reproduces that token's artwork exactly.

## Project structure

```
nasalis-flow/
├── src/
│   ├── generate.js          # Core renderer: hash → traits → silhouette → flow field → PNG
│   ├── build_metadata.js    # Re-derives traits from hashes, computes rarity
│   ├── build_csv.js         # Builds the OpenSea Studio bulk-upload CSV
│   └── generate_all.js      # Orchestrates the full 1→5,555 pipeline
├── docs/
│   └── ALGORITHM.md         # Full technical write-up of the algorithm
├── examples/                # A few sample renders (used in this README)
├── package.json
└── LICENSE
```

## How it works (short version)

1. **Hash** — `sha256(RUN_SALT + ":" + tokenId)` gives every token a unique, reproducible identity.
2. **Seeded PRNG** — the hash seeds an `sfc32` generator; every random choice from here on is deterministic.
3. **Traits** — a fixed sequence of weighted random picks decides Nose Class, Palette, Flow Style, Density, Background, and Guide Line.
4. **Silhouette mask** — the animal's shape (face, nose, ears, body) is drawn once onto a hidden canvas and blurred into a smooth field.
5. **Flow-field simulation** — thousands of particles move through that field, blending noise-driven motion with the shape's contour tangent, each leaving a short colored stroke.
6. **Finishing** — grain and a vignette are added, and the image is exported as a 1600×1600px PNG.
7. **Metadata & rarity** — traits are independently re-derived from the hash (never hand-written) and ranked by rarity across the full supply.

For the full technical write-up — the exact math behind the flow field, how
rarity scoring works, and why the trait order matters — see
[`docs/ALGORITHM.md`](docs/ALGORITHM.md).

## License

The code in this repository is released under the [MIT License](LICENSE) —
use it, fork it, learn from it.

This does **not** extend to the generated Nasalis Flow artwork itself (the
5,555 rendered images and their metadata), which remain the property of
their respective token holders and the Nasalis Flow project.

## Links

- Website: [nasalisflow.xyz](https://nasalisflow.xyz)
- Live generative demo: available on the website's Traits page
