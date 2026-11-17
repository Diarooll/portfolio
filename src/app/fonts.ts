// Fontes servidas pelo próprio site (next/font): sem pedido extra ao Google
// e sem "pulo" de layout. Fraunces nos títulos, Schibsted Grotesk no texto,
// DM Mono nos rótulos. As outras três só desenham os logos dos projetos,
// por isso não são pré-carregadas.
import { Bodoni_Moda, DM_Mono, Fraunces, Outfit, Plus_Jakarta_Sans, Schibsted_Grotesk } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
export const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-schibsted",
  display: "swap",
});
export const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono", display: "swap" });
export const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-outfit", display: "swap", preload: false });
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-bodoni",
  display: "swap",
  preload: false,
});
export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-jakarta",
  display: "swap",
  preload: false,
});

export const fontVars = [fraunces, schibsted, dmMono, outfit, bodoni, jakarta].map((f) => f.variable).join(" ");
