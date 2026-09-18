// build_csv.js
// Converts the final per-token metadata JSON files into a single CSV file
// formatted for OpenSea Studio's bulk metadata upload.
//
// Must be run AFTER build_metadata.js, since it reads the rarity data
// that script computes.
//
// Usage:
//   node build_csv.js <output_dir> <total_supply>
//
// Example:
//   node build_csv.js ./output 5555
//
// Produces:
//   <output_dir>/metadata-file-upload.csv

const fs = require("fs");
const path = require("path");

const OUT_DIR = process.argv[2] || "./output";
const TOTAL = parseInt(process.argv[3] || "5555", 10);

function tierName(rank, total) {
  const pct = rank / total;
  if (pct <= 0.01) return "Legendary";
  if (pct <= 0.05) return "Epic";
  if (pct <= 0.20) return "Rare";
  return "Common";
}

// Minimal CSV field escaping: wrap in quotes and double up any inner quotes
// whenever the value contains a comma, quote, or newline.
function csvField(value) {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const items = [];
for (let id = 1; id <= TOTAL; id++) {
  const meta = JSON.parse(fs.readFileSync(path.join(OUT_DIR, "metadata", `${id}.json`), "utf8"));
  items.push({ id, meta });
}

const traitTypes = items[0].meta.attributes.map((a) => a.trait_type);
const attrCols = traitTypes.map((t) => `attributes[${t}]`).concat(["attributes[Tier]"]);
const fieldnames = ["tokenID", "name", "description", "file_name", "external_url", "hash", "rank", ...attrCols];

const lines = [fieldnames.join(",")];

for (const { id, meta } of items) {
  const rank = meta.rarity.rank;
  const row = {
    tokenID: `Nasalis-${id}`,
    name: `Nasalis-${id}`,
    description: meta.description,
    file_name: meta.image,
    external_url: "",
    hash: meta.hash,
    rank: rank,
  };
  for (const a of meta.attributes) row[`attributes[${a.trait_type}]`] = a.value;
  row["attributes[Tier]"] = tierName(rank, TOTAL);

  lines.push(fieldnames.map((f) => csvField(row[f])).join(","));
}

const outPath = path.join(OUT_DIR, "metadata-file-upload.csv");
fs.writeFileSync(outPath, lines.join("\r\n"));
console.log(`Wrote ${items.length} rows to ${outPath}`);
