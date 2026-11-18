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
      {/* o vento fica no fundo da cena: acima do céu e das nuvens, ABAIXO da árvore, do morro, dos títulos,
          dos cartões e das peças 3D (nada de traço cruzando o conteúdo). Bem curto, suave e discreto */}
      <div className="wind" style={{ zIndex: Z.wind }} aria-hidden="true">
        <WindGusts count={mobile ? 2 : 5} seed={7} reduced={reduced} />
      </div>
    </>
  );
}
