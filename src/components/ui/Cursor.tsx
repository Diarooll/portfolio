"use client";
// Cursor próprio (ponto + anel que segue com atraso). Só com mouse e no modo completo;
// em telas de toque e com movimento reduzido o cursor do sistema continua.
import { useEffect, useRef } from "react";
import { pointer } from "@/lib/scroll-engine";
import { useScrollFrame } from "@/hooks/useScrollFrame";

export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const st = useRef({ on: false, rx: -100, ry: -100 });

  useEffect(() => {
    const root = document.documentElement;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine || root.dataset.motion === "reduced") return;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!st.current.on) {
        st.current.on = true;
        st.current.rx = e.clientX;
        st.current.ry = e.clientY;
        root.classList.add("cur");
      }
      const t = e.target as Element | null;
      ring.current?.classList.toggle("big", !!t?.closest?.("a, button, .leaf, [role='button']"));
    };
    const leave = () => {
      st.current.on = false;
      root.classList.remove("cur");
    };
    window.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      root.classList.remove("cur");
    };
  }, []);

  useScrollFrame((s) => {
    if (!st.current.on || !dot.current || !ring.current) return;
    const k = 1 - Math.exp(-s.dt * 16);
    st.current.rx += (pointer.x - st.current.rx) * k;
    st.current.ry += (pointer.y - st.current.ry) * k;
    dot.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
    ring.current.style.transform = `translate3d(${st.current.rx.toFixed(1)}px, ${st.current.ry.toFixed(1)}px, 0)`;
  }, 50);

  return (
    <>
      <div ref={dot} className="cur-dot" aria-hidden="true" />
      <div ref={ring} className="cur-ring" aria-hidden="true">
        <i />
      </div>
    </>
  );
}
