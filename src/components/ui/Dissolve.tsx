"use client";
// Texto que "se dissolve" para dentro: cada letra (ou palavra) aparece numa
// ordem com ruído, saindo do desfoque. O texto inteiro fica num <span> só
// para leitores de tela; as letras soltas ficam escondidas deles.
import { createElement, useMemo, useRef } from "react";
import { clamp, noise } from "@/lib/math";
import { docTop, type FrameState } from "@/lib/scroll-engine";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";

type Tag = "h1" | "h2" | "h3" | "p" | "span";

export interface DissolveProps {
  as?: Tag;
  text: string;
  unit?: "char" | "word";
  seed?: number;
  id?: string;
  className?: string;
  /** progresso 0..1; recebe o quadro e o topo do elemento no documento */
  progress?: (s: FrameState, top: number) => number;
  /** false quando o pai já tem o texto para leitores de tela */
  label?: boolean;
}

/** padrão: aparece enquanto entra pela parte de baixo da tela */
export const viewProgress = (s: FrameState, top: number) => clamp((s.y + s.vh * 0.92 - top) / (s.vh * 0.45));

export default function Dissolve({ as = "span", text, unit = "char", seed = 1, id, className, progress = viewProgress, label = true }: DissolveProps) {
  const ref = useRef<HTMLElement>(null);
  const top = useRef(0);
  const items = useRef<{ el: HTMLElement; o: number; k: number }[]>([]);
  const lastP = useRef(-1);

  const words = useMemo(() => text.replace(/\s+/g, " ").trim().split(" "), [text]);

  useMeasure(() => {
    const el = ref.current;
    if (!el) return;
    top.current = docTop(el);
    items.current = Array.from(el.querySelectorAll<HTMLElement>(".dz")).map((d, i) => ({ el: d, o: noise(i, seed), k: -1 }));
    lastP.current = -1;
  });

  useScrollFrame((s) => {
    if (!s.changed && lastP.current >= 0) return;
    const p = progress(s, top.current);
    if (Math.abs(p - lastP.current) < 0.0015 && p !== 0 && p !== 1) return;
    lastP.current = p;
    for (const it of items.current) {
      const k = clamp((p - it.o * 0.5) / 0.5);
      const kk = Math.round(k * 200) / 200;
      if (kk === it.k) continue;
      it.k = kk;
      const st = it.el.style;
      st.opacity = (0.06 + 0.94 * kk).toFixed(3);
      if (s.reduced) continue;
      st.filter = kk >= 1 ? "none" : `blur(${((1 - kk) * 7).toFixed(2)}px)`;
      st.transform = kk >= 1 ? "none" : `translate3d(0, ${((1 - kk) * 0.2).toFixed(3)}em, 0)`;
    }
  });

  const pieces = words.map((w, wi) => (
    <span key={wi}>
      <span className="dwd">
        {unit === "word" ? (
          <span className="dz">{w}</span>
        ) : (
          Array.from(w).map((ch, ci) => (
            <span key={ci} className="dz">
              {ch}
            </span>
          ))
        )}
      </span>
      {wi < words.length - 1 ? " " : null}
    </span>
  ));

  return createElement(
    as,
    { ref, id, className },
    label ? <span className="sr">{text}</span> : null,
    <span aria-hidden="true">{pieces}</span>,
  );
}
