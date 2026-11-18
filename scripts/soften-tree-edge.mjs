// Retoque do recorte da copa em public/landscape/front.webp.
// O matte original deixou a borda direita da copa como uma parede lisa (um corte reto).
// Aqui a borda dessa faixa ganha franja de folhas: um ruído de baixa e média frequência
// come a beira do alfa (só nessa região) e um desfoque mínimo suaviza o serrilhado.
// Uso: node scripts/soften-tree-edge.mjs [entrada] [saída]
import sharp from "sharp";

const src = process.argv[2] ?? "public/landscape/front.webp";
const out = process.argv[3] ?? src;
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

// pseudo-aleatório determinístico (o resultado é sempre o mesmo)
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const blur = async (buf, sigma) => {
  const o = await sharp(Buffer.from(buf), { raw: { width: w, height: h, channels: 1 } })
    .blur(sigma)
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (o.info.channels !== 1) throw new Error(`esperava 1 canal, veio ${o.info.channels}`);
  return Float32Array.from(o.data, (v) => v / 255);
};
const to8 = (f) => Uint8Array.from(f, (v) => Math.max(0, Math.min(255, Math.round(v * 255))));
const noise = async (sigma) => {
  const raw = new Uint8Array(w * h);
  for (let i = 0; i < raw.length; i++) raw[i] = Math.floor(rnd() * 256);
  const f = await blur(raw, sigma);
  let m = 0;
  for (const v of f) m += v;
  m /= f.length;
  let s = 0;
  for (const v of f) s += (v - m) * (v - m);
  s = Math.sqrt(s / f.length) || 1;
  return f.map((v) => (v - m) / s); // média 0, desvio 1
};

const A = new Float32Array(w * h);
for (let i = 0; i < w * h; i++) A[i] = data[i * 4 + 3] / 255;
const F = await blur(to8(A), 7); // 0.5 exatamente na beira, 1 bem por dentro
const n1 = await noise(2.2); // folhas pequenas
const n2 = await noise(6); // tufos maiores

// faixa onde a copa é lisa (coordenadas da imagem 1672x941), com borda suave
const box = (x, y) => {
  const fx = Math.min((x - 1290) / 50, (1450 - x) / 50);
  const fy = Math.min((y - 130) / 50, (520 - y) / 50);
  return Math.max(0, Math.min(1, Math.min(fx, fy)));
};

const A2 = new Float32Array(w * h);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const m = box(x, y);
    if (m === 0 || A[i] === 0) {
      A2[i] = A[i];
      continue;
    }
    const noisy = F[i] + (0.16 * n1[i] + 0.1 * n2[i]) * m - 0.1 * m;
    const k = Math.max(0, Math.min(1, (noisy - 0.5) / 0.12 + 0.5));
    A2[i] = A[i] * (m * k + (1 - m));
  }
}
const final = await blur(to8(A2), 0.7);
const buf = Buffer.alloc(w * h * 4);
for (let i = 0; i < w * h; i++) {
  buf[i * 4] = data[i * 4];
  buf[i * 4 + 1] = data[i * 4 + 1];
  buf[i * 4 + 2] = data[i * 4 + 2];
  buf[i * 4 + 3] = Math.round(final[i] * 255);
}
await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(out);
console.log(`ok: ${out}`);
