"use client";
// Liga as partes "vivas" da página depois que o conteúdo já está na tela:
// rolagem suave, cursor, as rajadas de vento.
import { useEffect, useState } from "react";
import { enableSmoothScroll, requestMeasure, state } from "@/lib/scroll-engine";
import { Z } from "@/lib/landscape";
import { useReducedMotionPref } from "@/hooks/useReducedMotionPref";
import Cursor from "./ui/Cursor";
import WindGusts from "./landscape/WindGusts";

export default function Experience() {
  const { reduced } = useReducedMotionPref();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    state.reduced = reduced;
    requestMeasure();
    if (!reduced) enableSmoothScroll();
  }, [reduced]);

  useEffect(() => {
    setMobile(window.innerWidth < 700 || matchMedia("(pointer: coarse)").matches);
  }, []);

  return (
    <>
      <Cursor />
      {/* atrás do morro e na frente do conteúdo (bem sutis, não atrapalham a leitura) */}
      <div className="wind" style={{ zIndex: Z.leavesBack }} aria-hidden="true">
        <WindGusts count={mobile ? 3 : 6} seed={7} reduced={reduced} />
      </div>
      <div className="wind" style={{ zIndex: 44 }} aria-hidden="true">
        <WindGusts count={mobile ? 1 : 3} seed={31} reduced={reduced} />
      </div>
    </>
  );
}
