"use client";
import { useEffect, type RefObject } from "react";
import { M, registerSection, type SectionId } from "@/lib/scroll-engine";
import { clamp } from "@/lib/math";

/** registra a seção no motor (ele mede topo e altura a cada resize) */
export function useSection(id: SectionId, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ref.current) return;
    return registerSection(id, ref.current);
  }, [id, ref]);
}

/**
 * Progresso 0..1 de um capítulo preso: 0 quando o topo encosta no topo da
 * tela, 1 quando o fim do capítulo chega no fim da tela.
 */
export function sectionProgress(id: SectionId, y: number, vh: number) {
  const m = M[id];
  if (!m) return 0;
  return clamp((y - m.top) / Math.max(1, m.h - vh));
}
