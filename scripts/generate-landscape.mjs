// Gera as texturas procedurais da paisagem em public/landscape/.
// - Por padrão: só as nuvens da transição (cloud-a.webp e cloud-b.webp).
// - Com --placeholders: também as camadas PROVISÓRIAS (sky/far/front/grass),
//   úteis se as fotos de verdade sumirem. Elas usam os mesmos nomes das fotos.
// Nunca sobrescreve um arquivo que já existe, a não ser com --force
// (assim as fotos do cliente não são apagadas por engano).
// Uso: node scripts/generate-landscape.mjs [--placeholders] [--force]
// Desenha em SVG (formas procedurais) e converte para WebP com o sharp.
import { existsSync, mkdirSync } from "node:fs";

const PLACEHOLDERS = process.argv.includes("--placeholders");
const FORCE = process.argv.includes("--force");
import sharp from "sharp";

const OUT = new URL("../public/landscape/", import.meta.url);
mkdirSync(OUT, { recursive: true });

// PRNG determinístico: a mesma semente gera sempre a mesma paisagem.
const rng = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const f = (n) => n.toFixed(1);

// ruído 1D suave (value noise) com algumas oitavas
function fbm(r) {
  const N = 256;
  const v = Array.from({ length: N + 1 }, r);
  const n1 = (x) => {
    const i = Math.floor(x) % N;
    const t = x - Math.floor(x);
    const s = t * t * (3 - 2 * t);
    return v[i] * (1 - s) + v[i + 1] * s;
  };
  return (x) => n1(x) * 0.55 + n1(x * 2.1 + 3.7) * 0.28 + n1(x * 4.3 + 9.1) * 0.17;
}

// nuvem fofa: sombra azulada embaixo, corpo branco e brilho em cima
function cloud(r, cx, cy, w, h, blur = 10) {
  const puffs = [];
  const n = Math.round(6 + w / 60);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const bump = Math.sin(Math.PI * t);
    const rad = h * (0.28 + 0.42 * bump) * (0.75 + r() * 0.5);
    puffs.push([cx - w / 2 + t * w, cy - bump * h * 0.25 - r() * h * 0.15, rad]);
  }
  const circles = (dx, dy, k, fill) =>
    puffs.map(([x, y, rad]) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${f(rad * k)}" fill="${fill}"/>`).join("");
  return `<g filter="url(#fluff)" data-b="${blur}">
    ${circles(0, h * 0.14, 1, "#C7D8E6")}
    ${circles(0, 0, 0.97, "#F7FAFC")}
    ${circles(-h * 0.06, -h * 0.08, 0.62, "#FFFFFF")}
    <rect x="${f(cx - w / 2)}" y="${f(cy)}" width="${f(w)}" height="${f(h * 0.3)}" rx="${f(h * 0.15)}" fill="#E4EDF4"/>
  </g>`;
}

const blurDefs = [6, 10, 16, 24]
  .map((b) => `<filter id="b${b}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${b}"/></filter>`)
  .join("") +
  // "fluff": deforma as bordas com ruído para a nuvem parecer volumosa, não um monte de círculos
  `<filter id="fluff" x="-20%" y="-30%" width="140%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" seed="3"/><feDisplacementMap in="SourceGraphic" scale="70" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="5"/></filter>` +
  `<filter id="leafy" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="8"/><feDisplacementMap in="SourceGraphic" scale="22" xChannelSelector="R" yChannelSelector="G"/></filter>`;

function ridgePath(W, H, base, amp, scale, seed) {
  const n = fbm(rng(seed));
  let d = `M0 ${H} L0 ${f(base(0) - amp * n(0))}`;
  for (let x = 0; x <= W; x += 12) d += ` L${x} ${f(base(x) - amp * n(x / scale))}`;
  return { d: d + ` L${W} ${H} Z`, y: (x) => base(x) - amp * n(x / scale) };
}

