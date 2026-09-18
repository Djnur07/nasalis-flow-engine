// Generator koleksi "Bekantan — Alur Generatif"
// Port dari artifact browser ke Node (node-canvas), untuk produksi batch.

const { createCanvas } = require("canvas");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const OUT_DIR = process.argv[2] || "/home/claude/nft/output";
const START = parseInt(process.argv[3] || "1", 10);
const END = parseInt(process.argv[4] || "3333", 10);
const S = parseInt(process.argv[5] || "900", 10); // resolusi output

const IMG_DIR = path.join(OUT_DIR, "images");
const META_DIR = path.join(OUT_DIR, "metadata");
fs.mkdirSync(IMG_DIR, { recursive: true });
fs.mkdirSync(META_DIR, { recursive: true });

/* ---------- Hash unik per token ---------- */
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function hashForToken(id) {
  // deterministik per id + garam acak sekali di awal proses supaya tiap run koleksi berbeda,
  // tapi ulang render token yang sama akan selalu sama hasilnya.
  const h = crypto.createHash("sha256").update(RUN_SALT + ":" + id).digest();
  let s = "oo";
  for (let i = 0; i < 49; i++) s += B58[h[i % h.length] % B58.length];
  return s;
}
const RUN_SALT = process.env.RUN_SALT || crypto.randomBytes(8).toString("hex");

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

/* ---------- Noise ---------- */
function makeNoise(K) {
  const terms = []; let wsum = 0;
  for (let i = 0; i < K; i++) {
    const amp = 1 / (i + 1);
    terms.push({ fx: rnd(0.006, 0.0012), fy: rnd(0.006, 0.0012), ph: rnd(Math.PI * 2), amp });
    wsum += amp;
  }
  return function (x, y) {
    let s = 0;
    for (const t of terms) s += t.amp * Math.sin(x * t.fx + y * t.fy + t.ph);
    return s / wsum;
  };
}

/* ---------- Palet ---------- */
const PALETTES = [
  { name: "Ukiran Tembaga", bgTop: "#120c08", bgBot: "#050403",
    lines: { ear: "#b5763a", wajah: "#d99a52", badan: "#8a5a2c", perut: "#e9c07f", hidung: "#f2a55c" },
    guide: "#e9c07f", blend: "source-over", alpha: 0.5, w: 3 },
  { name: "Neon Rimba", bgTop: "#040a08", bgBot: "#010403",
    lines: { ear: "#2fe0c0", wajah: "#6ff0e8", badan: "#1f9e88", perut: "#a8fff0", hidung: "#ff6fae" },
    guide: "#6ff0e8", blend: "lighter", alpha: 0.35, w: 2 },
  { name: "Tinta Sepia", bgTop: "#e8ddc2", bgBot: "#cdbd93",
    lines: { ear: "#5a3a20", wajah: "#3a2414", badan: "#6b4a2a", perut: "#8a6a3e", hidung: "#2a1808" },
    guide: "#2a1808", blend: "source-over", alpha: 0.4, w: 3 },
  { name: "Kabut Biru Malam", bgTop: "#0a1420", bgBot: "#04070c",
    lines: { ear: "#5b8bb0", wajah: "#a9c9de", badan: "#3c6485", perut: "#dbe9f2", hidung: "#f0c869" },
    guide: "#a9c9de", blend: "source-over", alpha: 0.42, w: 2 },
];
function weighted(arr) { const pool = []; arr.forEach((x) => { for (let i = 0; i < x.w; i++) pool.push(x); }); return pick(pool); }

