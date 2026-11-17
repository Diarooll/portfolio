// Dados de contato e do site, num lugar só.
// O trecho de FastAPI que aparece no terminal do Contato é montado a partir daqui:
// para trocar um link, é só mudar o valor abaixo.

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
  email: "diego.aleola@gmail.com",
  linkedin: "https://www.linkedin.com/in/diego-olalla/",
  github: "https://github.com/Diarooll",
} as const;

/**
 * Trecho de FastAPI mostrado no terminal do Contato:
 *
 *   @app.get("/diego/contato")
 *   def mostrar_contatos():
 *       return {"GitHub": ..., "LinkedIn": ..., "Email": ...}
 */
export const contactSnippet = {
  route: "/diego/contato",
  fn: "mostrar_contatos",
  entries: [
    { key: "GitHub", value: site.github, href: site.github, external: true },
    { key: "LinkedIn", value: site.linkedin, href: site.linkedin, external: true },
    { key: "Email", value: site.email, href: `mailto:${site.email}`, external: false },
  ],
} as const;
