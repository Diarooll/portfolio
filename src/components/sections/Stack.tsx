"use client";
// Stack: as 10 tecnologias como placas (logo na cor da marca e etiqueta embaixo) num ANEL inclinado que gira
// devagar; arrastar/deslizar gira com inércia, setas e foco levam a placa para a frente. Profundidade por
// escala, opacidade e leve desfoque. Entrada: saem do centro e se abrem no anel; saída: espalham para os cantos.
// As tecnologias são sempre botões de verdade (teclado, leitor de tela).
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, sstep, easeOut } from "@/lib/math";
import { M } from "@/lib/scroll-engine";
import { techGroups, techs } from "@/content/techs";
import { stackCopy } from "@/content/stack";
import { BRAND, faceTone } from "@/content/brands";
import { projects } from "@/content/projects";
import { pick } from "@/content/types";
import Dissolve from "@/components/ui/Dissolve";
import TechIcon from "@/components/ui/TechIcon";
import styles from "./Stack.module.css";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";
import type { FrameState } from "@/lib/scroll-engine";

/** o título fica no palco preso: aparece enquanto a Stack sobe para o topo da tela */
const titleP = (s: FrameState) => clamp((s.y + s.vh * 0.92 - ((M.stack?.top ?? 0) + 140)) / (s.vh * 0.45));

