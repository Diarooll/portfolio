"use client";
// Passarinho pousado no galho. Pisca, inclina a cabeça, dá pulinhos de vez em
// quando, olha para o cursor e, ao clicar (ou Enter/Espaço), canta (marcas
// visuais, sem som) e bate as asas. Com movimento reduzido: só pisca devagar
// e inclina a cabeça quando você interage.
import { useEffect, useRef } from "react";
import { clamp } from "@/lib/math";

interface Props {
  label: string;
  /** inclinação do galho onde ele está (px/px), para pular acompanhando o galho */
  slope: number;
}

export default function Bird({ label, slope }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const bird = useRef<SVGGElement>(null);
  const head = useRef<SVGGElement>(null);
  const hop = useRef<SVGGElement>(null);
  const flip = useRef<SVGGElement>(null);
  const wing = useRef<SVGPathElement>(null);
  const slopeRef = useRef(slope);
  slopeRef.current = slope;
  const act = useRef<() => void>(() => {});

  useEffect(() => {
    const b = bird.current;
    const hd = head.current;
    const hp = hop.current;
    const fl = flip.current;
    const wg = wing.current;
    const per = wrap.current;
    if (!b || !hd || !hp || !fl || !wg || !per) return;
    const RM = document.documentElement.dataset.motion === "reduced";
    const BS = { x: 0, look: false, busy: false, face: 1 };
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, a: number, c: number) => timers.push(setTimeout(fn, a + Math.random() * (c - a)));
    const slopeY = (x: number) => x * slopeRef.current;
    const tiltTo = (deg: number) => (hd.style.transform = `rotate(${deg.toFixed(1)}deg)`);
    const faceTo = (f: number) => {
      if (f !== BS.face) {
        BS.face = f;
        fl.style.transform = f < 0 ? "scaleX(-1)" : "";
      }
    };
    const blinkLoop = () => {
      if (!document.hidden) {
        b.classList.add("blink");
        setTimeout(() => b.classList.remove("blink"), 150);
      }
      later(blinkLoop, RM ? 5000 : 2600, RM ? 9000 : 6000);
    };
    const tiltLoop = () => {
      if (!BS.look && !BS.busy && !document.hidden) tiltTo((Math.random() - 0.55) * 26);
      later(tiltLoop, 2600, 5200);
    };
    const hopLoop = () => {
      if (!BS.look && !BS.busy && !document.hidden && hp.animate) {
        const nx = clamp(BS.x + (Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 16), -40, 40);
        const from = BS.x;
        const mid = (from + nx) / 2;
        faceTo(nx > from ? -1 : 1);
        BS.x = nx;
        hp.animate(
          [
            { transform: `translate(${from}px, ${slopeY(from)}px)` },
            { transform: `translate(${mid}px, ${slopeY(mid) - 12}px)` },
            { transform: `translate(${nx}px, ${slopeY(nx)}px)` },
          ],
          { duration: 420, easing: "ease-in-out", fill: "forwards" },
        );
      }
      later(hopLoop, 6500, 11000);
    };
    later(blinkLoop, 1200, 3000);
    if (!RM) {
      later(tiltLoop, 2000, 4000);
      later(hopLoop, 5000, 9000);
    }
    // olha para o cursor
    const move = (e: PointerEvent) => {
      if (RM || BS.busy) return;
      BS.look = true;
      const r = hd.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.abs(dx) > 14) faceTo(dx > 0 ? -1 : 1);
      tiltTo(clamp(-Math.atan2(dy, Math.abs(dx) + 1) * 57, -28, 28));
    };
    const leave = () => {
      BS.look = false;
      if (!RM) tiltTo(0);
    };
    const zone = per.closest(".branch") as HTMLElement | null;
    zone?.addEventListener("pointermove", move);
    zone?.addEventListener("pointerleave", leave);
    // canto (marcas visuais) e um voo curto
    act.current = () => {
      b.classList.remove("chirp");
      void b.getBBox();
      b.classList.add("chirp");
      setTimeout(() => b.classList.remove("chirp"), 1100);
      if (RM) {
        tiltTo(-12);
        setTimeout(() => tiltTo(0), 600);
        return;
      }
      if (BS.busy || !hp.animate) return;
      BS.busy = true;
      const x = BS.x;
      const y = slopeY(x);
      wg.animate(
        [0, -38, 6, -34, 4, -30, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
        { duration: 640, easing: "ease-in-out" },
      );
      const a = hp.animate(
        [
          { transform: `translate(${x}px, ${y}px)` },
          { transform: `translate(${x - 6}px, ${y - 22}px)` },
          { transform: `translate(${x + 4}px, ${y - 16}px)` },
          { transform: `translate(${x}px, ${y}px)` },
        ],
        { duration: 680, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)", fill: "forwards" },
      );
      a.onfinish = () => (BS.busy = false);
    };
    return () => {
      timers.forEach(clearTimeout);
      zone?.removeEventListener("pointermove", move);
      zone?.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={wrap} className="perch">
      <svg viewBox="-16 -8 128 92" focusable="false">
        <g
          ref={bird}
          className="bird"
          tabIndex={0}
          role="button"
          aria-label={label}
          onClick={() => act.current()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              act.current();
            }
          }}
        >
          <circle className="b-ring" cx="44" cy="44" r="52" />
          <rect x="-16" y="-8" width="128" height="92" fill="transparent" />
          <g ref={hop} className="b-hop">
            <g ref={flip} className="b-flip">
              <path className="b-tail" d="M70 54 L 108 66 L 104 76 L 64 64 Z" />
              <ellipse className="b-body" cx="46" cy="54" rx="31" ry="22" />
              <path className="b-belly" d="M20 58 C 26 74, 52 78, 68 64 C 56 72, 34 72, 20 58 Z" />
              <path ref={wing} className="b-wing" d="M40 46 C 58 40, 76 50, 82 62 C 66 66, 50 60, 40 46 Z" />
              <path className="b-legs" d="M40 74 L 37 81 M52 74 L 54 81" />
              <g ref={head} className="b-head">
                <circle className="b-hd" cx="24" cy="32" r="17" />
                <path className="b-cap" d="M10 26 C 14 14, 32 12, 40 22 C 30 18, 18 20, 10 26 Z" />
                <path className="b-beak" d="M8 32 L -7 35 L 8 38 Z" />
                <circle className="b-eye" cx="18" cy="29" r="3.2" />
                <circle className="b-hl" cx="17" cy="28" r="1" />
                <rect className="b-lid" x="14" y="25.5" width="8" height="7.5" rx="3" />
              </g>
              <g className="b-chirp">
                <path d="M-6 20 q -7 -5 0 -11" />
                <path d="M-14 16 q -11 -8 0 -19" />
                <path d="M-22 12 q -15 -11 0 -27" />
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
