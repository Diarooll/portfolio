"use client";
// Meteoro do Contato: um por vez, a cada 8 a 14 s. Nasce pequeno e distante
// perto do centro-direita do céu e vem na direção de quem olha (perspectiva:
// cresce e acelera), com cabeça branco-quente e cauda fina em degradê. Some antes
// de ficar grande. Fica atrás do conteúdo (z-index negativo), sem pegar clique.
// Só desenha quando o Contato está perto da tela; com movimento reduzido, um
// traço estático sutil. Canvas 2D, sem bibliotecas.
import { useEffect, useRef, type RefObject } from "react";
import { clamp, sstep } from "@/lib/math";

const DURATION = 2300; // ms de cada passagem
const GAP: [number, number] = [8000, 14000];

export default function Meteor({ target }: { target: RefObject<Element | null> }) {
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = cv.current;
    const host = target.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;
    const reduced = document.documentElement.dataset.motion === "reduced" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let timer = 0;
    let active = false;
    let start = -1; // início da passagem atual (-1 = esperando)
    let vp = { x: 0, y: 0 };
    let dir = { x: 0, y: 0 };

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** desenha um meteoro: (hx,hy) cabeça, r raio, (tx,ty) ponta da cauda, a opacidade */
    const draw = (hx: number, hy: number, r: number, tx: number, ty: number, a: number) => {
      const dx = tx - hx;
      const dy = ty - hy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * r;
      const ny = (dx / len) * r;
      ctx.globalAlpha = a;
      // cauda: triângulo afinando até a ponta, degradê laranja -> azul-claro -> transparente
      const g = ctx.createLinearGradient(hx, hy, tx, ty);
      g.addColorStop(0, "rgba(255,244,225,0.95)");
      g.addColorStop(0.18, "rgba(255,170,90,0.7)");
      g.addColorStop(0.6, "rgba(150,200,255,0.28)");
      g.addColorStop(1, "rgba(150,200,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(hx + nx, hy + ny);
      ctx.lineTo(tx, ty);
      ctx.lineTo(hx - nx, hy - ny);
      ctx.closePath();
      ctx.fill();
      // cabeça: brilho suave (levemente borrado) + núcleo branco-quente
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 3.2);
      hg.addColorStop(0, "rgba(255,252,240,0.95)");
      hg.addColorStop(0.3, "rgba(255,200,130,0.45)");
      hg.addColorStop(1, "rgba(255,160,90,0)");
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(hx, hy, r * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const pick = () => {
      vp = { x: w * (0.6 + Math.random() * 0.18), y: h * (0.16 + Math.random() * 0.14) };
      // para a esquerda e para baixo, como se viesse do fundo do céu
      dir = { x: -(0.07 + Math.random() * 0.04) * w, y: (0.06 + Math.random() * 0.04) * h };
    };

    const frame = (now: number) => {
      raf = 0;
      if (!active) return;
      ctx.clearRect(0, 0, w, h);
      if (start >= 0) {
        const t = clamp((now - start) / DURATION);
        // z: 1 (longe) -> 0.34 (perto), acelerando
        const z = 1 - 0.66 * t * t;
        const px = vp.x + dir.x / z - dir.x;
        const py = vp.y + dir.y / z - dir.y;
        // ponta da cauda: onde a cabeça estava um instante antes (alonga com a velocidade)
        const back = 0.1 + 0.2 * t;
        const tz = 1 - 0.66 * Math.max(0, t - back) * Math.max(0, t - back);
        const tx = vp.x + dir.x / tz - dir.x;
        const ty = vp.y + dir.y / tz - dir.y;
        const r = 1.1 / z + 0.6;
        // surge e some com suavidade; some antes de ficar grande
        const a = sstep(clamp(t / 0.12)) * (1 - sstep(clamp((t - 0.66) / 0.3)));
        draw(px, py, r, tx, ty, a);
        if (t >= 1) {
          start = -1;
          ctx.clearRect(0, 0, w, h);
          schedule();
        }
      }
      raf = requestAnimationFrame(frame);
    };

    const schedule = (first = false) => {
      clearTimeout(timer);
      timer = window.setTimeout(
        () => {
          if (!active || document.hidden) return schedule();
          pick();
          start = performance.now();
          if (!raf) raf = requestAnimationFrame(frame);
        },
        first ? 1200 : GAP[0] + Math.random() * (GAP[1] - GAP[0]),
      );
    };

    const setActive = (on: boolean) => {
      if (on === active) return;
      active = on;
      canvas.style.opacity = on ? "1" : "0";
      if (reduced) {
        // um traço estático e discreto
        if (on) {
          size();
          ctx.clearRect(0, 0, w, h);
          ctx.globalAlpha = 0.5;
          const x = w * 0.72;
          const y = h * 0.2;
          const g = ctx.createLinearGradient(x, y, x - w * 0.09, y + h * 0.07);
          g.addColorStop(0, "rgba(255,244,225,0.8)");
          g.addColorStop(0.4, "rgba(255,170,90,0.35)");
          g.addColorStop(1, "rgba(150,200,255,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - w * 0.09, y + h * 0.07);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        return;
      }
      if (on) {
        size();
        schedule(true);
      } else {
        clearTimeout(timer);
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        start = -1;
        ctx.clearRect(0, 0, w, h);
      }
    };

    // ativo só quando a seção está perto da tela
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "0px 0px -35% 0px" });
    io.observe(host);
    const onResize = () => active && size();
    window.addEventListener("resize", onResize);
    return () => {
      io.disconnect();
      window.removeEventListener("resize", onResize);
      clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);

  return <canvas ref={cv} className="meteor" aria-hidden="true" />;
}
