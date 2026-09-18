const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const OUT_DIR = process.argv[2] || "/home/claude/nft/output";
const TOTAL = parseInt(process.argv[3] || "5555", 10);

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function hashForToken(id, salt) {
  const h = crypto.createHash("sha256").update(salt + ":" + id).digest();
  let s = "oo";
  for (let i = 0; i < 49; i++) s += B58[h[i % h.length] % B58.length];
  return s;
}
function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11; c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}
function rngFromHash(hash) {
  const seeds = [0, 0, 0, 0];
  for (let i = 0; i < hash.length; i++) { const k = i % 4; seeds[k] = (seeds[k] * 31 + hash.charCodeAt(i)) | 0; }
  const r = sfc32(seeds[0] ^ 0x9e3779b9, seeds[1] ^ 0x85ebca6b, seeds[2] ^ 0xc2b2ae35, seeds[3] ^ 0x27d4eb2f);
  for (let i = 0; i < 20; i++) r();
  return r;
}
let R;
const rnd = (a = 1, b = 0) => b + R() * (a - b);
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const chance = (p) => R() < p;

// Urutan & bobot array HARUS identik dengan generate.js asli (yang dipakai merender gambar),
// hanya label yang diterjemahkan ke Inggris di sini.
const PALETTES = [
  { name: "Copper Etching", w: 3 },
  { name: "Neon Rainforest", w: 2 },
  { name: "Sepia Ink", w: 3 },
  { name: "Midnight Blue Mist", w: 2 },
];
function weighted(arr) { const pool = []; arr.forEach((x) => { for (let i = 0; i < x.w; i++) pool.push(x); }); return pick(pool); }

function buildFeatures() {
  const noseRoll = R();
  let noseClass, noseLen;
  if (noseRoll < 0.06) { noseClass = "Giant"; noseLen = rnd(1.5, 1.38); }
  else if (noseRoll < 0.28) { noseClass = "Large"; noseLen = rnd(1.36, 1.18); }
  else if (noseRoll < 0.72) { noseClass = "Medium"; noseLen = rnd(1.16, 0.98); }
  else { noseClass = "Small"; noseLen = rnd(0.96, 0.82); }

  const alurOpt = [
    { name: "Tight Contour", flow: 0.8, swirl: 1.2 },
    { name: "Wavy", flow: 0.48, swirl: 2.2 },
    { name: "Turbulent", flow: 0.18, swirl: 3.4 },
  ];
  const kepadatanOpt = [
    { name: "Sparse", n: 1100, w: 2 },
    { name: "Medium", n: 2000, w: 3 },
    { name: "Dense", n: 3200, w: 1 },
  ];

  return {
    palet: weighted(PALETTES),
    alur: pick(alurOpt),
    kepadatan: weighted(kepadatanOpt),
    nose: noseClass,
    noseLen,
    latar: pick(["Dark Void", "Starry", "Soft Mist"]),
    panduan: chance(0.5),
  };
}

const DESC_EN = ("Nasalis Flow is a collection of " + TOTAL.toLocaleString("en-US") + " generative portraits of the proboscis monkey " +
  "(Nasalis larvatus), a primate endemic to Borneo whose survival is increasingly threatened " +
  "by the loss of mangrove forest. Each piece is built not from flat color fields but from " +
  "thousands of flowing lines that follow a noise field while tracing the contours of its form. " +
  "The proboscis monkey's nose, a natural marker of dominance in males, becomes the collection's " +
  "core rarity trait: the larger it is, the rarer the piece.");

const salt = fs.readFileSync(path.join(OUT_DIR, "run_salt.txt"), "utf8").trim().split("=")[1];

// Pass 1: re-derive semua trait langsung dari hash (sumber kebenaran tunggal)
const all = [];
const counts = {};
for (let id = 1; id <= TOTAL; id++) {
  const hash = hashForToken(id, salt);
  R = rngFromHash(hash);
  const F = buildFeatures();
  const attrs = [
    { trait_type: "Palette", value: F.palet.name },
    { trait_type: "Flow Style", value: F.alur.name },
    { trait_type: "Density", value: F.kepadatan.name },
    { trait_type: "Nose Class", value: F.nose },
    { trait_type: "Background", value: F.latar },
    { trait_type: "Guide Line", value: F.panduan ? "Present" : "Absent" },
  ];
  attrs.forEach((a) => {
    const key = a.trait_type + ":" + a.value;
    counts[key] = (counts[key] || 0) + 1;
  });
  all.push({ id, hash, attrs });
}

// Pass 2: skor & rank rarity
const scored = all.map((t) => {
  let score = 0;
  t.attrs.forEach((a) => { score += TOTAL / counts[a.trait_type + ":" + a.value]; });
  return { ...t, score };
});
const ranked = [...scored].sort((a, b) => b.score - a.score);
const rankOf = {};
ranked.forEach((t, i) => { rankOf[t.id] = i + 1; });

// Tulis metadata per token + gabungan
const metaDir = path.join(OUT_DIR, "metadata");
fs.mkdirSync(metaDir, { recursive: true });
const items = [];
for (const t of scored) {
  const traitPct = {};
  t.attrs.forEach((a) => { traitPct[a.trait_type] = Math.round((counts[a.trait_type + ":" + a.value] / TOTAL) * 10000) / 100; });
  const meta = {
    name: `Nasalis Flow #${t.id}`,
    description: DESC_EN,
    image: `Nasalis-${t.id}.png`,
    hash: t.hash,
    collection: "Nasalis Flow",
    attributes: t.attrs,
    rarity: { rank: rankOf[t.id], score: Math.round(t.score * 1000) / 1000, trait_rarity_percent: traitPct },
  };
  fs.writeFileSync(path.join(metaDir, `${t.id}.json`), JSON.stringify(meta, null, 2));
  items.push(meta);
}
fs.writeFileSync(path.join(OUT_DIR, "collection_metadata.json"), JSON.stringify(items, null, 2));

const rarityReadable = {};
Object.entries(counts).forEach(([k, v]) => {
  rarityReadable[k] = { count: v, percent: Math.round((v / TOTAL) * 10000) / 100 };
});
fs.writeFileSync(path.join(OUT_DIR, "rarity_summary.json"), JSON.stringify(rarityReadable, null, 2));

fs.writeFileSync(path.join(OUT_DIR, "collection.json"), JSON.stringify({
  name: "Nasalis Flow",
  description: DESC_EN,
  total_supply: TOTAL,
  creator: "",
  category: "Generative Art",
  external_link: "",
}, null, 2));

console.log("Metadata complete for", TOTAL, "tokens.");
console.log("Example rank 1 (rarest):", ranked[0].id, "score", Math.round(ranked[0].score * 1000) / 1000);
