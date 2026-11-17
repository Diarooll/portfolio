// Textos da Stack em órbita (ficam aqui, junto dos dados da Stack).
import type { Localized } from "./types";

export const stackCopy: Record<"label", Localized> = {
  label: {
    pt: "Stack: as tecnologias giram juntas num círculo. Arraste ou use as setas para girar.",
    en: "Stack: the technologies spin together in a circle. Drag or use the arrow keys to rotate.",
  },
};

/**
 * Fundo da seção Stack: céu azul claro com bancos de nuvens em parallax
 * (a mesma foto de nuvens em camadas, com escala, espelho e velocidade diferentes).
 * Para trocar a foto, mude "clouds". "speed" é quanto a camada anda (em vh) ao
 * atravessar a seção; camadas mais rápidas parecem mais perto.
 */
export const STACK_BACKGROUND = {
  clouds: "/landscape/cloud-bank.webp",
  sky: ["#4f97d6", "#9fcbee", "#d9ecf8"] as const,
  layers: [
    { scale: 1.05, mirror: true, bottom: 36, opacity: 0.7, speed: 8 },
    { scale: 1.3, mirror: false, bottom: 4, opacity: 0.92, speed: 18 },
    { scale: 1.75, mirror: true, bottom: -26, opacity: 1, speed: 34 },
  ],
};