export default function Stack() {
  const t = useTranslations("stack");
  const locale = useLocale();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tree = useRef<HTMLDivElement>(null);
  const wrapEl = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  useSection("stack", section);

  const [touch, setTouch] = useState(false);
  const [active, setActive] = useState(-1);
  // placa que está na frente do anel (destaque e "Used in" quando ninguém aponta para outra)
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);

  // anel: ângulo atual, velocidade (inércia), arrasto e pausa do autoplay
  const ring = useRef({ rot: 0, vel: 0, target: null as number | null, drag: false, lastX: 0, lastT: 0, moved: 0, pausedUntil: 0, W: 1, H: 1 });

  useEffect(() => {
    setTouch(matchMedia("(hover: none)").matches);
  }, []);

  useMeasure(() => {
    const tr = tree.current;
    if (!tr) return;
    ring.current.W = tr.clientWidth || 1;
    ring.current.H = tr.clientHeight || 1;
  });

  const n = techs.length;
  const step = (Math.PI * 2) / n;
  /** ângulo do anel que põe a placa i na frente (embaixo da elipse, sin = 1) */
  const rotFor = (i: number) => Math.PI / 2 - i * step;
  const nearest = (from: number, to: number) => from + ((((to - from) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  const goTo = (i: number) => {
    const r = ring.current;
    if (r.drag) return;
    r.target = nearest(r.rot, rotFor(i));
    r.vel = 0;
    r.pausedUntil = performance.now() + 4000;
  };

  useScrollFrame((s) => {
    const m = M.stack;
    const pj = M.projetos;
    if (!m || !pj) return;
    const { y, vh, vw, dt } = s;
    const r = ring.current;
    // entrada: as placas saem do centro e se abrem no anel, uma após a outra; saída: espalham para os cantos.
    // Com movimento reduzido: anel parado, só crossfade
    const ex = s.reduced ? 0 : clamp((y - (pj.top - 0.8 * vh)) / (0.68 * vh));
    const enterP = s.reduced ? 1 : sstep(clamp((y - (m.top - 0.5 * vh)) / (0.75 * vh)));
    const wrap = wrapEl.current;
    let inView = false;
    if (wrap) {
      const o = s.reduced ? 1 - sstep(clamp((y - (pj.top - 0.5 * vh)) / (0.3 * vh))) : 1;
      inView = o > 0.004 && y > m.top - 1.3 * vh && ex < 0.999 && y < pj.top + vh;
      wrap.style.opacity = o.toFixed(3);
      wrap.style.visibility = inView ? "visible" : "hidden";
      wrap.style.pointerEvents = o > 0.5 && ex < 0.3 ? "" : "none";
    }
    // o título, o subtítulo e a dica somem ANTES de as placas começarem a sair
    const textOut = s.reduced ? 1 : 1 - sstep(clamp((y - (pj.top - 1.07 * vh)) / (0.24 * vh)));
    if (head.current) head.current.style.opacity = textOut.toFixed(3);
    // o rótulo "usado em" some junto com o título (não fica sobrando quando as placas se espalham)
    wrap?.style.setProperty("--st-text", textOut.toFixed(3));
    const tr = tree.current;
    if (!tr || !inView) return;

    // rotação: alvo (teclado/foco) > arrasto > inércia > autoplay lento
    const now = performance.now();
    if (r.target !== null) {
      const d = r.target - r.rot;
      r.rot += d * (1 - Math.exp(-dt * 9));
      if (Math.abs(d) < 0.001) {
        r.rot = r.target;
        r.target = null;
      }
    } else if (!r.drag) {
      if (Math.abs(r.vel) > 0.0005) {
        r.rot += r.vel * dt;
        r.vel *= Math.exp(-dt * 2.2);
      } else if (!s.reduced && now > r.pausedUntil && enterP > 0.99) {
        r.rot += dt * 0.16;
      }
    }

    const W = r.W;
    const H = r.H;
    const plate = vw < 560 ? 92 : 112;
    const rx = Math.max(60, Math.min((W - plate) / 2, 420));
    const ry = Math.max(40, Math.min(H / 2 - plate * 0.62, rx * (vw < 700 ? 0.95 : 0.36)));
    const out = easeOut(ex);
    const leaves = tr.querySelectorAll<HTMLElement>(".leaf");
    let best = 0;
    let bestZ = -2;
    leaves.forEach((el, i) => {
      const a = r.rot + i * step;
      const cx = Math.cos(a);
      const z = Math.sin(a); // 1 = frente (embaixo), -1 = fundo (em cima)
      if (z > bestZ) {
        bestZ = z;
        best = i;
      }
      const depth = (z + 1) / 2;
      const k = easeOut(clamp((enterP - (i / n) * 0.45) / 0.55));
      const tx = cx * rx * k + cx * vw * 0.75 * out * out;
      const ty = z * ry * k + Math.sign(z || 1) * vh * 0.6 * out * out;
      // no celular o fundo encolhe mais (menos sobreposição), e a frente fica com o ícone >= 56px
      const sc = (vw < 560 ? 0.55 + 0.5 * depth : 0.6 + 0.48 * depth) * (0.7 + 0.3 * k) * (1 - 0.25 * out);
      el.style.opacity = (k * (0.42 + 0.58 * depth)).toFixed(3);
      el.style.zIndex = String(Math.round(depth * 100));
      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      // desfoque leve só no fundo e só com mouse (no toque, filter por quadro custa caro); em degraus, para
      // não repintar a cada quadro
      const b = s.coarse || s.reduced ? 0 : depth < 0.25 ? 1.2 : depth < 0.45 ? 0.6 : 0;
      const fb = b ? `blur(${b}px)` : "";
      if (el.dataset.fb !== fb) {
        el.dataset.fb = fb;
        el.style.filter = fb;
      }
    });
    if (best !== frontRef.current) {
      frontRef.current = best;
      setFront(best);
    }
  });

  // arrastar/deslizar gira o anel (mouse e toque); o rolar vertical continua livre (touch-action: pan-y)
  const onDown = (e: React.PointerEvent) => {
    const r = ring.current;
    r.drag = true;
    r.target = null;
    r.vel = 0;
    r.lastX = e.clientX;
    r.lastT = performance.now();
    r.moved = 0;
    r.pausedUntil = Infinity;
  };
  const onMove = (e: React.PointerEvent) => {
    const r = ring.current;
    if (!r.drag) return;
    const dx = e.clientX - r.lastX;
    const now = performance.now();
    const da = (dx / Math.max(160, r.W * 0.45)) * Math.PI;
    r.rot += da;
    r.moved += Math.abs(dx);
    const dtm = Math.max(1, now - r.lastT) / 1000;
    r.vel = r.vel * 0.6 + (da / dtm) * 0.4;
    r.lastX = e.clientX;
    r.lastT = now;
    if (r.moved > 6 && !tree.current?.hasPointerCapture(e.pointerId)) tree.current?.setPointerCapture(e.pointerId);
  };
  const onUp = () => {
    const r = ring.current;
    if (!r.drag) return;
    r.drag = false;
    r.vel = clamp(r.vel, -8, 8);
    r.pausedUntil = performance.now() + 4000;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const cur = active >= 0 ? active : frontRef.current;
    const nx = (cur + (e.key === "ArrowRight" ? 1 : n - 1)) % n;
    goTo(nx);
    tree.current?.querySelectorAll<HTMLElement>(".leaf")[nx]?.focus({ preventScroll: true });
  };

  const hint = (touch ? t("hintTouch") : t("hint"));
  const shown = active >= 0 ? active : front;
  const activeTech = techs[shown] ?? null;
  // onde a tecnologia é usada, só a partir das tags de stack dos projetos
  // linguagem derivada dos frameworks dos projetos (django/fastapi -> Python; spring -> Java), sem inventar usos
  const LANG: Partial<Record<string, string[]>> = { python: ["django", "fastapi"], java: ["spring"] };
  const hasTag = (tag: string, id: string) => tag === id || tag.startsWith(`${id} `);
  const usedIn = activeTech
    ? projects
        .filter((p) => p.stack.some((tag) => hasTag(tag, activeTech.id) || (LANG[activeTech.id] ?? []).some((f) => hasTag(tag, f))))
        .map((p) => p.name)
        .join(", ")
    : "";
  const use = usedIn ? t("usedIn", { projects: usedIn }) : "";
  const note = active >= 0 && activeTech ? `${activeTech.name}: ${pick(activeTech.note, locale)}.${use ? ` ${use}.` : ""}` : hint;

  const show = (i: number) => setActive(i);
  // foco por teclado ou clique: o anel gira até a placa ficar na frente
  const focusTo = (i: number) => {
    setActive(i);
    goTo(i);
  };
  const hide = (i: number) => setActive((a) => (a === i ? -1 : a));

  let idx = 0;
  return (
    <section ref={section} className={`pin stack ${styles.section}`} id="stack" aria-labelledby="stackT">
      <div ref={stage} className="stage">
        <div ref={wrapEl} className="wrap st-wrap">
          <div ref={head} className="st-head">
            <Dissolve as="h2" className="title" id="stackT" text={t("title")} seed={5} progress={titleP} />
          </div>
          {/* rótulo "usado em": nomeia a tecnologia em foco (fica claro a qual placa se refere, mesmo longe dela);
              tecnologias sem projeto não mostram nada */}
          <p className={`st-use${use ? " on" : ""}`} aria-hidden="true">
            {use && activeTech ? (
              <>
                <b>{activeTech.name}</b> · {use}
              </>
            ) : null}
          </p>
          <div
            ref={tree}
            className="tree st-ring"
            role="group"
            aria-label={pick(stackCopy.label, locale)}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onKeyDown={onKey}
            onClickCapture={(e) => {
              // um arrasto não vira clique na placa
              if (ring.current.moved > 6) {
                e.stopPropagation();
                e.preventDefault();
              }
            }}
          >
            {techGroups.map((g) => (
              <div key={g.id} className="tgroup">
                <h3 className={`tn grp chip ${styles.grp}`}>
                  <span className="ref">{g.ref}</span>
                  {pick(g.name, locale)}
                </h3>
                <ul>
                  {g.items.map((it) => {
                    const i = idx++;
                    return (
                      <li key={it.id}>
                        <button
                          className={`tn leaf${shown === i ? " is-on" : ""}`}
                          style={{ ["--fd" as string]: `${(6 + ((i * 7) % 5) * 0.9).toFixed(1)}s`, ["--fl" as string]: `${(-((i * 13) % 9) * 0.8).toFixed(1)}s` }}
                          aria-label={it.name}
                          type="button"
                          aria-describedby="treeNote"
                          onPointerEnter={() => show(i)}
                          onPointerLeave={() => hide(i)}
                          onFocus={() => focusTo(i)}
                          onBlur={() => hide(i)}
                          onClick={() => focusTo(i)}
                        >
                          <span className="logo chip">
                            <TechIcon id={it.id} color={faceTone(it.id) === "dark" ? BRAND[it.id].colors[0] : undefined} />
                          </span>
                          <span className="txt">
                            <span className="ref">{it.ref}</span>
                            <span className="nm">{it.name}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {/* sem texto de instrução na tela: só um aviso para leitores de tela (a tecnologia em foco) */}
          <p id="treeNote" className="sr" aria-live="polite">
            {note}
          </p>
        </div>
      </div>
    </section>
  );
}
