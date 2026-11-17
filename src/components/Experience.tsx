"use client";
// Liga as partes "vivas" da página depois que o conteúdo já está na tela:
// rolagem suave, cursor, nuvens de transição e as folhas 3D.
// As folhas só baixam depois da primeira interação (ou de um tempo ocioso no
// desktop), para não pesar no carregamento.
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { enableSmoothScroll, requestMeasure, state } from "@/lib/scroll-engine";
import { Z } from "@/lib/landscape";
import { useReducedMotionPref } from "@/hooks/useReducedMotionPref";
import { hasWebGL } from "./three/assets";
import Cursor from "./ui/Cursor";
import CloudVeil from "./landscape/CloudVeil";
import ErrorBoundary from "./ui/ErrorBoundary";

const LeafField = dynamic(() => import("./three/LeafField"), { ssr: false });

export default function Experience() {
  const { reduced } = useReducedMotionPref();
  const [leaves, setLeaves] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    state.reduced = reduced;
    requestMeasure();
    if (!reduced) enableSmoothScroll();
  }, [reduced]);

  useEffect(() => {
    const coarse = matchMedia("(pointer: coarse)").matches;
    setMobile(window.innerWidth < 700 || coarse);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      cleanup();
      if (hasWebGL()) setLeaves(true);
    };
    const evs = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    evs.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
    // no desktop, entra sozinho depois de um tempo ocioso
    const timer = coarse ? null : setTimeout(go, 3500);
    function cleanup() {
      evs.forEach((e) => window.removeEventListener(e, go));
      if (timer) clearTimeout(timer);
    }
    return cleanup;
  }, []);

  const back = mobile ? 16 : 46;
  const front = mobile ? 2 : 5;
  return (
    <>
      <Cursor />
      <CloudVeil />
      {leaves && (
        <ErrorBoundary>
          <div className="leaves" style={{ zIndex: Z.leavesBack }} aria-hidden="true">
            <LeafField layer="back" count={reduced ? 8 : back} reduced={reduced} />
          </div>
          {!reduced && (
            <div className="leaves" style={{ zIndex: 44 }} aria-hidden="true">
              <LeafField layer="front" count={front} reduced={false} />
            </div>
          )}
        </ErrorBoundary>
      )}
    </>
  );
}
