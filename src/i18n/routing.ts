import { defineRouting } from "next-intl/routing";

// pt é o padrão e fica na raiz ("/"); inglês em "/en".
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
});
