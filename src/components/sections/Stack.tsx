"use client";
// Stack: as 10 tecnologias como placas escuras arredondadas (logo na cor da marca e etiqueta embaixo),
// soltas numa grade, balançando devagar. Na saída elas se espalham para os cantos da tela.
// As tecnologias são sempre botões de verdade (teclado, leitor de tela).
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, sstep, easeOut } from "@/lib/math";
import { M } from "@/lib/scroll-engine";
import { techGroups, techs } from "@/content/techs";
import { stackCopy } from "@/content/stack";
import { BRAND, faceTone } from "@/content/brands";
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
  const dirs = useRef<{ x: number; y: number }[]>([]);
  useSection("stack", section);

  const [touch, setTouch] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    setTouch(matchMedia("(hover: none)").matches);
  }, []);

  // direção de cada placa em relação ao centro da grade (para se espalhar rumo ao canto mais próximo)
  useMeasure(() => {
    const tr = tree.current;
    if (!tr) return;
    const W = tr.clientWidth || 1;
    const H = tr.clientHeight || 1;
    dirs.current = Array.from(tr.querySelectorAll<HTMLElement>(".leaf")).map((el) => {
      const dx = (el.offsetLeft + el.offsetWidth / 2 - W / 2) / (W / 2);
      const dy = (el.offsetTop + el.offsetHeight / 2 - H / 2) / (H / 2);
      return { x: Math.abs(dx) < 0.08 ? 0.4 : Math.sign(dx), y: Math.abs(dy) < 0.08 ? -0.6 : Math.sign(dy) };
    });
  });

  useScrollFrame((s) => {
    const m = M.stack;
    const pj = M.projetos;
    if (!m || !pj) return;
    const { y, vh, vw } = s;
    // entrada suave; saída: as placas se espalham para os cantos da tela, antes de Projetos chegar.
    // Com movimento reduzido o conteúdo só some num crossfade.
    const enter = sstep(clamp((y - (m.top - 0.9 * vh)) / (0.6 * vh)));
    const ex = s.reduced ? 0 : clamp((y - (pj.top - 1.15 * vh)) / (0.85 * vh));
    const wrap = wrapEl.current;
    if (wrap) {
      const o = s.reduced ? 1 - sstep(clamp((y - (pj.top - 0.85 * vh)) / (0.3 * vh))) : 1;
      const inView = o > 0.004 && y > m.top - 1.3 * vh && ex < 0.999;
      wrap.style.opacity = o.toFixed(3);
      wrap.style.visibility = inView ? "visible" : "hidden";
      wrap.style.pointerEvents = o > 0.5 && ex < 0.3 ? "" : "none";
    }
    // o título, o subtítulo e a dica somem ANTES de as placas começarem a sair
    const textOut = s.reduced ? 1 : 1 - sstep(clamp((y - (pj.top - 1.42 * vh)) / (0.24 * vh)));
    if (head.current) head.current.style.opacity = textOut.toFixed(3);
    const tr = tree.current;
    if (!tr) return;
    if (s.reduced) {
      tr.style.opacity = enter.toFixed(3);
      return;
    }
    tr.style.opacity = "";
    const leaves = tr.querySelectorAll<HTMLElement>(".leaf");
    const n = leaves.length;
    const out = easeOut(ex);
    leaves.forEach((el, i) => {
      const k = easeOut(clamp((enter - (i / n) * 0.35) / 0.65));
      const d = dirs.current[i] ?? { x: 0, y: 0 };
      const tx = d.x * vw * 0.75 * out * out;
      const ty = d.y * vh * 0.75 * out * out;
      const rot = d.x * 40 * out;
      el.style.opacity = k.toFixed(3);
      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${(ty + (1 - k) * 18).toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${(0.88 + 0.12 * k - 0.2 * out).toFixed(3)})`;
    });
  });

  const hint = (touch ? t("hintTouch") : t("hint"));
  const activeTech = active >= 0 ? techs[active] : null;
  const note = activeTech ? `${activeTech.name}: ${pick(activeTech.note, locale)}.` : hint;

  const show = (i: number) => setActive(i);
  const hide = (i: number) => setActive((a) => (a === i ? -1 : a));

  let idx = 0;
  return (
    <section ref={section} className={`pin stack ${styles.section}`} id="stack" aria-labelledby="stackT">
      <div ref={stage} className="stage">
        <div ref={wrapEl} className="wrap st-wrap">
          <div ref={head} className="st-head">
            <Dissolve as="h2" className="title" id="stackT" text={t("title")} seed={5} progress={titleP} />
          </div>
          <div ref={tree} className="tree" tabIndex={0} role="group" aria-label={pick(stackCopy.label, locale)}>
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
                          className={`tn leaf${active === i ? " is-on" : ""}`}
                          style={{ ["--fd" as string]: `${(6 + ((i * 7) % 5) * 0.9).toFixed(1)}s`, ["--fl" as string]: `${(-((i * 13) % 9) * 0.8).toFixed(1)}s` }}
                          aria-label={it.name}
                          type="button"
                          aria-describedby="treeNote"
                          onPointerEnter={() => show(i)}
                          onPointerLeave={() => hide(i)}
                          onFocus={() => show(i)}
                          onBlur={() => hide(i)}
                          onClick={() => show(i)}
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
