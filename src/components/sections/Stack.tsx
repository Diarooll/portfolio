"use client";
// Stack: as 10 tecnologias como broches 3D (fatias de pão com o logo na cor
// da marca) girando juntas num círculo inclinado, em volta de um centro
// invisível, sobre um céu de nuvens em parallax. Dá para arrastar e girar
// (e usar as setas); sem WebGL, as mesmas peças em 2D. As tecnologias são
// sempre botões de verdade (teclado, leitor de tela), por cima do desenho.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, sstep } from "@/lib/math";
import { M, bus as pageBus, pointer, requestMeasure, type FrameState } from "@/lib/scroll-engine";
import { techGroups, techs } from "@/content/techs";
import { stackCopy } from "@/content/stack";
import { BRAND, faceTone } from "@/content/brands";
import { pick } from "@/content/types";
import Dissolve from "@/components/ui/Dissolve";
import TechIcon from "@/components/ui/TechIcon";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { hasWebGL } from "@/lib/webgl";
import type { OrbitBus, OrbitTile } from "@/components/three/StackOrbit";
import { layoutFallback, type FallbackOrbit } from "./stackFallback";
import styles from "./Stack.module.css";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";
import { useInViewOnce } from "@/hooks/useInViewOnce";

// o 3D só é baixado quando a Stack está chegando perto da tela
const StackOrbit = dynamic(() => import("@/components/three/StackOrbit"), { ssr: false });

/** o título fica no palco preso: aparece enquanto a Stack sobe para o topo da tela */
const titleP = (s: FrameState) => clamp((s.y + s.vh * 0.92 - ((M.stack?.top ?? 0) + 140)) / (s.vh * 0.45));

/** grupo de cada tecnologia, na ordem da órbita */
const GROUP_OF = techGroups.flatMap((g, gi) => g.items.map(() => gi));

