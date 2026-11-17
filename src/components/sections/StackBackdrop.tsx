"use client";
// Fundo da Stack: céu azul claro com bancos de nuvens em camadas. Cada camada
// anda numa velocidade com a rolagem (parallax, só transform). Com movimento
// reduzido fica parado. Trocar a foto = mudar STACK_BACKGROUND em src/content/stack.ts.
import { useRef } from "react";
import { STACK_BACKGROUND } from "@/content/stack";
import { M } from "@/lib/scroll-engine";
import { clamp } from "@/lib/math";
import { useScrollFrame } from "@/hooks/useScrollFrame";
import styles from "./Stack.module.css";

export default function StackBackdrop() {
  const layers = useRef<(HTMLDivElement | null)[]>([]);
  const last = useRef(-1);

  useScrollFrame((s) => {
    if (!s.changed) return;
    const m = M.stack;
    if (!m) return;
    // 0 quando a Stack entra por baixo, 1 quando ela sai por cima
    const p = s.reduced ? 0.5 : clamp((s.y - (m.top - s.vh)) / Math.max(1, m.h + s.vh));
    if (Math.abs(p - last.current) < 0.0005) return;
    last.current = p;
    STACK_BACKGROUND.layers.forEach((L, i) => {
      const el = layers.current[i];
      if (el) el.style.transform = `translate3d(0, ${((0.5 - p) * L.speed).toFixed(3)}vh, 0)`;
    });
  });

  const [a, b, c] = STACK_BACKGROUND.sky;
  return (
    <div className={styles.backdrop} style={{ background: `linear-gradient(to bottom, ${a}, ${b} 55%, ${c})` }} aria-hidden="true">
      {STACK_BACKGROUND.layers.map((L, i) => (
        <div
          key={i}
          ref={(el) => {
            layers.current[i] = el;
          }}
          className={styles.cloudLayer}
          style={{ bottom: `${L.bottom}%`, opacity: L.opacity, ["--s" as string]: L.scale }}
        >
          <div className={styles.cloudImg} style={{ backgroundImage: `url(${STACK_BACKGROUND.clouds})`, transform: L.mirror ? "scaleX(-1)" : undefined }} />
        </div>
      ))}
    </div>
  );
}
