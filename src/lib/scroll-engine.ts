"use client";
// Motor de rolagem: UM laço de requestAnimationFrame para a página inteira.
// Por quê: a coreografia (nome subindo, painéis, raízes, paisagem) depende
// da mesma posição de rolagem; um laço só evita leituras repetidas do layout
// e mantém tudo sincronizado no mesmo quadro.
//
// - seções se registram (registerSection) e o motor mede o topo/altura delas;
// - componentes assinam o quadro (subscribe) e escrevem estilos direto no DOM
//   (sem setState a cada quadro, que seria caro);
// - Lenis suaviza a rolagem só no modo completo e com mouse.
import Lenis from "lenis";
import { currentMotion } from "./motion";

export type SectionId = "hero" | "sobre" | "stack" | "projetos" | "jornada" | "contato" | "fim";
export interface Metrics {
  top: number;
  h: number;
}
export interface FrameState {
  /** posição de rolagem (já suavizada pelo Lenis, quando ativo) */
  y: number;
  vw: number;
  vh: number;
  /** segundos desde o quadro anterior (limitado a 50 ms) */
  dt: number;
  /** tempo total em segundos */
  t: number;
  /** velocidade da rolagem em px/s */
  vel: number;
  /** a rolagem ou as medidas mudaram neste quadro? */
  changed: boolean;
  reduced: boolean;
  /** altura da maior viewport (100lvh: barra do navegador escondida), para camadas que precisam cobrir a tela */
  lvh: number;
  /** tela de toque (sem mouse): evita efeitos caros por quadro */
  coarse: boolean;
}
type Cb = (s: FrameState) => void;

/** cursor global (para paralaxe, rajadas nas folhas e o passarinho) */
export const pointer = { x: -1, y: -1, seen: false, fine: false };

/** recados entre componentes (ex.: onde fica o chão da árvore da Stack) */
export const bus: { stackGround: number | null; gl3d: boolean } = { stackGround: null, gl3d: false };

const frameCbs: { cb: Cb; prio: number }[] = [];
const measureCbs: { cb: Cb; prio: number }[] = [];
const sections = new Map<SectionId, HTMLElement>();
export const M: Partial<Record<SectionId, Metrics>> = {};

export const state: FrameState = { y: 0, vw: 1, vh: 1, dt: 0, t: 0, vel: 0, changed: true, reduced: false, lvh: 1, coarse: false };

let started = false;
let running = false;
let raf = 0;
let last = 0;
let lastY = -1;
let needMeasure = true;
let lenis: Lenis | null = null;

const sortByPrio = (a: { prio: number }, b: { prio: number }) => a.prio - b.prio;

export function registerSection(id: SectionId, el: HTMLElement) {
  sections.set(id, el);
  requestMeasure();
  return () => {
    if (sections.get(id) === el) sections.delete(id);
  };
}

/** assina o quadro; prioridade menor roda antes */
export function subscribe(cb: Cb, prio = 0) {
  const it = { cb, prio };
  frameCbs.push(it);
  frameCbs.sort(sortByPrio);
  ensureStarted();
  return () => {
    const i = frameCbs.indexOf(it);
    if (i >= 0) frameCbs.splice(i, 1);
  };
}

/** assina as medições (redimensionar, fontes carregadas...) */
export function onMeasure(cb: Cb, prio = 0) {
  const it = { cb, prio };
  measureCbs.push(it);
  measureCbs.sort(sortByPrio);
  requestMeasure();
  ensureStarted();
  return () => {
    const i = measureCbs.indexOf(it);
    if (i >= 0) measureCbs.splice(i, 1);
  };
}

export function requestMeasure() {
  needMeasure = true;
}

/** topo de um elemento no documento */
export const docTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

/** topo, na tela, de um capítulo preso (sticky) para a rolagem s */
export function pinTop(m: Metrics, s: number, vh: number) {
  const end = m.top + m.h - vh;
  return s < m.top ? m.top - s : s <= end ? 0 : end - s;
}

