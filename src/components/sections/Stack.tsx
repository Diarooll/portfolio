"use client";
// Stack: a árvore "Diego" de pé no chão da paisagem; as raízes crescem com a
// rolagem até as 10 tecnologias. Em 3D (WebGL) dá para arrastar e girar;
// sem WebGL, o mesmo desenho em SVG. Os botões das tecnologias são sempre
// botões de verdade (teclado, leitor de tela), por cima do desenho.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, sstep } from "@/lib/math";
import { M, bus as pageBus, pointer, requestMeasure } from "@/lib/scroll-engine";
import { techGroups, techs } from "@/content/techs";
import { pick } from "@/content/types";
import Dissolve from "@/components/ui/Dissolve";
import TechIcon from "@/components/ui/TechIcon";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { hasWebGL } from "@/components/three/assets";
import type { TreeBus } from "@/components/three/StackTree";
import { layoutFallback, type FallbackTree } from "./stackFallback";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";
import { useInViewOnce } from "@/hooks/useInViewOnce";

// o 3D só é baixado quando a Stack está chegando perto da tela
const StackTree = dynamic(() => import("@/components/three/StackTree"), { ssr: false });

export default function Stack() {
  const t = useTranslations("stack");
  const locale = useLocale();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tree = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const rootEl = useRef<HTMLDivElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const noteEl = useRef<HTMLParagraphElement>(null);
  const fb = useRef<FallbackTree | null>(null);
  const off = useRef({ top: 0 });
  const groundPx = useRef<number | null>(null);
  useSection("stack", section);

  const near = useInViewOnce(section, "150% 0px");
  const [want3d, setWant3d] = useState(false);
  const [gl3d, setGl3d] = useState(false);
  const [touch, setTouch] = useState(false);
  const [active, setActive] = useState(-1);

  const bus = useMemo<TreeBus>(
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
  bus.onGround = useCallback((px: number) => {
    groundPx.current = px;
    requestMeasure();
  }, []);

  const stop3d = useCallback(() => {
    setGl3d(false);
    setWant3d(false);
    pageBus.gl3d = false;
    bus.buttons.forEach((b) => b?.removeAttribute("style"));
    groundPx.current = null;
    requestMeasure();
  }, [bus]);

  // medidas: posição da árvore dentro do palco preso e o desenho em SVG
  useMeasure((s) => {
    const tr = tree.current;
    const st = stage.current;
    if (!tr || !st) return;
    off.current.top = tr.getBoundingClientRect().top - st.getBoundingClientRect().top;
    if (gl3d) {
      fb.current?.clear();
      fb.current = null;
    } else if (svg.current && rootEl.current) {
      const groups = Array.from(tr.querySelectorAll<HTMLElement>(".tgroup")).map((g) => ({
        el: g.querySelector<HTMLElement>(".grp")!,
        leaves: Array.from(g.querySelectorAll<HTMLElement>(".leaf")),
      }));
      fb.current = layoutFallback(tr, svg.current, rootEl.current, groups);
    }
    const g = gl3d && groundPx.current != null ? groundPx.current : fb.current?.ground;
    // a paisagem põe a borda grama/terra aqui (fração da altura da tela, com o palco preso)
    pageBus.stackGround = g != null ? clamp((off.current.top + g) / s.vh, 0.15, 0.85) : null;
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

  const groups3d = useMemo(
    () => techGroups.map((g) => ({ ref: g.ref, name: pick(g.name, locale), items: g.items.map((it) => ({ id: it.id, name: it.name, ref: it.ref })) })),
    [locale],
  );

  let idx = 0;
  return (
    <section ref={section} className={`pin stack${gl3d ? " gl3d" : ""}`} id="stack" aria-labelledby="stackT">
      <div ref={stage} className="stage">
        <div className="wrap st-wrap">
          <div className="st-head">
            <Dissolve as="h2" className="title" id="stackT" text={t("title")} seed={5} />
            <p ref={sub} className="st-sub glass">
              {t("sub")}
            </p>
          </div>
          <div ref={tree} className="tree" tabIndex={0} role="group" aria-label={t("treeLabel")}>
            <svg ref={svg} className="tree-svg" aria-hidden="true" focusable="false" />
            {want3d && (
              <ErrorBoundary onError={stop3d}>
                <StackTree bus={bus} groups={groups3d} rootRef={t("rootRef")} />
              </ErrorBoundary>
            )}
            <div ref={rootEl} className="tn root chip">
              <span className="ref">{t("rootRef")}</span>Diego
            </div>
            {techGroups.map((g) => (
              <div key={g.id} className="tgroup">
                <h3 className="tn grp chip">
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
                            <TechIcon id={it.id} />
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
