"use client";
// Stack: as 10 tecnologias como placas escuras arredondadas (logo na cor da marca e etiqueta embaixo),
// soltas numa grade, balançando devagar. Na saída elas se espalham para os cantos da tela.
// As tecnologias são sempre botões de verdade (teclado, leitor de tela).
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, sstep, sstep5, easeOut } from "@/lib/math";
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
  const mist = useRef<(HTMLDivElement | null)[]>([]);
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
    const ex = s.reduced ? 0 : clamp((y - (pj.top - 0.8 * vh)) / (0.68 * vh));
    // as placas entram DEPOIS do título (que usa titleP), uma após a outra
    const enterP = sstep(clamp((y - (m.top - 0.5 * vh)) / (0.75 * vh)));
    const wrap = wrapEl.current;
    if (wrap) {
      const o = s.reduced ? 1 - sstep(clamp((y - (pj.top - 0.5 * vh)) / (0.3 * vh))) : 1;
      const inView = o > 0.004 && y > m.top - 1.3 * vh && ex < 0.999;
      wrap.style.opacity = o.toFixed(3);
      wrap.style.visibility = inView ? "visible" : "hidden";
      wrap.style.pointerEvents = o > 0.5 && ex < 0.3 ? "" : "none";
    }
    // o título, o subtítulo e a dica somem ANTES de as placas começarem a sair
    const textOut = s.reduced ? 1 : 1 - sstep(clamp((y - (pj.top - 1.07 * vh)) / (0.24 * vh)));
    if (head.current) head.current.style.opacity = textOut.toFixed(3);
    const tr = tree.current;
    if (!tr) return;
    if (s.reduced) {
      tr.style.opacity = enter.toFixed(3);
      mist.current.forEach((el) => el && (el.style.opacity = "0"));
      return;
    }
    // faixas de névoa NA FRENTE de algumas placas: aparecem com a entrada e somem com a saída
    const mo = enterP * (1 - sstep5(clamp(ex / 0.4)));
    mist.current.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = (mo * (i ? 0.38 : 0.46)).toFixed(3);
      el.style.transform = `translate3d(${clamp((y - m.top) * (i ? -0.05 : 0.04), -90, 90).toFixed(1)}px, 0, 0)`;
    });
    const par = clamp((y - m.top) / vh, -1, 1);
    tr.style.opacity = "";
    const leaves = tr.querySelectorAll<HTMLElement>(".leaf");
    const n = leaves.length;
    const out = easeOut(ex);
    leaves.forEach((el, i) => {
      // stagger: cada placa começa um pouco depois da anterior (~60ms de rolagem) e sobe 24px, de .9 a 1
      const k = easeOut(clamp((enterP - (i / n) * 0.45) / 0.55));
      const back = i % 3 === 1;
      const d = dirs.current[i] ?? { x: 0, y: 0 };
      const tx = d.x * vw * 0.75 * out * out;
      // placas do plano de trás: menores e mais lentas (paralaxe leve), sempre dentro da própria célula
      const ty = d.y * vh * 0.75 * out * out + (back ? par * 12 : 0);
      const bs = back ? 0.84 : 1;
      const rot = d.x * 40 * out;
      el.style.opacity = (k * (back ? 0.82 : 1)).toFixed(3);
      el.style.transform = `translate3d(${tx.toFixed(1)}px, ${(ty + (1 - k) * 24).toFixed(1)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${((0.9 + 0.1 * k - 0.2 * out) * bs).toFixed(3)})`;
    });
  });

  const hint = (touch ? t("hintTouch") : t("hint"));
  const activeTech = active >= 0 ? techs[active] : null;
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
  const note = activeTech ? `${activeTech.name}: ${pick(activeTech.note, locale)}.${use ? ` ${use}.` : ""}` : hint;

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
          <p className="st-use" aria-hidden="true">
            {use}
          </p>
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
                          className={`tn leaf${active === i ? " is-on" : ""}${i % 3 === 1 ? " back" : ""}`}
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
          <div ref={(el) => void (mist.current[0] = el)} className="st-mist st-mist-a" aria-hidden="true" />
          <div ref={(el) => void (mist.current[1] = el)} className="st-mist st-mist-b" aria-hidden="true" />
          {/* sem texto de instrução na tela: só um aviso para leitores de tela (a tecnologia em foco) */}
          <p id="treeNote" className="sr" aria-live="polite">
            {note}
          </p>
        </div>
      </div>
    </section>
  );
}
