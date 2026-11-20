"use client";
// Paisagem de fundo: UMA subida contínua. Rolar a página sobe a câmera:
// o morro (far/front/grass) desce e sai de cena pelo Sobre, nuvens persistentes
// ficam de fundo (densas no Sobre/Stack, só um mar dourado em Projetos) e o
// fundo de cor segue uma única curva de altitude até o espaço.
// Tudo é position: fixed com z-index negativo, intercalado com o conteúdo:
// o nome do hero (z -24) fica entre "far" e "front", então o morro passa
// na frente das letras. As camadas só recebem transform/opacity (a GPU só move
// texturas prontas, sem repintar).
import Image from "next/image";
import { useRef } from "react";
import { CLOUD_LAYERS, CLOUD_SRC, FRAME, HERO_HILL, LAYERS, Z, cameraAt } from "@/lib/landscape";
import { M, pointer } from "@/lib/scroll-engine";
import { clamp } from "@/lib/math";
import { useScrollFrame } from "@/hooks/useScrollFrame";

const BG = ["sky", "gold", "dusk", "deep", "space"] as const;

export default function Landscape() {
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cloudBox = useRef<HTMLDivElement>(null);
  const cloudRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stars = useRef<HTMLDivElement>(null);
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

    const cam = cameraAt(s.y, M, vh);
    const dark = document.documentElement.dataset.theme === "dark";
    // o fundo nunca fica parado: além da rolagem, o céu e as nuvens têm uma deriva lenta no tempo (~15 quadros/s)
    const tick = reduced ? 0 : Math.floor(s.t * 15);
    const key = `${dark}|${s.y.toFixed(1)}|${cur.current.x.toFixed(4)}|${cur.current.y.toFixed(4)}|${vh}|${reduced}|${tick}`;
    if (key === last.current) return;
    last.current = key;

    // tema noturno escurece as fotos com filtro (aplicado pela GPU, sem repintar)
    const photoFilter = dark ? "brightness(0.5) saturate(0.78) hue-rotate(-10deg) contrast(1.06)" : "none";
    LAYERS.forEach((L, i) => {
      const el = layerRefs.current[i];
      if (!el) return;
      const x = -cur.current.x * L.mouse;
      if (L.id === "sky") {
        // o céu é o plano mais distante: desce bem devagar, sem parar, até as nuvens (~10% da tela no máximo,
        // dentro da sobra de 12% do quadro, então a borda nunca aparece). A deriva lateral é só a do tempo
        // (minúscula); a que seguia a rolagem foi tirada: ela empurrava o céu de lado quando a foto acabava
        const t = clamp(cam.hill / 0.8);
        const late = clamp((cam.alt - 0.5) / 1.6);
        const rise = reduced ? 0 : ((1 - (1 - t) * (1 - t)) * 0.04 + late * 0.06) * vh;
        const slide = reduced ? 0 : Math.sin(s.t * 0.11) * 0.008 * vw * (1 - late);
        el.style.transform = `translate3d(${(x + slide).toFixed(2)}px, ${(rise - cur.current.y * L.mouse * 0.5).toFixed(2)}px, 0)`;
        el.style.opacity = cam.sky.toFixed(3);
      } else if (reduced) {
        // movimento reduzido: o morro some num crossfade (sem se mover)
        el.style.transform = "none";
        el.style.opacity = clamp(1 - (cam.hill - HERO_HILL) / 0.9).toFixed(3);
      } else {
        const y = cam.hill * L.depth * vh - cur.current.y * L.mouse * 0.5;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
        el.style.opacity = "1";
      }
      el.style.filter = photoFilter;
      el.style.visibility = el.style.opacity === "0.000" ? "hidden" : "visible";
    });

    // nuvens persistentes: descem enquanto a câmera sobe (paralaxe por camada); parado se reduzido
    if (cloudBox.current) {
      cloudBox.current.style.visibility = cam.clouds > 0.003 ? "visible" : "hidden";
      // douradas em Projetos (luz do fim de tarde sobre o mar de nuvens)
      // tons das nuvens: o sol de fim de tarde acende o topo (creme/dourado) e deixa as sombras
      // rosadas, nunca marrons ou oliva (por isso sem sepia forte); à noite ficam azuladas, de luar
      const g = Math.round(cam.gilt * 50) / 50;
      const warm = g > 0.01 ? `hue-rotate(${((dark ? 24 : 9) * g).toFixed(1)}deg) sepia(${((dark ? 0.16 : 0.3) * g).toFixed(3)}) saturate(${(1 + (dark ? 0.5 : 0.7) * g).toFixed(3)}) brightness(${(1 + 0.04 * g).toFixed(3)})` : "";
      cloudBox.current.style.filter = (dark ? "brightness(0.58) saturate(0.92) " : "") + warm;
    }
    CLOUD_LAYERS.forEach((L, i) => {
      const el = cloudRefs.current[i];
      if (!el) return;
      // (a posição vertical segue a altitude, como antes, para o mar de nuvens de Projetos não mudar) + uma deriva
      // lateral ligada à rolagem e ao tempo: entre o Sobre e a Stack o fundo não fica mais parado
      const shift = reduced ? 0 : (cam.alt - 1.6) * L.speed;
      const drift = reduced ? 0 : (cam.alt * L.speed * 0.06 + Math.sin(s.t * (0.07 + i * 0.015) + i * 1.7) * (1.4 + i * 0.5)) * (vw / 100);
      el.style.transform = `translate3d(${(-cur.current.x * 6 * (i + 1) + drift).toFixed(2)}px, ${shift.toFixed(2)}vh, 0)`;
      el.style.opacity = (cam.clouds * L.opacity * (L.dense ? cam.dense : 1)).toFixed(3);
    });

    // cor do body = a mesma curva de altitude (nunca azul-claro chapado atrás das camadas)
    const root = document.documentElement.style;
    root.setProperty("--wind", cam.wind.toFixed(3));
    root.setProperty("--wind-vis", cam.wind > 0.003 ? "visible" : "hidden");
    cam.bg.forEach((w, i) => root.setProperty(`--alt-w${i + 1}`, `${(w * 100).toFixed(1)}%`));

    // fundo: cada fase é uma camada que aparece por cima da anterior (o céu é a base). O dourado só faz
    // crossfade; o anoitecer, o azul profundo e o espaço DESCEM: a borda suave da nova cor avança de cima
    // para baixo (o topo escurece primeiro), em vez de a tela inteira escurecer de uma vez
    const band = vh * 0.6;
    // a barra escurece quando o topo da tela já está no azul da noite: cobertura, em y = 0, das camadas que
    // descem (anoitecer, azul profundo, espaço). Troca de uma vez (0/1) e o CSS faz a transição no tempo,
    // então a barra nunca fica num cinza intermediário nem vira uma faixa clara sobre o céu escuro
    const topCover = Math.max(...cam.bg.slice(1).map((w) => (reduced ? w : clamp((w * (vh + band)) / band))));
    root.setProperty("--nav-dark", topCover > 0.35 ? "1" : "0");
    cam.bg.forEach((w, i) => {
      const el = bgRefs.current[i + 1];
      if (!el) return;
      if (i === 0 || reduced) {
        el.style.opacity = w.toFixed(3);
        el.style.transform = "none";
        el.style.maskImage = "none";
        el.style.webkitMaskImage = "none";
        const fill = el.firstElementChild as HTMLElement | null;
        if (fill) fill.style.transform = "none";
        return;
      }
      el.style.opacity = w > 0.001 ? "1" : "0";
      el.style.height = `${(vh + band).toFixed(0)}px`;
      const mk = `linear-gradient(to top, transparent 0, #000 ${band.toFixed(0)}px)`;
      el.style.maskImage = mk;
      el.style.webkitMaskImage = mk;
      const wt = (w - 1) * (vh + band);
      el.style.transform = `translate3d(0, ${wt.toFixed(1)}px, 0)`;
      const fill = el.firstElementChild as HTMLElement | null;
      if (fill) {
        fill.style.height = `${vh}px`;
        fill.style.transform = `translate3d(0, ${(-wt).toFixed(1)}px, 0)`;
      }
    });
    if (stars.current) {
      stars.current.style.opacity = cam.stars.toFixed(3);
      stars.current.style.transform = reduced ? "none" : `translate3d(0, ${((cam.alt - 4.2) * 2).toFixed(2)}vh, 0)`;
    }
  }, -10);

  const bleed = `${-FRAME.bleed * 100}%`;
  return (
    <div className="landscape" aria-hidden="true">
      {BG.map((id, i) => (
        <div
          key={id}
          ref={(el) => {
            bgRefs.current[i] = el;
          }}
          className={`ls-bg ls-bg-${id}${i >= 2 ? " ls-rise" : ""}`}
          style={{ zIndex: Z.bg, opacity: i === 0 ? 1 : 0 }}
        >
          {i >= 2 ? <div className="ls-fill" /> : null}
        </div>
      ))}
      <div ref={stars} className="ls-stars" style={{ zIndex: Z.stars }} />
      {LAYERS.map((L, i) => (
        <div
          key={L.id}
          ref={(el) => {
            layerRefs.current[i] = el;
          }}
          className={`ls-layer ls-${L.id}`}
          style={{ zIndex: L.z, inset: L.id === "sky" ? "-12%" : bleed }}
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
        </div>
      ))}
      <div ref={cloudBox} className="ls-clouds" style={{ zIndex: Z.clouds, visibility: "hidden" }}>
        {CLOUD_LAYERS.map((L, i) => (
          <div
            key={i}
            ref={(el) => {
              cloudRefs.current[i] = el;
            }}
            className="ls-cloud"
            style={{ bottom: `${L.bottom}%`, opacity: 0, ["--s" as string]: L.scale, ["--x" as string]: L.x }}
          >
            <div
              className="ls-cloud-img"
              style={{ backgroundImage: `url(${CLOUD_SRC})`, transform: `scale(${L.mirror ? -1 : 1}, ${L.sy})`, ["--blur" as string]: `${L.blur}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
