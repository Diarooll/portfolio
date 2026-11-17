// Tipos dos dados de conteúdo. Textos que mudam com o idioma usam Localized.
export type Locale = "pt" | "en";
export type Localized = Record<Locale, string>;

export const pick = (l: Localized, locale: string): string => l[(locale as Locale) in l ? (locale as Locale) : "pt"];