/* ---------- Sifat karya ---------- */
function buildFeatures() {
  const noseRoll = R();
  let noseClass, noseLen;
  if (noseRoll < 0.06) { noseClass = "Raksasa"; noseLen = rnd(1.5, 1.38); }
  else if (noseRoll < 0.28) { noseClass = "Besar"; noseLen = rnd(1.36, 1.18); }
  else if (noseRoll < 0.72) { noseClass = "Sedang"; noseLen = rnd(1.16, 0.98); }
  else { noseClass = "Kecil"; noseLen = rnd(0.96, 0.82); }

  const alurOpt = [
    { name: "Kontur Ketat", flow: 0.8, swirl: 1.2 },
    { name: "Berombak", flow: 0.48, swirl: 2.2 },
    { name: "Turbulen", flow: 0.18, swirl: 3.4 },
  ];
  const kepadatanOpt = [
    { name: "Jarang", n: 1100, w: 2 },
    { name: "Sedang", n: 2000, w: 3 },
    { name: "Padat", n: 3200, w: 1 },
  ];

  return {
    palet: weighted(PALETTES),
    alur: pick(alurOpt),
    kepadatan: weighted(kepadatanOpt),
    nose: noseClass,
    noseLen,
    latar: pick(["Void Gelap", "Berbintang", "Kabut Halus"]),
    panduan: chance(0.5),
  };
}

/* ---------- Mask bentuk ---------- */
const M = 260;

function drawSilhouette(ctx2, size, noseLen, mode) {
  const t = (v) => size * v;
  ctx2.save();
  ctx2.translate(size / 2, size * 0.56);
  const setFill = (code) => { if (mode === "fill-region") ctx2.fillStyle = `rgb(${code},${code},${code})`; };

  setFill(45);
  for (const side of [-1, 1]) {
    ctx2.beginPath();
    ctx2.ellipse(side * t(0.245), -t(0.02), t(0.099), t(0.125), 0, 0, Math.PI * 2);
    if (mode === "fill-region") ctx2.fill(); else ctx2.stroke();
  }

  setFill(85);
  ctx2.beginPath();
  ctx2.ellipse(0, 0, t(0.27), t(0.30), 0, 0, Math.PI * 2);
  if (mode === "fill-region") ctx2.fill(); else ctx2.stroke();

  setFill(125);
  ctx2.beginPath();
  ctx2.ellipse(0, t(0.11), t(0.235), t(0.235), 0, 0, Math.PI * 2);
  if (mode === "fill-region") ctx2.fill(); else ctx2.stroke();

  setFill(165);
  ctx2.beginPath();
  ctx2.ellipse(0, t(0.20), t(0.15), t(0.13), 0, 0, Math.PI * 2);
  if (mode === "fill-region") ctx2.fill(); else ctx2.stroke();

  const baseY = -t(0.02), w = t(0.10), len = t(0.30) * noseLen;
  setFill(210);
  ctx2.beginPath();
  ctx2.moveTo(-w * 0.9, baseY - t(0.02));
  ctx2.quadraticCurveTo(-w * 0.2, baseY + len * 0.35, -w * 0.55, baseY + len * 0.62);
  ctx2.quadraticCurveTo(-w * 0.2, baseY + len * 0.92, 0, baseY + len);
  ctx2.quadraticCurveTo(w * 0.2, baseY + len * 0.92, w * 0.55, baseY + len * 0.62);
  ctx2.quadraticCurveTo(w * 0.2, baseY + len * 0.35, w * 0.9, baseY - t(0.02));
  ctx2.quadraticCurveTo(0, baseY - t(0.075), -w * 0.9, baseY - t(0.02));
  ctx2.closePath();
  if (mode === "fill-region") ctx2.fill(); else ctx2.stroke();

  ctx2.restore();
}

function boxBlurPass(src, w, h) {
  const tmp = new Float32Array(w * h), dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, cnt = 0;
      for (let dx = -2; dx <= 2; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; sum += src[y * w + xx]; cnt++; }
      tmp[y * w + x] = sum / cnt;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, cnt = 0;
      for (let dy = -2; dy <= 2; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; sum += tmp[yy * w + x]; cnt++; }
      dst[y * w + x] = sum / cnt;
    }
  }
  return dst;
}

