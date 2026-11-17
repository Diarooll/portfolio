import { defineRouting } from "next-intl/routing";

// pt é o padrão e fica na raiz ("/"); inglês em "/en".
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
  // o site é em português por padrão: "/" é sempre pt, mesmo com navegador em inglês
  localeDetection: false,
});
