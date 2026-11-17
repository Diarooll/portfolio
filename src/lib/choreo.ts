// Pedaços da coreografia usados por mais de um componente.
import { clamp, sstep } from "./math";

/** progresso do hero (0..1) para uma rolagem y */
export const heroProgress = (y: number, heroH: number, vh: number) => clamp(y / Math.max(1, heroH - vh));

/** quanto o nome já "virou" a marca da barra (0..1) */
export function brandSwap(hp: number, reduced: boolean) {
  if (reduced) return sstep(clamp((hp - 0.4) / 0.3));
  const t = clamp((hp - 0.03) / 0.85);
  return clamp((t - 0.9) / 0.1);
}

/** onde cada capítulo começa, para a barra marcar o link certo */
export const NAV_IDS = ["sobre", "stack", "projetos", "jornada", "contato"] as const;
export type NavId = (typeof NAV_IDS)[number];