// árvore folhosa: tronco, galhos e copa de círculos com luz vindo da esquerda
function leafyTree(r, x, groundY, size) {
  const trunkH = size * 0.55;
  const tw = size * 0.11;
  const top = groundY - trunkH;
  let s = `<path d="M${f(x - tw)} ${f(groundY + 6)} C ${f(x - tw * 0.7)} ${f(groundY - trunkH * 0.4)}, ${f(x - tw * 0.45)} ${f(top + trunkH * 0.2)}, ${f(x - tw * 0.3)} ${f(top)} L ${f(x + tw * 0.3)} ${f(top)} C ${f(x + tw * 0.45)} ${f(top + trunkH * 0.2)}, ${f(x + tw * 0.7)} ${f(groundY - trunkH * 0.4)}, ${f(x + tw)} ${f(groundY + 6)} Z" fill="#5B3F2A"/>`;
  // galhos principais
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42 + (r() - 0.5) * 0.2;
    const len = size * (0.32 + r() * 0.18);
    const sx = x + (r() - 0.5) * tw * 0.4;
    const sy = top + trunkH * (0.05 + r() * 0.25);
    s += `<path d="M${f(sx)} ${f(sy)} Q ${f(sx + Math.cos(a) * len * 0.5)} ${f(sy + Math.sin(a) * len * 0.4)} ${f(sx + Math.cos(a) * len)} ${f(sy + Math.sin(a) * len)}" stroke="#5B3F2A" stroke-width="${f(tw * 0.34)}" stroke-linecap="round" fill="none"/>`;
  }
  const cy = top - size * 0.12;
  const rx = size * 0.62;
  const ry = size * 0.42;
  const layers = [
    ["#3F6B2E", 70, 0.15, 0.06],
    ["#4F7F36", 70, 0.12, 0],
    ["#679A43", 60, 0.09, -0.06],
    ["#86B556", 40, 0.06, -0.12],
    ["#A6CB6E", 26, 0.035, -0.17],
  ];
  layers.forEach(([fill, n, rk, off], li) => {
    s += `<g filter="url(#leafy)">`;
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      const px = x + Math.cos(a) * rx * d * (1 - li * 0.12) + off * size * 1.4;
      const py = cy + Math.sin(a) * ry * d * (1 - li * 0.1) + off * size;
      s += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(size * rk * (0.7 + r() * 0.6))}" fill="${fill}"/>`;
    }
    s += "</g>";
  });
  return s;
}

async function save(name, W, H, body, { opaque = false, quality = 82 } = {}) {
  const file = new URL(name, OUT).pathname;
  if (existsSync(file) && !FORCE) {
    console.log("mantido (já existe):", name);
    return;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${blurDefs}
  <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FA6E6"/><stop offset="0.55" stop-color="#9BD0F2"/><stop offset="1" stop-color="#E2F1FA"/></linearGradient>
  <linearGradient id="hillG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC05A"/><stop offset="0.45" stop-color="#6FA444"/><stop offset="1" stop-color="#4A7E30"/></linearGradient>
  <linearGradient id="farG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DC3B6"/><stop offset="1" stop-color="#86B48F"/></linearGradient>
  <linearGradient id="far2G" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9D5D8"/><stop offset="1" stop-color="#A3C6BC"/></linearGradient>
  <linearGradient id="grassG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6E9F3F"/><stop offset="1" stop-color="#3D6A26"/></linearGradient>
  <radialGradient id="sunG" cx="0.18" cy="0.12" r="0.6"><stop offset="0" stop-color="#FFF6D6" stop-opacity="0.9"/><stop offset="1" stop-color="#FFF6D6" stop-opacity="0"/></radialGradient>
  </defs>${body}</svg>`;
  let img = sharp(Buffer.from(svg));
  if (opaque) img = img.flatten({ background: "#E2F1FA" });
  await img.webp({ quality, alphaQuality: 90, effort: 5 }).toFile(file);
  console.log("ok", name);
}

// ---------- sky.webp: céu azul com nuvens fofas (opaco) ----------
if (PLACEHOLDERS) {
  const r = rng(7);
  const W = 2400;
  const H = 1350;
  let body = `<rect width="${W}" height="${H}" fill="url(#skyG)"/><rect width="${W}" height="${H}" fill="url(#sunG)"/>`;
  const spots = [
    [380, 260, 520, 150], [1180, 180, 380, 110], [1900, 330, 640, 170],
    [760, 520, 420, 120], [1560, 620, 360, 100], [220, 760, 300, 90], [2160, 820, 340, 95],
  ];
  spots.forEach(([x, y, w, h]) => (body += cloud(r, x, y, w, h, 10)));
  await save("sky.webp", W, H, body, { opaque: true });
}

// ---------- far.webp: morros distantes com mata, enevoados ----------
if (PLACEHOLDERS) {
  const W = 3000;
  const H = 700;
  const a = ridgePath(W, H, () => 330, 160, 420, 3);
  const b = ridgePath(W, H, (x) => 430 + Math.sin(x / 700) * 30, 140, 300, 5);
  let body = `<path d="${a.d}" fill="url(#far2G)"/>`;
  // borda de mata: bolinhas da mesma cor ao longo da crista
  const r = rng(9);
  const bumps = (ridge, fill, rmin, rmax) => {
    let s = "";
    for (let x = 0; x < W; x += 10 + r() * 14) s += `<circle cx="${f(x)}" cy="${f(ridge.y(x) + 6)}" r="${f(rmin + r() * (rmax - rmin))}" fill="${fill}"/>`;
    return s;
  };
  body += bumps(a, "#B3D1D3", 8, 16);
  body += `<path d="${b.d}" fill="url(#farG)"/>` + bumps(b, "#93BDA6", 10, 22);
  await save("far.webp", W, H, body);
}

// ---------- front.webp: morro ensolarado com a grande árvore à direita ----------
if (PLACEHOLDERS) {
  const W = 3000;
  const H = 1300;
  const r = rng(21);
  // o morro sobe para a direita, onde fica a árvore
  const hill = ridgePath(W, H, (x) => 960 - 200 * Math.pow(Math.max(0, (x - 900) / 2100), 1.2) + 20 * Math.sin(x / 260), 40, 500, 13);
  const tx = 2280;
  const gy = hill.y(tx);
  let body = leafyTree(r, tx, gy + 8, 640);
  body += `<path d="${hill.d}" fill="url(#hillG)"/>`;
  // luz do sol na crista e tufos de grama na borda
  body += `<path d="${hill.d}" fill="none" stroke="#B4D87A" stroke-width="10" opacity="0.6" filter="url(#b6)"/>`;
  for (let x = 0; x < W; x += 7 + r() * 9) {
    const y = hill.y(x) + 4;
    const h = 14 + r() * 26;
    const lean = (r() - 0.4) * 10;
    body += `<path d="M${f(x - 3)} ${f(y)} L${f(x + lean)} ${f(y - h)} L${f(x + 3)} ${f(y)} Z" fill="${r() < 0.5 ? "#7DB04C" : "#6A9C3F"}"/>`;
  }
  // florzinhas espalhadas
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    const y = hill.y(x) + 30 + r() * (H - hill.y(x) - 40);
    body += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2 + r() * 3)}" fill="${["#F6EFC9", "#F2D35B", "#F1B9B0"][Math.floor(r() * 3)]}" opacity="0.85"/>`;
  }
  // sombra da árvore no chão
  body += `<ellipse cx="${tx + 60}" cy="${f(gy + 30)}" rx="420" ry="40" fill="#3E6A27" opacity="0.35" filter="url(#b16)"/>`;
  await save("front.webp", W, H, body);
}

