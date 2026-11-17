"use client";
import { useEffect, useRef } from "react";
import { onMeasure, subscribe, type FrameState } from "@/lib/scroll-engine";

/** roda cb a cada quadro do motor de rolagem (escreva estilos direto no DOM) */
export function useScrollFrame(cb: (s: FrameState) => void, prio = 0) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => subscribe((s) => ref.current(s), prio), [prio]);
}

/** roda cb quando o layout muda (resize, fontes, primeira montagem) */
export function useMeasure(cb: (s: FrameState) => void, prio = 0) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => onMeasure((s) => ref.current(s), prio), [prio]);
}
