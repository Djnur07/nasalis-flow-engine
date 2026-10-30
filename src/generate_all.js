// generate_all.js
// Orchestrates the full collection build: renders all 5,555 images in
// manageable batches, then rebuilds the final metadata (with English
// trait names and rarity ranks) once every image exists on disk.
//
// This is the exact pipeline used to produce the Nasalis Flow collection:
//   1. generate.js  -> draws the PNGs + writes raw (draft) per-token metadata
//   2. build_metadata.js -> re-derives every trait directly from each
//      token's hash, translates it to English, and computes rarity
//
// Usage:
//   node src/generate_all.js <output_dir> <total_supply> <resolution_px> [batch_size]
//
// Example (the exact numbers used for this collection):
//   node src/generate_all.js ./output 5555 1600 480

const { execFileSync } = require("child_process");
const path = require("path");

const OUT_DIR = process.argv[2] || "./output";
const TOTAL = parseInt(process.argv[3] || "5555", 10);
const RES = parseInt(process.argv[4] || "1600", 10);
const BATCH = parseInt(process.argv[5] || "480", 10);

// The salt is what makes every hash (and therefore every image)
// reproducible. Keep this identical across runs if you ever need to
// regenerate a specific token and get the exact same artwork back.
const RUN_SALT = process.env.RUN_SALT || require("crypto").randomBytes(8).toString("hex");

console.log(`Building ${TOTAL} tokens at ${RES}x${RES}px into "${OUT_DIR}"`);
console.log(`RUN_SALT = ${RUN_SALT}  (save this if you want reproducible re-renders)`);

let start = 1;
while (start <= TOTAL) {
  const end = Math.min(start + BATCH - 1, TOTAL);
  console.log(`\n=== Rendering tokens ${start}..${end} ===`);

  execFileSync(
    "node",
    [path.join(__dirname, "generate.js"), OUT_DIR, String(start), String(end), String(RES)],
    { stdio: "inherit", env: { ...process.env, RUN_SALT } }
  );

  start = end + 1;
}

console.log("\n=== All images rendered. Rebuilding final metadata (English + rarity) ===");
execFileSync(
  "node",
  [path.join(__dirname, "build_metadata.js"), OUT_DIR, String(TOTAL)],
  { stdio: "inherit", env: { ...process.env, RUN_SALT } }
);

console.log("\n=== Building OpenSea upload CSV ===");
execFileSync(
  "node",
  [path.join(__dirname, "build_csv.js"), OUT_DIR, String(TOTAL)],
  { stdio: "inherit", env: { ...process.env, RUN_SALT } }
);

console.log("\nDone. The collection is complete:");
console.log(`  Images:   ${OUT_DIR}/images/Nasalis-1.png ... Nasalis-${TOTAL}.png`);
console.log(`  Metadata: ${OUT_DIR}/metadata/1.json ... ${TOTAL}.json`);
console.log(`  Combined: ${OUT_DIR}/collection_metadata.json`);
console.log(`  Rarity:   ${OUT_DIR}/rarity_summary.json`);
console.log(`  CSV:      ${OUT_DIR}/metadata-file-upload.csv`);