// ---------- grass.webp: faixa de capim alto na frente (opcional) ----------
if (PLACEHOLDERS) {
  const W = 3000;
  const H = 360;
  const r = rng(33);
  let body = "";
  for (let i = 0; i < 900; i++) {
    const x = r() * W;
    const h = 60 + r() * 220;
    const w = 4 + r() * 7;
    const lean = (r() - 0.5) * 70;
    const c = ["#4E8233", "#5E9240", "#3F6E2A", "#76A84B", "#8DBA5A"][Math.floor(r() * 5)];
    body += `<path d="M${f(x - w)} ${H} Q ${f(x + lean * 0.3)} ${f(H - h * 0.6)} ${f(x + lean)} ${f(H - h)} Q ${f(x + lean * 0.2 + w * 0.4)} ${f(H - h * 0.55)} ${f(x + w)} ${H} Z" fill="${c}"/>`;
  }
  body += `<rect y="${H - 40}" width="${W}" height="40" fill="#3D6A26"/>`;
  await save("grass.webp", W, H, body);
}

// ---------- nuvens da transição entre seções (bordas fofas de um banco de nuvens) ----------
for (const [name, seed, tint] of [
  ["cloud-a.webp", 41, "#F4F8FB"],
  ["cloud-b.webp", 57, "#FFFFFF"],
]) {
  const W = 2400;
  const H = 700;
  const r = rng(seed);
  // embaixo é sólido; em cima, rolos de nuvem com sombra azulada
  let body = `<g filter="url(#fluff)">`;
  for (let x = -100; x < W + 100; x += 90 + r() * 90) {
    const rad = 110 + r() * 150;
    const y = 300 + r() * 140;
    body += `<circle cx="${f(x)}" cy="${f(y + rad * 0.18)}" r="${f(rad)}" fill="#CBD9E5"/>`;
  }
  body += `</g><g filter="url(#fluff)">`;
  for (let x = -100; x < W + 100; x += 45 + r() * 60) {
    const rad = 60 + r() * 150;
    const y = 300 + r() * 140;
    body += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${tint}"/><circle cx="${f(x - rad * 0.2)}" cy="${f(y - rad * 0.25)}" r="${f(rad * 0.55)}" fill="#FFFFFF"/>`;
  }
  body += `<rect x="-50" y="470" width="${W + 100}" height="300" fill="${tint}"/></g>`;
  await save(name, W, H, body, { quality: 70 });
}
