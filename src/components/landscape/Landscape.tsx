"use client";
// Paisagem de fundo: gradiente do céu + camadas de foto empilhadas (2.5D).
// Tudo é position: fixed com z-index negativo, intercalado com o conteúdo:
// o nome do hero (z -24) fica entre "far" e "front", então o morro passa
// na frente das letras. As camadas só recebem transform (barato: a GPU
// só move texturas prontas, sem repintar).
import Image from "next/image";
import { useRef } from "react";
import { FRAME, GROUND, LAYERS, Z, cameraAt } from "@/lib/landscape";
import { M, bus, pointer } from "@/lib/scroll-engine";
import { useScrollFrame } from "@/hooks/useScrollFrame";

export default function Landscape() {
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tintGold = useRef<HTMLDivElement>(null);
  const tintDusk = useRef<HTMLDivElement>(null);
  const drift = useRef<HTMLDivElement>(null);
  const cur = useRef({ x: 0, y: 0 });
  const last = useRef("");

  useScrollFrame((s) => {
    const { vh, vw, dt, reduced } = s;
    // cursor suavizado (-1..1)
    const tx = !reduced && pointer.seen ? (pointer.x / vw) * 2 - 1 : 0;
    const ty = !reduced && pointer.seen ? (pointer.y / vh) * 2 - 1 : 0;
    const k = 1 - Math.exp(-dt * 2.4);
    cur.current.x += (tx - cur.current.x) * k;
    cur.current.y += (ty - cur.current.y) * k;

    // descida na Stack: põe a borda grama/terra exatamente no chão da árvore
    const groundFrac = bus.stackGround ?? 0.5;
    const descent = 1 + FRAME.bleed + GROUND.greenVh / 100 - groundFrac;
    const cam = cameraAt(s.y, M, vh, descent);

    const key = `${document.documentElement.dataset.theme}|${s.y.toFixed(1)}|${cur.current.x.toFixed(4)}|${cur.current.y.toFixed(4)}|${vh}|${groundFrac.toFixed(4)}`;
    if (key === last.current) return;
    last.current = key;

    // tema e anoitecer escurecem as fotos com filtro (aplicado pela GPU, sem repintar)
    const dark = document.documentElement.dataset.theme === "dark";
    const d = cam.dusk;
    const filter =
      (dark ? "brightness(0.5) saturate(0.78) hue-rotate(-10deg) contrast(1.06) " : "") +
      (d > 0.001 ? `brightness(${(1 - 0.22 * d).toFixed(3)}) saturate(${(1 - 0.2 * d).toFixed(3)}) sepia(${(0.28 * d).toFixed(3)}) hue-rotate(${(-12 * d).toFixed(2)}deg)` : "");
    LAYERS.forEach((L, i) => {
      const el = layerRefs.current[i];
      if (!el) return;
      // movimento reduzido: tudo anda junto (sem paralaxe), como uma página rolando
      const depth = reduced ? 1 : L.depth;
      const y = -cam.y * depth * vh - cur.current.y * L.mouse * 0.5;
      const x = -cur.current.x * L.mouse;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (L.id === "sky") el.style.opacity = cam.sky.toFixed(3);
      el.style.filter = filter || "none";
    });
    if (drift.current) drift.current.style.opacity = (cam.sky * 0.9).toFixed(3);
    cam.bg.forEach((w, i) => {
      const el = bgRefs.current[i];
      if (el && i > 0) el.style.opacity = w.toFixed(3);
    });
    if (tintGold.current) tintGold.current.style.opacity = (cam.gold * (1 - cam.dusk) * 0.28).toFixed(3);
    if (tintDusk.current) tintDusk.current.style.opacity = (cam.dusk * 0.42).toFixed(3);
  }, -10);

  const bleed = `${-FRAME.bleed * 100}%`;
  return (
    <div className="landscape" aria-hidden="true">
      {/* gradiente de fundo: cada fase do dia é uma camada que aparece por cima da anterior */}
      {(["sky", "cloud", "gold", "dusk"] as const).map((id, i) => (
        <div
          key={id}
          ref={(el) => {
            bgRefs.current[i] = el;
          }}
          className={`ls-bg ls-bg-${id}`}
          style={{ zIndex: Z.bg, opacity: i === 0 ? 1 : 0 }}
        />
      ))}
      {LAYERS.map((L, i) => (
        <div
          key={L.id}
          ref={(el) => {
            layerRefs.current[i] = el;
          }}
          className={`ls-layer ls-${L.id}`}
          style={{ zIndex: L.z, inset: bleed }}
        >
          <Image
            src={L.src}
            alt=""
            fill
            sizes="112vw"
            quality={80}
            priority={L.id === "sky" || L.id === "front"}
            style={{ objectFit: "cover", objectPosition: FRAME.position }}
          />
          {L.id === "sky" && (
            // nuvens passando devagar sobre o céu (a mesma textura da transição)
            <div ref={drift} className="ls-drift" style={{ zIndex: 1 }}>
              <span />
              <span />
            </div>
          )}
          {L.id === "grass" && (
            // abaixo da foto: o verde continua e vira terra, onde a árvore da Stack põe as raízes
            <div className="ls-ground" style={{ ["--green" as string]: `${GROUND.greenVh}vh` }}>
              <div className="ls-green" />
              <div className="ls-soil" />
            </div>
          )}
        </div>
      ))}
      <div ref={tintGold} className="ls-tint ls-tint-gold" style={{ zIndex: Z.tint }} />
      <div ref={tintDusk} className="ls-tint ls-tint-dusk" style={{ zIndex: Z.tint }} />
    </div>
  );
}
