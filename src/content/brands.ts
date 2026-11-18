// Cores de marca de cada tecnologia (usadas nas peças da Stack).
// "split" diz como pintar logos de duas cores a partir de um SVG de uma cor só:
// - "diag": metade de cima/esquerda na 1ª cor, o resto na 2ª (as duas cobras do Python);
// - "top": parte de cima na 1ª cor (o vapor do Java), o resto na 2ª (a xícara).
import type { IconId } from "./techs";

export interface Brand {
  colors: [string] | [string, string];
  split?: "diag" | "top";
}

export const BRAND: Record<IconId, Brand> = {
  python: { colors: ["#3776AB", "#FFD43B"], split: "diag" },
  java: { colors: ["#E76F00", "#5382A1"], split: "top" },
  fastapi: { colors: ["#009688"] },
  django: { colors: ["#0C4B33"] },
  spring: { colors: ["#6DB33F"] },
  docker: { colors: ["#2496ED"] },
  githubactions: { colors: ["#2088FF"] },
  postgresql: { colors: ["#336791"] },
  git: { colors: ["#F05032"] },
  // o ">_" do Claude Code em âmbar, a mesma família de cor do sol no centro (não é o logo da Anthropic)
  claudecode: { colors: ["#E8A24A"] },
};

/** cor de fundo das faces escuras (ver StackOrbit) */
export const DARK_FACE = "#332c26";

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** face escura, a não ser que o logo suma nela (aí a face fica clara e neutra) */
export function faceTone(id: IconId): "dark" | "light" {
  return BRAND[id].colors.some((c) => contrast(c, DARK_FACE) >= 3) ? "dark" : "light";
}

function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

/** peça esmaltada na cor da marca: corpo e face coloridos, logo e nome em branco (ou quase preto, se a cor for clara) */
export interface Enamel {
  /** degradê da face (cima, baixo) */
  top: string;
  bottom: string;
  /** corpo e borda da peça (um tom mais fundo que a face) */
  body: string;
  ink: string;
  dim: string;
  /** cores do logo (1 ou 2, na ordem do BRAND) */
  logo: [string] | [string, string];
}

export function enamel(id: IconId): Enamel {
  const c = BRAND[id].colors[0];
  const ink = contrast(c, "#ffffff") >= 3 ? "#ffffff" : "#1d160f";
  return {
    top: mixHex(c, "#ffffff", 0.1),
    bottom: mixHex(c, "#000000", 0.14),
    body: mixHex(c, "#000000", 0.24),
    ink,
    dim: mixHex(ink, c, 0.3),
    // Python: a cobra de cima em branco e a de baixo no amarelo da marca; Java e o resto: logo de uma cor
    logo: BRAND[id].colors.length === 2 && BRAND[id].split === "diag" ? [ink, BRAND[id].colors[1]] : [ink],
  };
}