function buildMask(F, maskCanvas, mctx) {
  mctx.fillStyle = "rgb(0,0,0)";
  mctx.fillRect(0, 0, M, M);
  drawSilhouette(mctx, M, F.noseLen, "fill-region");

  const img = mctx.getImageData(0, 0, M, M).data;
  const regionGrid = new Uint8Array(M * M);
  let field = new Float32Array(M * M);
  for (let i = 0; i < M * M; i++) {
    const v = img[i * 4];
    let rid;
    if (v < 20) rid = 0; else if (v < 65) rid = 1; else if (v < 105) rid = 2;
    else if (v < 145) rid = 3; else if (v < 190) rid = 4; else rid = 5;
    regionGrid[i] = rid;
    field[i] = rid > 0 ? 1 : 0;
  }
  field = boxBlurPass(field, M, M);
  field = boxBlurPass(field, M, M);
  field = boxBlurPass(field, M, M);
  return { regionGrid, field };
}

function regionAt(grid, x, y, k) {
  const mx = Math.min(M - 1, Math.max(0, Math.round(x * k)));
  const my = Math.min(M - 1, Math.max(0, Math.round(y * k)));
  return grid[my * M + mx];
}
function gradAt(field, x, y, k) {
  const mx = Math.min(M - 2, Math.max(1, Math.round(x * k)));
  const my = Math.min(M - 2, Math.max(1, Math.round(y * k)));
  const fL = field[my * M + (mx - 1)], fR = field[my * M + (mx + 1)];
  const fU = field[(my - 1) * M + mx], fD = field[(my + 1) * M + mx];
  return { gx: fR - fL, gy: fD - fU };
}

function colorFor(rid, F) {
  const map = { 1: "ear", 2: "wajah", 3: "badan", 4: "perut", 5: "hidung" };
  return F.palet.lines[map[rid]] || F.palet.lines.wajah;
}