export default function Stack() {
  const t = useTranslations("stack");
  const locale = useLocale();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tree = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const wrapEl = useRef<HTMLDivElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const noteEl = useRef<HTMLParagraphElement>(null);
  const fb = useRef<FallbackOrbit | null>(null);
  useSection("stack", section);

  const near = useInViewOnce(section, "150% 0px");
  const [want3d, setWant3d] = useState(false);
  const [gl3d, setGl3d] = useState(false);
  const [touch, setTouch] = useState(false);
  const [active, setActive] = useState(-1);

  const bus = useMemo<OrbitBus>(
    () => ({
      p: 0,
      fade: 0,
      rot: { y: 0, v: 0, drag: false, idle: 99 },
      hover: techs.map(() => false),
      focus: techs.map(() => false),
      buttons: [],
      reduced: false,
      cursor: { x: 0, y: 0 },
    }),
    [],
  );
  const moved = useRef(false);

  useEffect(() => {
    setTouch(matchMedia("(pointer: coarse)").matches);
    bus.reduced = document.documentElement.dataset.motion === "reduced";
  }, [bus]);
  useEffect(() => {
    if (near && hasWebGL()) setWant3d(true);
  }, [near]);

  bus.onReady = useCallback(() => {
    setGl3d(true);
    pageBus.gl3d = true;
  }, []);

  const stop3d = useCallback(() => {
    setGl3d(false);
    setWant3d(false);
    pageBus.gl3d = false;
    bus.buttons.forEach((b) => b?.removeAttribute("style"));
    requestMeasure();
  }, [bus]);

  // medidas: o desenho 2D (quando não há 3D)
  useMeasure(() => {
    const tr = tree.current;
    if (!tr) return;
    if (gl3d) {
      fb.current?.clear();
      fb.current = null;
    } else if (svg.current) {
      const leaves = Array.from(tr.querySelectorAll<HTMLElement>(".leaf"));
      fb.current = layoutFallback(tr, svg.current, leaves, GROUP_OF);
    }
    // a órbita não fica presa no chão: a paisagem usa o enquadramento padrão
    pageBus.stackGround = null;
  });
  useEffect(() => requestMeasure(), [gl3d]);

  useScrollFrame((s) => {
    const m = M.stack;
    const pj = M.projetos;
    if (!m || !pj) return;
    const { y, vh } = s;
    const denom = Math.max(1, Math.min(pj.top - m.top, m.h - vh));
    const p = clamp((y - m.top) / denom);
    bus.p = p;
    bus.reduced = s.reduced;
    bus.fade = sstep(clamp((y - (m.top - 0.9 * vh)) / (0.6 * vh))) * (1 - sstep(clamp((y - (pj.top + 0.15 * vh)) / (0.5 * vh))));
    bus.cursor.x = pointer.seen ? (pointer.x / s.vw) * 2 - 1 : 0;
    bus.cursor.y = pointer.seen ? (pointer.y / vh) * 2 - 1 : 0;
    // todo o conteúdo some (fade rápido) antes da intro de Projetos e fica fora do tab order
    const wrap = wrapEl.current;
    if (wrap) {
      const o = 1 - sstep(clamp((y - (pj.top - 0.85 * vh)) / (0.3 * vh)));
      const inView = o > 0.004 && y > m.top - 1.3 * vh;
      wrap.style.opacity = o.toFixed(3);
      wrap.style.visibility = inView ? "visible" : "hidden";
      wrap.style.pointerEvents = o > 0.5 ? "" : "none";
    }
    const inRange = y > m.top - 1.2 * vh && y < pj.top + 0.9 * vh;
    if (gl3d && inRange) bus.invalidate?.();
    if (!s.changed) return;
    if (!gl3d) fb.current?.update(p, s.reduced);
    const se = sstep(clamp((y - (m.top - 0.6 * vh)) / (0.55 * vh)));
    if (sub.current) sub.current.style.opacity = se.toFixed(3);
    if (noteEl.current) noteEl.current.style.opacity = sstep(clamp((y - (m.top - 0.2 * vh)) / (0.4 * vh))).toFixed(3);
  });

  // arrastar para girar (só na horizontal; na vertical a página rola)
  useEffect(() => {
    const el = tree.current;
    if (!el) return;
    const R = bus.rot;
    let sx = 0;
    let sy = 0;
    let lx = 0;
    let id: number | null = null;
    let intent = 0;
    let lt = 0;
    const down = (e: PointerEvent) => {
      if (!pageBus.gl3d) return;
      id = e.pointerId;
      sx = lx = e.clientX;
      sy = e.clientY;
      intent = 0;
      moved.current = false;
      lt = performance.now();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (!intent) {
        if (Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          intent = 1;
          R.drag = true;
          moved.current = true;
          try {
            el.setPointerCapture(e.pointerId);
          } catch {}
          el.classList.add("grabbing");
        } else if (Math.abs(dy) > 12) intent = -1;
      }
      if (intent === 1) {
        const now = performance.now();
        const d = e.clientX - lx;
        lx = e.clientX;
        R.y += d * 0.0085;
        R.v = (d * 0.0085) / (Math.max(8, now - lt) / 1000);
        lt = now;
        R.idle = 0;
        bus.invalidate?.();
        e.preventDefault();
      }
    };
    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      if (R.drag) {
        R.drag = false;
        el.classList.remove("grabbing");
        if (performance.now() - lt > 80) R.v = 0;
        bus.invalidate?.();
      }
    };
    // um arrasto não deve virar clique numa tecnologia
    const click = (e: MouseEvent) => {
      if (moved.current) {
        e.preventDefault();
        e.stopPropagation();
        moved.current = false;
      }
    };
    const key = (e: KeyboardEvent) => {
      if (!pageBus.gl3d || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      const sgn = e.key === "ArrowLeft" ? -1 : 1;
      if (bus.reduced) R.y += sgn * 0.35;
      else R.v += sgn * 2.4;
      R.idle = 0;
      bus.invalidate?.();
      e.preventDefault();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", click, true);
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      el.removeEventListener("click", click, true);
      el.removeEventListener("keydown", key);
    };
  }, [bus]);

  const hint = (touch ? t("hintTouch") : t("hint")) + (gl3d ? ` ${t("hintDrag")}` : "");
  const activeTech = active >= 0 ? techs[active] : null;
  const note = activeTech ? `${activeTech.name}: ${pick(activeTech.note, locale)}.` : hint;

  const show = (i: number) => {
    bus.hover.fill(false);
    bus.hover[i] = true;
    setActive(i);
    bus.invalidate?.();
  };
  const hide = (i: number) => {
    bus.hover[i] = false;
    setActive((a) => (a === i ? -1 : a));
    bus.invalidate?.();
  };

  // peças da órbita (os nomes das tecnologias não mudam com o idioma)
  const tiles = useMemo<OrbitTile[]>(() => techGroups.flatMap((g, gi) => g.items.map((it) => ({ id: it.id, name: it.name, ref: it.ref, group: gi }))), []);

  let idx = 0;
  return (
    <section ref={section} className={`pin stack ${styles.section}${gl3d ? " gl3d" : ""}`} id="stack" aria-labelledby="stackT">
      <div ref={stage} className="stage">
        <div ref={wrapEl} className="wrap st-wrap">
          <div className="st-head">
            <Dissolve as="h2" className="title" id="stackT" text={t("title")} seed={5} progress={titleP} />
            <p ref={sub} className="st-sub glass">
              {t("sub")}
            </p>
          </div>
          <div ref={tree} className="tree" tabIndex={0} role="group" aria-label={pick(stackCopy.label, locale)}>
            <svg ref={svg} className="tree-svg" aria-hidden="true" focusable="false" />
            {want3d && (
              <ErrorBoundary onError={stop3d}>
                <StackOrbit bus={bus} tiles={tiles} />
              </ErrorBoundary>
            )}
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
                          ref={(b) => {
                            bus.buttons[i] = b;
                          }}
                          className={`tn leaf${active === i ? " is-on" : ""}`}
                          aria-label={it.name}
                          type="button"
                          aria-describedby="treeNote"
                          onPointerEnter={() => show(i)}
                          onPointerLeave={() => hide(i)}
                          onFocus={() => {
                            bus.focus[i] = true;
                            show(i);
                          }}
                          onBlur={() => {
                            bus.focus[i] = false;
                            hide(i);
                          }}
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
          <p ref={noteEl} id="treeNote" className="tree-note glass" aria-live="polite">
            {note}
          </p>
        </div>
      </div>
    </section>
  );
}
