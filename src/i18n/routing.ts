import { defineRouting } from "next-intl/routing";

// inglês é o padrão e fica na raiz ("/"); português em "/pt".
export const routing = defineRouting({
  locales: ["en", "pt"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // o site é em inglês por padrão: "/" é sempre en, qualquer que seja o idioma do navegador
  localeDetection: false,
  // os hreflang já saem em generateMetadata (layout), com "pt-BR" e "x-default"; sem o cabeçalho Link duplicado
  alternateLinks: false,
});
