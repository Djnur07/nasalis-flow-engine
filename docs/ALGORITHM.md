# Nasalis Flow — Generative Art Source Code

This is the complete Node.js pipeline used to generate all 5,555 images and
their metadata for the **Nasalis Flow** collection: generative flow-line
portraits of the proboscis monkey (*Nasalis larvatus*).

No AI image generator is involved anywhere in this pipeline. Every pixel is
drawn by procedural code using [`node-canvas`](https://github.com/Automattic/node-canvas),
a server-side implementation of the HTML5 Canvas 2D API.

## Files

| File | Purpose |
|---|---|
| `generate.js` | Draws the PNG images and writes a draft (English) metadata file per token. |
| `build_metadata.js` | Re-derives every trait directly from each token's hash, and computes the final rarity rank/score across the whole collection. |
| `build_csv.js` | Converts the final metadata into a single CSV file formatted for OpenSea Studio's bulk upload (tokenID, name, description, file_name, hash, rank, and one column per trait, including a `Tier` category derived from rarity). |
| `generate_all.js` | Orchestrator — runs `generate.js` in batches for the full supply, then runs `build_metadata.js` and `build_csv.js` once at the end. |
| `package.json` | The only dependency is `canvas` (node-canvas). |

## Requirements

```bash
npm install
```

(Requires Node.js 18+ and the native build dependencies for `node-canvas`,
which are installed automatically via npm's prebuilt binaries on most
platforms.)

## Usage

**Generate everything at once** (this is what was used to build the real collection):

```bash
node src/generate_all.js ./output 5555 1600 480
```
Arguments: output folder, total supply, resolution in pixels, images per batch.

**Or generate a specific range manually:**

```bash
node src/generate.js ./output 1 100 1600
```
Arguments: output folder, first token ID, last token ID, resolution in pixels.

**Then rebuild metadata for the whole collection:**

```bash
node src/build_metadata.js ./output 5555
```

**Then generate the OpenSea upload CSV:**

```bash
node src/build_csv.js ./output 5555
```

## How the algorithm works

### 1. One hash = the entire "DNA" of a token

Each token ID gets a hash from:

```js
hash = sha256(RUN_SALT + ":" + tokenId)
```

That hash seeds a deterministic pseudo-random number generator (`sfc32`).
Every random decision from that point on — which palette, which flow style,
how large the nose is — comes from that single seeded stream. Re-running the
script with the same `RUN_SALT` and the same token ID always reproduces the
exact same image, byte for byte.

### 2. The hash decides the traits

A fixed sequence of calls to the seeded RNG picks, in order:

1. **Nose Class** — Small / Medium / Large / Giant, with Giant deliberately
   rare (~6%). Nose size is a real biological dominance marker in male
   proboscis monkeys, so this trait is grounded in the animal's actual biology.
2. **Palette** — 4 weighted color schemes (Copper Etching, Neon Rainforest,
   Sepia Ink, Midnight Blue Mist).
3. **Flow Style** — Tight Contour / Wavy / Turbulent (controls how tightly
   the lines hug the animal's silhouette vs. drift freely).
4. **Density** — Sparse / Medium / Dense (how many line-particles are drawn).
5. **Background** — Dark Void / Starry / Soft Mist.
6. **Guide Line** — whether a faint silhouette outline is drawn to help the
   shape stay readable.

Because the *order* in which these random numbers are consumed never
changes between `generate.js` and `build_metadata.js`, both scripts always
agree on which traits a given hash produces — that's what lets rarity be
recomputed later purely from the hashes, without re-rendering any images.

### 3. Drawing the silhouette mask

Before any line art is drawn, the animal's shape (ears, face, body, belly,
nose) is rendered once onto a small hidden canvas using simple shapes —
ellipses and quadratic Bézier curves. Each body part is filled with a
distinct grayscale value, turning that hidden canvas into a lookup table:
"what part of the monkey is at pixel (x, y)?"

That hidden canvas is then blurred slightly to produce a smooth scalar
field, which lets the next step compute a *gradient* (the direction that
points "further inside" the shape) at any point.

### 4. Thousands of particles flowing through the shape

This is the actual visual technique. Depending on the Density trait,
1,000–3,000+ particles are scattered inside the silhouette. Each particle
takes many small steps, and at every step its direction is a blend of:

- **Noise** — a smooth, non-repeating mathematical wave (built here as a sum
  of a few sine waves with random frequencies/phases) that gives the motion
  an organic, hand-drawn feel instead of straight lines.
- **Tangent to the shape's contour** — computed by rotating the gradient
  from step 3 by 90°, which makes particles curve *along* the silhouette's
  edge rather than cutting straight through it.

The `Flow Style` trait simply changes how much weight is given to each of
these two influences. Every step, the particle draws a short line segment
in the color assigned to whichever body part it's currently passing
through. Thousands of these overlapping strokes accumulate into the final
portrait — the image is literally built out of motion paths, not filled
regions.

### 5. Finishing touches

- A subtle grain (random per-pixel noise) is added for a printed/analog feel.
- A radial vignette darkens the corners.
- If the Guide Line trait rolled true, a faint stroke of the silhouette is
  drawn underneath the line art so the shape stays legible even on chaotic
  (Turbulent) renders.

### 6. Metadata & rarity

`build_metadata.js` never looks at the rendered pixels — it re-runs the
exact same trait-selection logic from each token's hash, so it always
matches the image. It then:

- Counts how often each trait value occurs across the whole supply.
- Computes a rarity score per token as `Σ (total / count)` over its six
  traits — the standard method used by most NFT rarity tools.
- Ranks every token from rarest (`rank 1`) to most common (`rank {total}`).

## Reproducibility

The `RUN_SALT` used for the actual Nasalis Flow collection was:

```
20c35e05aecdc47e
```

Re-running `generate.js` with this exact salt and any token ID between 1
and 5555 will reproduce that token's artwork exactly.
