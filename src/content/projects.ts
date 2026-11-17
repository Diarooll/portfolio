// Projetos, na ordem dos painéis: $ents → ALERA → Sito's.
import type { Localized } from "./types";

export type ProjectStatus = "online" | "wip";

export interface Project {
  id: "sents" | "alera" | "sitos";
  name: string;
  /** rótulo do canto do painel */
  kicker: Localized;
  status: ProjectStatus;
  statusLabel: Localized;
  desc: Localized;
  spec: { k: Localized; v: Localized }[];
  stack: string[];
  links: { label: Localized; href: string }[];
  /** cores da marca (iguais nos dois temas) ou "site" para a paleta da página */
  brand: "sents" | "alera" | "site";
}

const same = (s: string): Localized => ({ pt: s, en: s });

export const projects: Project[] = [
  {
    id: "sents",
    name: "$ents",
    kicker: { pt: "projeto pessoal · django + fastapi", en: "personal project · django + fastapi" },
    status: "wip",
    statusLabel: { pt: "EM ANDAMENTO", en: "IN PROGRESS" },
    desc: {
      pt: "App de gestão financeira. A diferença: mostra quanto do seu salário já está comprometido com assinaturas e parcelas.",
      en: "A personal finance app. The twist: it shows how much of your salary is already committed to subscriptions and installments.",
    },
    spec: [
      { k: { pt: "TIPO", en: "TYPE" }, v: { pt: "Gestão financeira", en: "Personal finance" } },
      { k: { pt: "SISTEMA", en: "SYSTEM" }, v: same("Django") },
      { k: { pt: "APIS", en: "APIS" }, v: same("FastAPI") },
    ],
    stack: ["django", "fastapi"],
    links: [],
    brand: "sents",
  },
  {
    id: "alera",
    name: "ALERA",
    kicker: { pt: "FIAP · Challenge 2026 · projeto da faculdade", en: "FIAP · Challenge 2026 · university project" },
    status: "wip",
    statusLabel: { pt: "PROTÓTIPO · EM ANDAMENTO", en: "PROTOTYPE · IN PROGRESS" },
    desc: {
      pt: "Alerta de chuva com o nome da sua rua, entregue no WhatsApp. Cruza a previsão do tempo com as 142 áreas de risco de Juiz de Fora e avisa o morador antes da água subir. Feito em equipe (MonkeyNerds).",
      en: "Rain alerts with your street's name, delivered on WhatsApp. It crosses the weather forecast with Juiz de Fora's 142 risk areas and warns residents before the water rises. Built as a team (MonkeyNerds).",
    },
    spec: [
      { k: { pt: "CIDADE", en: "CITY" }, v: same("Juiz de Fora (MG)") },
      { k: { pt: "ÁREAS", en: "AREAS" }, v: { pt: "142 de risco", en: "142 at risk" } },
      { k: { pt: "CANAL", en: "CHANNEL" }, v: same("WhatsApp") },
      { k: { pt: "EQUIPE", en: "TEAM" }, v: same("MonkeyNerds") },
    ],
    stack: ["django", "django rest framework", "postgresql"],
    links: [{ label: { pt: "código", en: "code" }, href: "https://github.com/Diarooll/ALERA" }],
    brand: "alera",
  },
  {
    id: "sitos",
    name: "Sito's Estacionamento",
    kicker: { pt: "freelance · landing page", en: "freelance · landing page" },
    status: "online",
    statusLabel: { pt: "ONLINE", en: "ONLINE" },
    desc: {
      pt: "Landing page de um estacionamento com duas unidades no Méier (RJ). Mostra os preços de cada unidade, mapas com tour 360° e um aviso de “Aberto agora” no fuso de São Paulo.",
      en: "Landing page for a parking business with two locations in Méier, Rio de Janeiro. It shows each location's prices, maps with a 360° tour and an “Open now” status in São Paulo's time zone.",
    },
    spec: [
      { k: { pt: "UNIDADES", en: "LOCATIONS" }, v: { pt: "2, no Méier (RJ)", en: "2, in Méier (RJ)" } },
      { k: { pt: "PREÇOS", en: "PRICES" }, v: { pt: "de cada unidade", en: "for each location" } },
      { k: { pt: "MAPAS", en: "MAPS" }, v: { pt: "com tour 360°", en: "with a 360° tour" } },
      { k: { pt: "AVISO", en: "STATUS" }, v: { pt: "Aberto agora, fuso de São Paulo", en: "Open now, São Paulo time" } },
    ],
    stack: ["html", "css", "javascript"],
    links: [
      { label: { pt: "ver online", en: "see it live" }, href: "https://www.sitosestacionamento.com.br" },
      { label: { pt: "código", en: "code" }, href: "https://github.com/Diarooll/Sito-s-estacionamento" },
    ],
    brand: "site",
  },
];
