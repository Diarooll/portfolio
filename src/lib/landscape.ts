// Configuração da paisagem em camadas (2.5D).
// As camadas são fotos recortadas com o MESMO enquadramento (16:9): empilhadas
// na mesma posição, elas formam a cena inteira. Cada uma anda numa velocidade
// diferente com a rolagem e com o cursor, e é isso que dá profundidade.
//
// Para trocar uma foto: substitua o arquivo em public/landscape/ (mesmo nome)
// e, se precisar, ajuste depth/mouse/fit abaixo. Veja o README.

import { clamp, keyframes, sstep } from "./math";
import type { Metrics, SectionId } from "./scroll-engine";

export type LayerId = "sky" | "far" | "front" | "grass";

export interface LandscapeLayer {
  id: LayerId;
  /** arquivo em /public */
  src: string;
  /** largura/altura do arquivo (todas as camadas usam o mesmo quadro) */
  width: number;
  height: number;
  /** z-index: negativo fica atrás do conteúdo. O nome do hero fica entre far e front. */
  z: number;
  /** velocidade vertical na "descida" da câmera (1 = acompanha o chão) */
  depth: number;
  /** paralaxe com o cursor, em px */
  mouse: number;
  /** a foto é opaca? (o céu é; as outras têm transparência) */
  opaque?: boolean;
}

/** enquadramento: cobre a tela como object-fit: cover, ancorado embaixo e à direita (a árvore fica visível no celular) */
export const FRAME = {
  /** posição do object-position (x, y) */
  position: "70% 100%",
  /** sobra em volta da tela, para a paralaxe nunca mostrar a borda (0.05 = 5% de cada lado ≈ 110%) */
  bleed: 0.05,
};

const W = 1672;
const H = 941;

export const LAYERS: LandscapeLayer[] = [
  { id: "sky", src: "/landscape/sky.webp", width: W, height: H, z: -30, depth: 0.15, mouse: 6, opaque: true },
  { id: "far", src: "/landscape/far.webp", width: W, height: H, z: -28, depth: 0.45, mouse: 10 },
  // aqui, em z -24, fica o nome grande do hero (passa por trás do morro)
  { id: "front", src: "/landscape/front.webp", width: W, height: H, z: -20, depth: 0.92, mouse: 18 },
  { id: "grass", src: "/landscape/grass.webp", width: W, height: H, z: -18, depth: 1, mouse: 26 },
];

/** z-index das outras peças da cena, para manter a ordem num lugar só */
export const Z = {
  bg: -40, // gradiente de fundo (céu → nuvem → dourado → anoitecer)
  sky: -30,
  drift: -29, // nuvens passando sobre o céu
  far: -28,
  leavesBack: -26, // folhas que somem atrás do morro
  heroName: -24,
  front: -20,
  grass: -18,
  ground: -18, // continuação verde e terra, presa embaixo da grama
  tint: -16, // luz do fim de tarde sobre a paisagem
};

/** chão abaixo da foto: verde que continua a grama e depois a terra (onde ficam as raízes) */
export const GROUND = {
  /** altura do verde antes da terra, em vh */
  greenVh: 30,
  grassTop: "#5E9E2F",
  grassDeep: "#3F7322",
  soilTop: "#6B4A2F",
  soilDeep: "#3B2819",
};

/** momentos em que uma nuvem cobre a tela (o centro, em px de rolagem) */
export function cloudCenters(M: Partial<Record<SectionId, Metrics>>, vh: number) {
  const out: number[] = [];
  if (M.stack) out.push(M.stack.top - 0.5 * vh);
  if (M.jornada) out.push(M.jornada.top - 0.2 * vh);
  return out;
}
/** quanto de rolagem uma travessia de nuvem dura (em vh) */
export const CLOUD_SPAN = 1.5;

export interface CameraState {
  /** descida da câmera em vh (positivo: as camadas sobem, vemos mais o chão) */
  y: number;
  /** opacidade da foto do céu (some depois da Sobre, e o gradiente de fundo aparece) */
  sky: number;
  /** pesos da luz: dourado e anoitecer (0..1) */
  gold: number;
  dusk: number;
  /** peso de cada fundo do gradiente (céu, nuvem, dourado, anoitecer) */
  bg: [number, number, number, number];
}

/**
 * Onde a câmera está para uma rolagem s.
 * stackDescent: descida (em vh) que põe a borda grama/terra no chão da árvore da Stack.
 */
export function cameraAt(s: number, M: Partial<Record<SectionId, Metrics>>, vh: number, stackDescent: number): CameraState {
  const g = (id: SectionId) => M[id]?.top ?? 0;
  const hero = M.hero;
  const heroEnd = hero ? hero.top + hero.h - vh : vh;
  const [cA, cB] = cloudCenters(M, vh);
  const a = cA ?? g("stack");
  const b = cB ?? g("jornada");
  // a câmera troca de lugar enquanto a nuvem cobre a tela (entre ±0,2 vh do centro)
  const y = keyframes(
    [
      { y: 0, v: 0 },
      { y: heroEnd, v: 0.14 }, // o morro sobe e esconde o pé das letras
      { y: a - 0.22 * vh, v: 0.2 },
      { y: a + 0.02 * vh, v: stackDescent },
      { y: g("projetos") + 0.2 * vh, v: stackDescent },
      { y: g("projetos") + 0.9 * vh, v: 0 }, // atrás dos painéis, volta ao campo
      { y: b - 0.15 * vh, v: 0 },
      { y: b + 0.02 * vh, v: -1.15 }, // escondida embaixo da tela
      { y: g("contato") - 0.9 * vh, v: -1.15 },
      { y: g("contato") + 0.35 * vh, v: -0.32 }, // no Contato o morro e a árvore voltam, ao anoitecer
      // no fim da página o morro sobe até cobrir o pé do nome gigante
      { y: M.fim ? M.fim.top + M.fim.h - vh : g("contato") + 2 * vh, v: 0.06 },
    ],
    s,
  );
  const sky = 1 - sstep(clamp((s - (a - 0.2 * vh)) / (0.3 * vh)));
  const gold = sstep(clamp((s - (g("projetos") - 0.2 * vh)) / (1.2 * vh)));
  const dusk = sstep(clamp((s - (g("contato") - 1.2 * vh)) / (1.1 * vh)));
  // fundo: céu → nuvem (Stack) → dourado (Projetos/Jornada) → anoitecer (Contato)
  const wCloud = sstep(clamp((s - (a - 0.2 * vh)) / (0.3 * vh)));
  const wGold = gold;
  const wDusk = dusk;
  return { y, sky, gold, dusk, bg: [1, wCloud, wGold, wDusk] };
}
