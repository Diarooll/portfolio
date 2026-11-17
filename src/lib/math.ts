// Funções pequenas de interpolação usadas pela coreografia de rolagem.
// Todas são puras: recebem números e devolvem números.

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** acelera e desacelera (cúbica): bom para movimentos que começam e terminam parados */
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** só desacelera: bom para coisas que "chegam" */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** smoothstep: transição suave sem exagero */
export const sstep = (t: number) => t * t * (3 - 2 * t);

/** ruído determinístico 0..1: a mesma entrada dá sempre o mesmo valor (ordem "aleatória" estável) */
export const noise = (i: number, s: number) => {
  const x = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** gerador pseudoaleatório com semente (mulberry32) */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** progresso 0..1 de v entre a e b */
export const progress = (v: number, a: number, b: number) => clamp((v - a) / Math.max(1e-6, b - a));

/** interpola uma lista de quadros-chave {y, v} com suavização entre eles */
export function keyframes(list: { y: number; v: number }[], y: number, smooth = sstep) {
  if (!list.length) return 0;
  if (y <= list[0].y) return list[0].v;
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i];
    const b = list[i + 1];
    if (y < b.y) return lerp(a.v, b.v, smooth(progress(y, a.y, b.y)));
  }
  return list[list.length - 1].v;
}
