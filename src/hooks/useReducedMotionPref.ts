"use client";
import { useEffect, useState } from "react";
import { motionOverride, resolveMotion, type MotionMode } from "@/lib/motion";

/**
 * Modo de movimento atual: "full" ou "reduced".
 * Ordem de decisão: ?motion= na URL > preferência do sistema.
 * Também atualiza o <html> (data-motion e a classe rm) se o sistema mudar.
 */
export function useReducedMotionPref(): { mode: MotionMode; reduced: boolean } {
  const [mode, setMode] = useState<MotionMode>("full");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const m = resolveMotion(window.location.search, mq.matches);
      setMode(m);
      const root = document.documentElement;
      root.dataset.motion = m;
      root.classList.toggle("rm", m === "reduced");
    };
    apply();
    // se a URL forçou o modo, mudanças no sistema não valem
    if (motionOverride(window.location.search)) return;
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return { mode, reduced: mode === "reduced" };
}