let lvhProbe: HTMLDivElement | null = null;
/**
 * altura de tela usada pela coreografia. No celular, window.innerHeight muda quando a barra do navegador
 * esconde/aparece durante a rolagem: a coreografia inteira mudava de escala no meio do gesto (a velocidade
 * "aumentava e diminuía do nada") e tudo era remedido. Lá usamos a altura estável do layout (= 100svh,
 * a mesma unidade das seções presas).
 */
function viewportH() {
  return state.coarse ? document.documentElement.clientHeight || window.innerHeight : window.innerHeight;
}
function largeVH() {
  if (!lvhProbe) {
    lvhProbe = document.createElement("div");
    lvhProbe.setAttribute("aria-hidden", "true");
    lvhProbe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
    document.body.appendChild(lvhProbe);
  }
  return Math.max(lvhProbe.offsetHeight, window.innerHeight);
}

function measure() {
  needMeasure = false;
  state.vw = window.innerWidth;
  state.vh = viewportH();
  state.lvh = largeVH();
  sections.forEach((el, id) => {
    M[id] = { top: docTop(el), h: el.offsetHeight };
  });
  for (const m of measureCbs) m.cb(state);
  state.changed = true;
}

function loop(ts: number) {
  if (!running) return;
  const dt = Math.min(Math.max(ts - last, 0) / 1000, 0.05);
  last = ts;
  state.dt = dt;
  state.t += dt;
  if (lenis) lenis.raf(ts);
  if (needMeasure) measure();
  const y = window.scrollY;
  state.vel = dt > 0 ? (y - (lastY < 0 ? y : lastY)) / dt : 0;
  if (y !== lastY) state.changed = true;
  lastY = y;
  state.y = y;
  for (const f of frameCbs) {
    try {
      f.cb(state);
    } catch (e) {
      console.error(e);
    }
  }
  state.changed = false;
  raf = requestAnimationFrame(loop);
}

function onVisibility() {
  if (document.hidden) {
    running = false;
    cancelAnimationFrame(raf);
  } else if (!running) {
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
}

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  state.reduced = currentMotion() === "reduced";
  state.coarse = matchMedia("(pointer: coarse)").matches;
  let rq = 0;
  let lastW = window.innerWidth;
  let lastH = viewportH();
  const queue = () => {
    // no toque, a barra do navegador mexe só na altura visível: se a largura e a altura estável não mudaram,
    // não há nada para remedir (antes cada aparição da barra forçava layout de todas as seções no meio da rolagem)
    if (state.coarse) {
      const w = window.innerWidth;
      const h = viewportH();
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
    }
    if (rq) return;
    rq = requestAnimationFrame(() => {
      rq = 0;
      requestMeasure();
    });
  };
  window.addEventListener("resize", queue);
  if ("ResizeObserver" in window) new ResizeObserver(queue).observe(document.body);
  document.fonts?.ready.then(queue).catch(() => {});
  document.addEventListener("visibilitychange", onVisibility);
  pointer.fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.seen = true;
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => {
    pointer.seen = false;
  });
  running = !document.hidden;
  last = performance.now();
  if (running) raf = requestAnimationFrame(loop);
}

/** liga a rolagem suave (Lenis). Só no modo completo e com mouse. */
export function enableSmoothScroll() {
  if (lenis || typeof window === "undefined") return;
  const coarse = matchMedia("(pointer: coarse)").matches;
  if (state.reduced || coarse) return;
  lenis = new Lenis({ autoRaf: false, lerp: 0.12, anchors: true, smoothWheel: true });
  ensureStarted();
}

export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: state.reduced ? "auto" : "smooth" });
}

/** só para testes */
export function __resetEngine() {
  frameCbs.length = 0;
  measureCbs.length = 0;
  sections.clear();
}
