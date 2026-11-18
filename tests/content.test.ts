// Integridade dos dados: se alguém mexer no conteúdo, estes testes avisam.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { techGroups, techs, iconSrc } from "@/content/techs";
import { projects } from "@/content/projects";
import { journey } from "@/content/journey";
import { site } from "@/content/site";
import { LAYERS, Z } from "@/lib/landscape";

const keys = (o: unknown, p = ""): string[] => (o && typeof o === "object" ? Object.entries(o).flatMap(([k, v]) => keys(v, p ? `${p}.${k}` : k)) : [p]);

describe("stack", () => {
  it("tem 10 tecnologias em 4 grupos", () => {
    expect(techs).toHaveLength(10);
    expect(techGroups.map((g) => g.id)).toEqual(["linguagens", "frameworks", "entrega", "ferramentas"]);
  });
  it("não repete tecnologia e todo ícone existe em public/", () => {
    expect(new Set(techs.map((t) => t.id)).size).toBe(techs.length);
    for (const t of techs) expect(existsSync(join(process.cwd(), "public", iconSrc(t.id)))).toBe(true);
  });
  it("Claude Code fica em Ferramentas, sem Redis na lista", () => {
    expect(techGroups[3].items.map((t) => t.name)).toContain("Claude Code");
    expect(techs.some((t) => /redis/i.test(t.name))).toBe(false);
  });
  it("cada tecnologia tem nota nos dois idiomas", () => {
    for (const t of techs) {
      expect(t.note.pt.length).toBeGreaterThan(0);
      expect(t.note.en.length).toBeGreaterThan(0);
    }
  });
});

describe("projetos", () => {
  it("seguem a ordem $ents → ALERA → Sito's", () => {
    expect(projects.map((p) => p.id)).toEqual(["sents", "alera", "sitos"]);
  });
  it("só o Sito's está online e usa as cores do site", () => {
    expect(projects.filter((p) => p.status === "online").map((p) => p.id)).toEqual(["sitos"]);
    expect(projects.find((p) => p.id === "sitos")?.brand).toBe("site");
  });
  it("links externos usam https", () => {
    for (const p of projects) for (const l of p.links) expect(l.href).toMatch(/^https:\/\//);
  });
});

describe("jornada", () => {
  it("termina no próximo passo e não fala de landing pages freelance", () => {
    expect(journey.at(-1)?.next).toBe(true);
    expect(journey.filter((j) => j.next)).toHaveLength(1);
    expect(journey.some((j) => /landing/i.test(j.title.pt + j.desc.pt))).toBe(false);
  });
});

describe("textos e configuração", () => {
  it("pt e en têm exatamente as mesmas chaves", () => {
    const pt = JSON.parse(readFileSync(join(process.cwd(), "messages/pt.json"), "utf8"));
    const en = JSON.parse(readFileSync(join(process.cwd(), "messages/en.json"), "utf8"));
    expect(keys(en).sort()).toEqual(keys(pt).sort());
  });
  it("o GitHub está certo e o e-mail fica num lugar só", () => {
    expect(site.github).toBe("https://github.com/Diarooll");
    expect(site.email).toContain("@");
  });
  it("as camadas da paisagem seguem a ordem sky → far → front → grass, com o nome entre far e front", () => {
    expect(LAYERS.map((l) => l.id)).toEqual(["sky", "far", "front", "grass"]);
    const z = Object.fromEntries(LAYERS.map((l) => [l.id, l.z]));
    expect(z.sky).toBeLessThan(z.far);
    expect(z.far).toBeLessThan(Z.heroName);
    expect(Z.heroName).toBeLessThan(z.front);
    expect(z.front).toBeLessThan(z.grass);
    for (const l of LAYERS) expect(existsSync(join(process.cwd(), "public", l.src))).toBe(true);
  });
});

describe("idiomas", () => {
  it("inglês é o padrão na raiz e o português vive em /pt", async () => {
    const { routing } = await import("@/i18n/routing");
    expect(routing.defaultLocale).toBe("en");
    expect(routing.locales).toEqual(["en", "pt"]);
    expect(routing.localePrefix).toBe("as-needed");
  });
  it("o trecho do Contato tem nomes nos dois idiomas", async () => {
    const { contactSnippet } = await import("@/content/site");
    expect(contactSnippet.route.en).toBe("/diego/contact");
    expect(contactSnippet.fn.en).toBe("show_contacts");
    expect(contactSnippet.fn.pt).toBe("mostrar_contatos");
  });
});
