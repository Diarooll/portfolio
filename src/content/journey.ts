// Jornada: marcos em ordem. O último é o próximo passo (marcado com tracejado).
import type { Localized } from "./types";

export interface JourneyItem {
  when: Localized;
  title: Localized;
  /** pode conter <sents>$ents</sents>, que vira a marca em linha */
  desc: Localized;
  next?: boolean;
}

export const journey: JourneyItem[] = [
  {
    when: { pt: "Ciência da Computação · 1 período", en: "Computer Science · 1 semester" },
    title: { pt: "O começo", en: "The start" },
    desc: {
      pt: "Comecei em Ciência da Computação e me apaixonei por programar: lógica e resolver problemas.",
      en: "I started in Computer Science and fell in love with programming: logic and solving problems.",
    },
  },
  {
    when: { pt: "FIAP · cursando", en: "FIAP · in progress" },
    title: { pt: "Engenharia de Software", en: "Software Engineering" },
    desc: {
      pt: "Já no primeiro semestre, o que mais me atraiu foi construir soluções para problemas do dia a dia.",
      en: "In my very first semester, what drew me most was building solutions for everyday problems.",
    },
  },
  {
    when: { pt: "em andamento", en: "in progress" },
    title: { pt: "Back-end, frameworks e DevSecOps", en: "Back-end, frameworks and DevSecOps" },
    desc: {
      pt: "Estudo back-end, frameworks, estrutura de dados e DevSecOps.",
      en: "I'm studying back-end, frameworks, data structures and DevSecOps.",
    },
  },
  {
    when: { pt: "agora · CEO", en: "now · CEO" },
    title: { pt: "Investindo na minha startup", en: "Building my startup" },
    desc: {
      pt: "Sou CEO do <sents>$ents</sents> e estou construindo o produto.",
      en: "I'm the CEO of <sents>$ents</sents> and I'm building the product.",
    },
  },
  {
    when: { pt: "próximo passo", en: "next step" },
    title: { pt: "Estágio ou vaga júnior", en: "Internship or junior role" },
    desc: {
      pt: "Quero ver de perto como funciona um grande sistema, trabalhando com uma das minhas tecnologias.",
      en: "I want to see up close how a large system works, using one of my technologies.",
    },
    next: true,
  },
];
