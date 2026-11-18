"use client";
// Rajadas de vento: pequenos feixes de linhas finas e translúcidas (com uns
// grãos de poeira) que cruzam a tela de um lado a outro, de vez em quando.
// Só transform e opacity (animação em CSS, nada no JS por quadro).
// Movimento reduzido: as rajadas ficam paradas, bem discretas.
// As rajadas são sorteadas só no navegador (useEffect) para o HTML do servidor
// e o do cliente não divergirem.
import { useEffect, useState } from "react";

interface Gust {
  top: number;
  scale: number;
  dur: number;
  delay: number;
  rtl: boolean;
  rot: number;
  drift: number;
  alpha: number;
  /** posição parada (movimento reduzido), em vw */
  rest: number;
  lines: { y: number; x: number; len: number; bend: number; w: number; a: number }[];
  dust: { x: number; y: number; r: number }[];
}

/** gerador pseudoaleatório pequeno (mulberry32): o sorteio é repetível */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGusts(count: number, seed: number): Gust[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const n = 2 + Math.floor(r() * 2);
    const dur = 14 + r() * 10;
    return {
      top: 6 + ((i + r() * 0.8) / count) * 80,
      scale: 0.8 + r() * 0.6,
      dur,
      delay: -r() * dur,
      rtl: r() < 0.28,
      rot: -5 + r() * 10,
      drift: -40 + r() * 80,
      alpha: 0.22 + r() * 0.2,
      rest: 6 + r() * 70,
      lines: Array.from({ length: n }, () => ({
        y: 8 + r() * 28,
        x: r() * 24,
        // traços curtos, com uma curva leve (nada de ondas)
        len: 50 + r() * 70,
        bend: -3.5 + r() * 7,
        w: 0.55 + r() * 0.45,
        a: 0.4 + r() * 0.45,
      })),
      dust: Array.from({ length: 1 + Math.floor(r() * 2) }, () => ({ x: 14 + r() * 140, y: 8 + r() * 28, r: 0.5 + r() * 0.5 })),
    };
  });
}

function GustShape({ g, id }: { g: Gust; id: string }) {
  return (
    <svg className="gust-svg" width={180} height={44} viewBox="0 0 180 44" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity="0" />
          <stop offset="0.35" stopColor="currentColor" stopOpacity="0.9" />
          <stop offset="0.75" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {g.lines.map((l, i) => (
        <path
          key={i}
          d={`M${l.x} ${l.y} C ${l.x + l.len * 0.3} ${l.y - l.bend}, ${l.x + l.len * 0.65} ${l.y + l.bend}, ${l.x + l.len} ${l.y + l.bend * 0.3}`}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={l.w}
          strokeLinecap="round"
          opacity={l.a}
        />
      ))}
      {g.dust.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="currentColor" opacity={0.3} />
      ))}
    </svg>
  );
}

export interface WindGustsProps {
  count: number;
  seed: number;
  reduced: boolean;
}

export default function WindGusts({ count, seed, reduced }: WindGustsProps) {
  const [gusts, setGusts] = useState<Gust[]>([]);
  useEffect(() => setGusts(makeGusts(count, seed)), [count, seed]);
  return (
    <>
      {gusts.map((g, i) => (
        <div
          key={i}
          className={`gust ${g.rtl ? "gust-l" : "gust-r"}${reduced ? " gust-still" : ""}`}
          style={
            {
              top: `${g.top}%`,
              opacity: reduced ? g.alpha * 0.35 : undefined,
              ["--dur" as string]: `${g.dur.toFixed(2)}s`,
              ["--delay" as string]: `${g.delay.toFixed(2)}s`,
              ["--drift" as string]: `${g.drift.toFixed(0)}px`,
              ["--alpha" as string]: g.alpha.toFixed(2),
              ["--rest" as string]: `${g.rest.toFixed(0)}vw`,
            } as React.CSSProperties
          }
        >
          <div className="gust-in" style={{ transform: `rotate(${g.rot.toFixed(1)}deg) scale(${g.scale.toFixed(2)}${g.rtl ? ", 1" : ""})` }}>
            <GustShape g={g} id={`wg-${seed}-${i}`} />
          </div>
        </div>
      ))}
    </>
  );
}
