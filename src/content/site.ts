// Dados de contato e do site, num lugar só.
// TODO(Diego): troque o e-mail e o link do LinkedIn pelos seus antes de publicar.

export const site = {
  name: "Diego Olalla",
  /**
   * Endereço final do site (SEO, sitemap e Open Graph).
   * Na Vercel vem sozinho de VERCEL_PROJECT_PRODUCTION_URL; dá para forçar com NEXT_PUBLIC_SITE_URL.
   * TODO(Diego): se tiver domínio próprio, defina NEXT_PUBLIC_SITE_URL.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  // TODO: coloque seu e-mail real
  email: "seu-email@exemplo.com",
  // TODO: coloque a URL do seu perfil no LinkedIn (o site antigo usava https://www.linkedin.com/in/diego-olalla/)
  linkedin: "#",
  github: "https://github.com/Diarooll",
  timeZone: "America/Sao_Paulo",
} as const;

/** o e-mail ainda é o de exemplo? (mostra um aviso só em desenvolvimento) */
export const isPlaceholderEmail = site.email === "seu-email@exemplo.com";
