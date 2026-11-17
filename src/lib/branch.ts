// Forma do galho do Contato, num lugar só: o galho 3D, o desenho em SVG
// (sem WebGL) e o passarinho usam as mesmas funções, então o passarinho
// sempre pousa em cima do galho.
// x vai de 0 (esquerda) a 1 (direita) da faixa; y é fração da altura da faixa.
import { lerp } from "./math";

/** linha central do galho (fração da altura) */
export const branchY = (x: number) => 0.6 + 0.05 * Math.sin(x * 2.4 + 0.3) - 0.07 * x + 0.012 * Math.sin(x * 11);
/** raio do galho em px: mais grosso à direita, de onde ele "vem" */
export const branchR = (x: number, h: number) => lerp(0.02, 0.058, x) * h;
/** inclinação (dy/dx em px/px) num ponto, para o passarinho pular "morro acima" */
export const branchSlope = (x: number, w: number, h: number) => ((branchY(x + 0.002) - branchY(x - 0.002)) * h) / (0.004 * w);

/** galhinhos: posição no galho, comprimento (fração de h), ângulo (rad, 0 = direita) */
export const TWIGS = [
  { x: 0.12, len: 0.42, ang: 2.5 },
  { x: 0.27, len: 0.36, ang: -2.6 },
  { x: 0.41, len: 0.5, ang: 2.2 },
  { x: 0.55, len: 0.32, ang: -0.6 },
  { x: 0.79, len: 0.46, ang: 2.35 },
  { x: 0.9, len: 0.4, ang: -2.4 },
];

/** onde o passarinho pousa (fração da largura) */
export const birdX = (mobile: boolean) => (mobile ? 0.68 : 0.64);