function drawBackground(ctx, size, F) {
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, F.palet.bgTop); g.addColorStop(1, F.palet.bgBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);

  if (F.latar === "Berbintang") {
    ctx.fillStyle = F.palet.guide;
    for (let i = 0; i < 140; i++) {
      ctx.globalAlpha = rnd(0.5, 0.05);
      ctx.beginPath(); ctx.arc(rnd(size), rnd(size * 0.7), rnd(1.6, 0.3), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (F.latar === "Kabut Halus") {
    const g2 = ctx.createRadialGradient(size * 0.5, size * 0.7, size * 0.1, size * 0.5, size * 0.7, size * 0.7);
    g2.addColorStop(0, "rgba(255,255,255,0.10)");
    g2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g2; ctx.fillRect(0, 0, size, size);
  }
}

function drawGuide(ctx, size, F) {
  ctx.save();
  ctx.strokeStyle = F.palet.guide;
  ctx.globalAlpha = 0.13;
  ctx.lineWidth = size * 0.0028;
  drawSilhouette(ctx, size, F.noseLen, "stroke-guide");
  ctx.restore();
  ctx.globalAlpha = 1;
}

function simulate(ctx, size, F, mask) {
  const k = M / size;
  const { regionGrid, field } = mask;
  const noiseA = makeNoise(5), noiseB = makeNoise(5);
  const N = F.kepadatan.n;
  const flowWeight = F.alur.flow;
  const swirl = F.alur.swirl;

  function findStart() {
    for (let tries = 0; tries < 40; tries++) {
      const x = size * 0.5 + rnd(size * 0.36, -size * 0.36);
      const y = size * 0.56 + rnd(size * 0.34, -size * 0.30);
      const rid = regionAt(regionGrid, x, y, k);
      if (rid > 0) return { x, y, rid };
    }
    return { x: size * 0.5, y: size * 0.56, rid: 2 };
  }

  for (let i = 0; i < N; i++) {
    let { x, y, rid } = findStart();
    const baseColor = colorFor(rid, F);
    const steps = Math.floor(rnd(140, 60));
    let outside = 0;
    let vx = Math.cos(rnd(Math.PI * 2)), vy = Math.sin(rnd(Math.PI * 2));

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let s = 0; s < steps; s++) {
      const na = Math.atan2(noiseB(x, y), noiseA(x, y)) * swirl * 0.5;
      const { gx, gy } = gradAt(field, x, y, k);
      const tlen = Math.hypot(gx, gy) || 1;
      const tx = -gy / tlen, ty = gx / tlen;

      let dx = Math.cos(na) * (1 - flowWeight) + tx * flowWeight;
      let dy = Math.sin(na) * (1 - flowWeight) + ty * flowWeight;

      const curRid = regionAt(regionGrid, x, y, k);
      if (curRid === 0) {
        outside++;
        dx += gx * 0.9; dy += gy * 0.9;
        if (outside > 4) break;
      }

      vx = vx * 0.55 + dx * 0.45; vy = vy * 0.55 + dy * 0.45;
      const vlen = Math.hypot(vx, vy) || 1;
      vx /= vlen; vy /= vlen;

      x += vx * (size * 0.0022); y += vy * (size * 0.0022);
      ctx.lineTo(x, y);
    }

    ctx.globalCompositeOperation = F.palet.blend;
    ctx.strokeStyle = baseColor;
    ctx.globalAlpha = F.palet.alpha;
    ctx.lineWidth = rnd(1.6, 0.6);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
}

function vignetteGrain(ctx, size) {
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.26, size / 2, size / 2, size * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (R() - 0.5) * 8;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/* ---------- Render satu token ---------- */
const maskCanvas = createCanvas(M, M);
const mctx = maskCanvas.getContext("2d");
const canvas = createCanvas(S, S);
const ctx = canvas.getContext("2d");

function renderToken(id) {
  const hash = hashForToken(id);
  R = rngFromHash(hash);
  const F = buildFeatures();

  ctx.clearRect(0, 0, S, S);
  drawBackground(ctx, S, F);
  if (F.panduan) drawGuide(ctx, S, F);
  const mask = buildMask(F, maskCanvas, mctx);
  simulate(ctx, S, F, mask);
  vignetteGrain(ctx, S);

  const filename = `Nasalis-${id}.png`;
  fs.writeFileSync(path.join(IMG_DIR, filename), canvas.toBuffer("image/png"));

  const attributes = [
    { trait_type: "Palet", value: F.palet.name },
    { trait_type: "Gaya Alur", value: F.alur.name },
    { trait_type: "Kepadatan", value: F.kepadatan.name },
    { trait_type: "Kelas Hidung", value: F.nose },
    { trait_type: "Latar", value: F.latar },
    { trait_type: "Garis Panduan", value: F.panduan ? "Ada" : "Tidak" },
  ];
  const meta = {
    name: `Bekantan #${id}`,
    description: "Potret bekantan dari alur generatif — bagian dari koleksi Bekantan Alur Generatif.",
    image: filename,
    hash,
    attributes,
  };
  fs.writeFileSync(path.join(META_DIR, `${id}.json`), JSON.stringify(meta, null, 2));
  return attributes;
}

/* ---------- Loop utama ---------- */
console.log(`RUN_SALT=${RUN_SALT}`);
console.log(`Rendering token ${START}..${END} at ${S}x${S} resolution -> ${OUT_DIR}`);
const t0 = Date.now();
const rarityCount = {};

for (let id = START; id <= END; id++) {
  const attrs = renderToken(id);
  attrs.forEach((a) => {
    const key = `${a.trait_type}:${a.value}`;
    rarityCount[key] = (rarityCount[key] || 0) + 1;
  });
  if (id % 50 === 0 || id === END) {
    const elapsed = (Date.now() - t0) / 1000;
    const rate = (id - START + 1) / elapsed;
    const remain = (END - id) / rate;
    console.log(`[${id}/${END}] ${elapsed.toFixed(1)}s elapsed, ~${rate.toFixed(2)} img/s, ~${remain.toFixed(0)}s remaining`);
  }
}

fs.writeFileSync(path.join(OUT_DIR, "rarity_summary.json"), JSON.stringify(rarityCount, null, 2));
console.log("Done.");
