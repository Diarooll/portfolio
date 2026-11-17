// Configuração da paisagem em camadas (2.5D) e da SUBIDA CONTÍNUA.
// Rolar a página = a câmera sobe: o morro com a árvore desce e sai de cena
// pelo Sobre, as nuvens ficam como camadas persistentes de fundo (mais densas
// no Sobre/Stack, só um mar de nuvens dourado em Projetos), e o fundo de cor
// segue UMA curva de altitude: dia → dourado → anoitecer → azul profundo → espaço.
// As camadas de foto têm o MESMO enquadramento (16:9): empilhadas, formam a cena.
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
  /** quanto a camada desce com a subida da câmera (1 = acompanha o chão; 0 = fica parada) */
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
  { id: "sky", src: "/landscape/sky.webp", width: W, height: H, z: -30, depth: 0, mouse: 6, opaque: true },
  { id: "far", src: "/landscape/far.webp", width: W, height: H, z: -28, depth: 0.82, mouse: 12 },
  // aqui, em z -24, fica o nome grande do hero (passa por trás do morro)
  { id: "front", src: "/landscape/front.webp", width: W, height: H, z: -20, depth: 0.92, mouse: 18 },
  { id: "grass", src: "/landscape/grass.webp", width: W, height: H, z: -18, depth: 1, mouse: 26 },
];

/** z-index das outras peças da cena, para manter a ordem num lugar só */
export const Z = {
  bg: -40, // gradiente de fundo (altitude)
  stars: -39, // estrelas do espaço
  sky: -30,
  clouds: -29, // nuvens persistentes
  far: -28,
  leavesBack: -26, // rajadas de vento atrás do morro
  heroName: -24,
  front: -20,
  grass: -18,
};

/** camadas de nuvem persistentes (a mesma foto, espelhada e em escalas/velocidades diferentes) */
export const CLOUD_LAYERS = [
  { scale: 1.1, mirror: true, bottom: 34, opacity: 0.7, speed: 22 },
  { scale: 1.45, mirror: false, bottom: 4, opacity: 0.92, speed: 40 },
  { scale: 1.95, mirror: true, bottom: -26, opacity: 1, speed: 68 },
  // camadas extras que só engrossam o céu de nuvens na faixa da Stack (somem suavemente fora dela)
  { scale: 1.25, mirror: false, bottom: 52, opacity: 0.75, speed: 30, dense: true },
  { scale: 1.7, mirror: true, bottom: 20, opacity: 0.85, speed: 52, dense: true },
] as { scale: number; mirror: boolean; bottom: number; opacity: number; speed: number; dense?: boolean }[];
export const CLOUD_SRC = "/landscape/cloud-bank.webp";

/** altitude de cada seção (0 = campo, 5 = espaço); o resto é interpolado entre elas */
export const ALTITUDE = { hero: 0, sobre: 1, stack: 2, projetos: 3, jornada: 4, contato: 5 } as const;

export interface CameraState {
  /** quanto o morro desceu, em vh (0 = cena inicial; passa de 1 = fora da tela) */
  hill: number;
  /** altitude contínua (0..5) */
  alt: number;
  /** opacidade da foto do céu */
  sky: number;
  /** peso de cada fundo por cima do céu: dourado, anoitecer, azul profundo, espaço */
  bg: [number, number, number, number];
  /** densidade das nuvens persistentes (0..1) e quanto estão douradas (0..1) */
  clouds: number;
  /** reforço de nuvens na faixa da Stack (0..1) */
  dense: number;
  gilt: number;
  /** estrelas (0..1) */
  stars: number;
}

/** sobe de 0 a 1 entre a e b (suave) */
const ramp = (v: number, a: number, b: number) => sstep(clamp((v - a) / (b - a)));

/**
 * Onde a câmera está para uma rolagem s. Tudo depende da altitude contínua, então
 * nada troca de repente: cada peso é uma rampa suave da altitude.
 */
export function cameraAt(s: number, M: Partial<Record<SectionId, Metrics>>, vh: number): CameraState {
  const top = (id: SectionId, f = 0) => (M[id] ? M[id]!.top + M[id]!.h * f : 0);
  const hero = M.hero;
  const heroEnd = hero ? hero.top + hero.h - vh : vh;
  // o morro sai para baixo enquanto o Sobre passa
  const hill = keyframes(
    [
      { y: 0, v: 0 },
      { y: heroEnd, v: 0.03 }, // só o que cabe na sobra da imagem: nunca aparece o fim da foto
      { y: top("sobre", 0.5), v: 1.3 },
    ],
    s,
  );
  // altitude: um valor por seção, interpolado
  const alt = keyframes(
    [
      { y: 0, v: ALTITUDE.hero },
      { y: heroEnd, v: 0.15 },
      { y: top("sobre", 0.5), v: ALTITUDE.sobre },
      { y: top("stack", 0.5), v: ALTITUDE.stack },
      // a luz dourada já está completa quando a intro de Projetos entra
      { y: top("projetos", 0) - 1.1 * vh, v: 2.1 },
      { y: top("projetos", 0), v: 2.95 },
      { y: top("projetos", 0.4), v: ALTITUDE.projetos },
      { y: top("jornada", 0.1), v: 3.5 },
      { y: top("jornada", 0.9), v: 4.4 },
      { y: top("contato", 0.35), v: ALTITUDE.contato },
    ],
    s,
    (t) => t, // linear entre as seções: a curva já é suave por ter muitas paradas
  );
  const clouds = ramp(alt, 0.2, 1.3) * (1 - 0.45 * ramp(alt, 2, 3)) * (1 - ramp(alt, 3.1, 3.8));
  return {
    hill,
    alt,
    sky: 1 - ramp(alt, 1.3, 2.1),
    bg: [ramp(alt, 2.15, 2.85), ramp(alt, 3.2, 3.9), ramp(alt, 3.8, 4.5), ramp(alt, 4.4, 5)],
    clouds,
    dense: ramp(alt, 1.2, 1.7) * (1 - ramp(alt, 2.0, 2.6)),
    gilt: ramp(alt, 2.2, 2.9),
    stars: ramp(alt, 4.2, 5),
  };
}
