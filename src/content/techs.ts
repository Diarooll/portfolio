// Stack: 10 tecnologias em 4 grupos. A ordem aqui é a ordem na árvore.
import type { Localized } from "./types";

export type IconId = "python" | "java" | "fastapi" | "django" | "spring" | "docker" | "githubactions" | "postgresql" | "git" | "claudecode";

export interface Tech {
  id: IconId;
  name: string;
  /** rótulo técnico curto, em mono (ex.: "lang · python") */
  ref: string;
  /** o que é / para que uso */
  note: Localized;
}

export interface TechGroup {
  id: string;
  ref: string;
  name: Localized;
  items: Tech[];
}

export const techGroups: TechGroup[] = [
  {
    id: "linguagens",
    ref: "grp · linguagens",
    name: { pt: "Linguagens", en: "Languages" },
    items: [
      { id: "python", name: "Python", ref: "lang · python", note: { pt: "linguagem principal", en: "main language" } },
      { id: "java", name: "Java", ref: "lang · java", note: { pt: "base de orientação a objetos", en: "my object-oriented foundation" } },
    ],
  },
  {
    id: "frameworks",
    ref: "grp · frameworks",
    name: { pt: "Frameworks", en: "Frameworks" },
    items: [
      { id: "fastapi", name: "FastAPI", ref: "svc · fastapi", note: { pt: "APIs rápidas e tipadas", en: "fast, typed APIs" } },
      { id: "django", name: "Django", ref: "svc · django", note: { pt: "web completo com ORM e admin", en: "full web stack with ORM and admin" } },
      { id: "spring", name: "Spring Boot", ref: "svc · spring-boot", note: { pt: "APIs REST em Java", en: "REST APIs in Java" } },
    ],
  },
  {
    id: "entrega",
    ref: "grp · entrega",
    name: { pt: "Entrega", en: "Delivery" },
    items: [
      { id: "docker", name: "Docker", ref: "ops · docker", note: { pt: "containers e compose", en: "containers and compose" } },
      { id: "githubactions", name: "GitHub Actions", ref: "ci · github-actions", note: { pt: "CI/CD a cada push", en: "CI/CD on every push" } },
      { id: "postgresql", name: "PostgreSQL", ref: "db · postgresql", note: { pt: "banco relacional", en: "relational database" } },
    ],
  },
  {
    id: "ferramentas",
    ref: "grp · ferramentas",
    name: { pt: "Ferramentas", en: "Tools" },
    items: [
      { id: "git", name: "Git", ref: "vcs · git", note: { pt: "versionamento", en: "version control" } },
      // Claude Code usa um glifo ">_" próprio, não o logo da Anthropic
      {
        id: "claudecode",
        name: "Claude Code",
        ref: "ai · claude-code",
        note: { pt: "assistente de código com IA no terminal", en: "AI coding assistant in the terminal" },
      },
    ],
  },
];

/** todas as tecnologias, na ordem da árvore */
export const techs: Tech[] = techGroups.flatMap((g) => g.items);

export const iconSrc = (id: IconId) => `/icons/${id}.svg`;
