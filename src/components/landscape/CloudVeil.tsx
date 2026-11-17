"use client";
// Transição de nuvens entre seções (Sobre→Stack e Projetos→Jornada).
// Dois bancos de nuvem sobem pela tela em velocidades diferentes (paralaxe),
// cobrem tudo por um instante e abrem para a seção seguinte. Enquanto a tela
// está coberta, a paisagem troca de enquadramento sem ninguém ver o "corte".
// Cada banco = borda fofa (imagem) + miolo sólido + borda fofa invertida.
// Movimento reduzido: só um véu branco que aparece e some (crossfade).
import { useRef } from "react";
import { CLOUD_SPAN, cloudCenters } from "@/lib/landscape";
import { M } from "@/lib/scroll-engine";
import { clamp, sstep } from "@/lib/math";
import { useScrollFrame } from "@/hooks/useScrollFrame";

const BANKS = [
  { cls: "cv-bank cv-back", speed: 0.88, lag: 0.04 },
  { cls: "cv-bank cv-front", speed: 1.12, lag: -0.03 },
];

export default function CloudVeil() {
  const banks = useRef<(HTMLDivElement | null)[]>([]);
  const veil = useRef<HTMLDivElement>(null);
  const haze = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useScrollFrame((s) => {
    if (!s.changed) return;
    const { vh, y } = s;
    const span = CLOUD_SPAN * vh;
    // qual travessia está ativa (a mais próxima)
    let p = -1;
    for (const c of cloudCenters(M, vh)) {
      const k = (y - (c - span / 2)) / span;
      if (k > -0.05 && k < 1.05) p = clamp(k);
    }
    const on = p > 0 && p < 1;
    if (wrap.current) wrap.current.style.visibility = on ? "visible" : "hidden";
    if (!on) return;
    if (s.reduced) {
      if (veil.current) veil.current.style.opacity = Math.sin(Math.PI * p).toFixed(3);
      return;
    }
    // entrada e saída graduais: os bancos nascem do véu de névoa e se dissolvem de volta nele
    const fade = sstep(clamp(p / 0.34)) * (1 - sstep(clamp((p - 0.7) / 0.3)));
    if (haze.current) {
      // névoa que sobe antes das nuvens (sem borda): o céu esbranquiça aos poucos
      const hy = vh * (1 - 1.5 * clamp((p + 0.05) / 0.62));
      haze.current.style.transform = `translate3d(0, ${hy.toFixed(1)}px, 0)`;
      haze.current.style.opacity = (sstep(clamp(p / 0.3)) * (1 - sstep(clamp((p - 0.8) / 0.2)))).toFixed(3);
    }
    banks.current.forEach((el, i) => {
      if (!el) return;
      const b = BANKS[i];
      el.style.opacity = (fade * (i === 0 ? 0.96 : 1)).toFixed(3);
      const h = el.offsetHeight;
      // de baixo da tela (vh) até sumir em cima (-h); o miolo cobre a tela no meio
      const t = clamp((p - 0.5) * b.speed + 0.5 + b.lag);
      const ty = vh - t * (vh + h);
      el.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0)`;
    });
  }, 5);

  return (
    <div ref={wrap} className="cloud-veil" aria-hidden="true">
      <div ref={haze} className="cv-haze" />
      {BANKS.map((b, i) => (
        <div
          key={i}
          ref={(el) => {
            banks.current[i] = el;
          }}
          className={b.cls}
        >
          <i className="cv-edge" />
          <i className="cv-core" />
          <i className="cv-edge cv-flip" />
        </div>
      ))}
      <div ref={veil} className="cv-veil" />
    </div>
  );
}
