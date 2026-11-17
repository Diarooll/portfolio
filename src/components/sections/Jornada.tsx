"use client";
// Jornada: marcos em zigue-zague ligados por uma raiz de madeira que cresce
// conforme a página desce. A raiz nasce embaixo da cena dos projetos, passa
// por trás do título e serpenteia entre os nós de cada marco.
// Desenho em SVG: o caminho é calculado uma vez (no resize) e só o
// stroke-dashoffset muda com a rolagem (barato).
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, lerp } from "@/lib/math";
import { M, docTop } from "@/lib/scroll-engine";
import { journey } from "@/content/journey";
import { pick } from "@/content/types";
import Dissolve from "@/components/ui/Dissolve";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";

type Pt = [number, number];
interface Chunk {
  a: number;
  b: number;
  paths: SVGPathElement[];
}
interface Rootlet {
  oi: number;
  el: SVGPathElement;
}
interface RootGeo {
  P: Pt[];
  L: number[];
  chunks: Chunk[];
  rootlets: Rootlet[];
  /** deslocamento do SVG em relação ao topo da seção (px, negativo = acima) */
  top: number;
}

const NS = "http://www.w3.org/2000/svg";
const d = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

export default function Jornada() {
  const t = useTranslations("jornada");
  const locale = useLocale();
  const section = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tip = useRef<SVGCircleElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const geo = useRef<RootGeo | null>(null);
  const offs = useRef<number[]>([]);
  const tl = useRef({ top: 0, h: 1 });
  const lastTi = useRef(-1);
  useSection("jornada", section);

  useMeasure((s) => {
    const sec = section.current;
    const sv = svg.current;
    const head = title.current;
    if (!sec || !sv || !head || !list.current) return;
    const { vw, vh } = s;
    tl.current = { top: docTop(list.current), h: Math.max(1, list.current.offsetHeight) };
    offs.current = items.current.map((li) => li?.offsetTop ?? 0);
    const sr = sec.getBoundingClientRect();
    const W = sr.width;
    const top = -0.5 * vh;
    const H = sec.offsetHeight - top;
    sv.setAttribute("viewBox", `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
    sv.style.top = `${top}px`;
    sv.style.height = `${H}px`;
    // coordenadas locais: (x, y) dentro do SVG
    const local = (el: Element): Pt => {
      const r = el.getBoundingClientRect();
      return [r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2 - top];
    };
    const knots = items.current.map((li) => local(li!.querySelector(".knot")!));
    const tr = head.getBoundingClientRect();
    const mob = vw < 860;
    const cx = mob ? (knots[0]?.[0] ?? 24) : W / 2;
    const tTop = tr.top - sr.top - top;
    const tBot = tr.bottom - sr.top - top;
    let a = 11;
    const r = () => {
      a = (a * 16807) % 2147483647;
      return (a - 1) / 2147483646;
    };
    const pts: Pt[] = [];
    const curve = (p: Pt, q: Pt, bulge: number, n: number) => {
      const dy = q[1] - p[1];
      for (let i = 1; i <= n; i++) {
        const tt = i / n;
        const u = 1 - tt;
        const c1 = [p[0] + bulge, p[1] + dy * 0.5];
        const c2 = [q[0] - bulge, q[1] - dy * 0.5];
        pts.push([
          u * u * u * p[0] + 3 * u * u * tt * c1[0] + 3 * u * tt * tt * c2[0] + tt * tt * tt * q[0],
          u * u * u * p[1] + 3 * u * u * tt * c1[1] + 3 * u * tt * tt * c2[1] + tt * tt * tt * q[1],
        ]);
      }
    };
    // nasce embaixo da cena dos projetos, desce até o título...
    const start: Pt = [cx, 0.12 * vh];
    const aboveT: Pt = [cx, tTop - 16];
    pts.push(start);
    curve(start, aboveT, mob ? 6 : 14, 24);
    const gapFrom = pts.length - 1;
    // ...passa por trás dele e serpenteia entre os marcos
    const belowT: Pt = [mob ? cx : W / 2, tBot + 20];
    pts.push(belowT);
    const gapTo = pts.length - 1;
    const anchors: Pt[] = [belowT, ...knots];
    const knotIdx: number[] = [];
    for (let i = 0; i < anchors.length - 1; i++) {
      curve(anchors[i], anchors[i + 1], (i % 2 ? -1 : 1) * (mob ? 14 : 46), 30);
      knotIdx.push(pts.length - 1);
    }
    // ondulação natural, perpendicular ao caminho
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    for (let i = 1; i < pts.length - 1; i++) {
      if (i >= gapFrom && i <= gapTo) continue;
      const dx = pts[i + 1][0] - pts[i - 1][0];
      const dy = pts[i + 1][1] - pts[i - 1][1];
      const dd = Math.hypot(dx, dy) || 1;
      const w = Math.sin(L[i] * 0.045) * 2.2 + Math.sin(L[i] * 0.013 + 1.7) * 3.5;
      pts[i] = [pts[i][0] - (dy / dd) * w, pts[i][1] + (dx / dd) * w];
    }
    // monta o SVG: pedaços com espessura caindo (a raiz afina), em 3 passadas
    sv.querySelectorAll("path").forEach((p) => p.remove());
    const total = L[L.length - 1] || 1;
    const w0 = mob ? 9 : 15;
    const w1 = mob ? 3 : 4.5;
    const segs: [number, number][] = [];
    const N = 12;
    const ranges: [number, number][] = [
      [0, gapFrom],
      [gapTo, pts.length - 1],
    ];
    ranges.forEach(([s0, s1]) => {
      const n = Math.max(1, Math.round((N * (L[s1] - L[s0])) / total));
      for (let k = 0; k < n; k++) segs.push([Math.round(lerp(s0, s1, k / n)), Math.round(lerp(s0, s1, (k + 1) / n))]);
    });
    const gRoot = sv.querySelector("g.jr-main")!;
    const gLets = sv.querySelector("g.jr-lets")!;
    const chunks: Chunk[] = segs
      .filter(([s0, s1]) => s1 > s0)
      .map(([s0, s1]) => {
        const w = lerp(w0, w1, L[s0] / total);
        const part = pts.slice(s0, s1 + 1);
        const paths = [
          { cls: "jr-bark", sw: w * 1.25, dx: 0 },
          { cls: "jr-wood", sw: w, dx: 0 },
          { cls: "jr-light", sw: w * 0.28, dx: -w * 0.22 },
        ].map(({ cls, sw, dx }) => {
          const p = document.createElementNS(NS, "path");
          p.setAttribute("d", d(part.map(([x, y]) => [x + dx, y])));
          p.setAttribute("class", cls);
          p.setAttribute("stroke-width", sw.toFixed(2));
          p.setAttribute("pathLength", "1");
          gRoot.appendChild(p);
          return p;
        });
        return { a: s0, b: s1, paths };
      });
    // raízes finas: algumas ao longo do caminho, duas em cada nó
    const rootlets: Rootlet[] = [];
    const sprout = (oi: number, side: number, len: number) => {
      const p = pts[oi];
      const q = pts[Math.min(pts.length - 1, oi + 1)];
      let an = Math.atan2(q[1] - p[1], q[0] - p[0]) + side * (0.7 + r() * 0.6);
      const seg: Pt[] = [p];
      let x = p[0];
      let y = p[1];
      for (let k = 1; k <= 7; k++) {
        an += (r() - 0.5) * 0.5 + side * 0.04;
        x += (Math.cos(an) * len) / 7;
        y += (Math.sin(an) * len) / 7;
        seg.push([x, y]);
      }
      const el = document.createElementNS(NS, "path");
      el.setAttribute("d", d(seg));
      el.setAttribute("class", "jr-let");
      el.setAttribute("stroke-width", (mob ? 2.2 : 2.8).toFixed(1));
      el.setAttribute("pathLength", "1");
      gLets.appendChild(el);
      rootlets.push({ oi, el });
    };
    for (let i = gapTo + 6; i < pts.length - 4; i += 9 + Math.floor(r() * 8)) sprout(i, r() < 0.5 ? -1 : 1, (mob ? 16 : 24) + r() * (mob ? 18 : 30));
    for (let i = 2; i < gapFrom - 2; i += 8) sprout(i, r() < 0.5 ? -1 : 1, 14 + r() * 18);
    knotIdx.forEach((ki) => {
      sprout(Math.max(1, ki - 2), -1, 18 + r() * 14);
      sprout(Math.max(1, ki - 1), 1, 14 + r() * 12);
    });
    geo.current = { P: pts, L, chunks, rootlets, top };
    lastTi.current = -1;
  });

  useScrollFrame((s) => {
    if (!s.changed) return;
    const m = M.jornada;
    const G = geo.current;
    if (!m || !G) return;
    const { y, vh, reduced: RM } = s;
    // marcos: acendem quando a "frente" da leitura passa por eles
    const reach = clamp((y + vh * 0.72 - tl.current.top) / tl.current.h);
    items.current.forEach((li, i) => {
      if (!li) return;
      const k = RM ? 1 : clamp((reach * tl.current.h - offs.current[i] + 24) / 90);
      li.style.opacity = (0.2 + 0.8 * k).toFixed(3);
      if (!RM) li.style.transform = `translate3d(0, ${((1 - k) * 14).toFixed(2)}px, 0)`;
      li.classList.toggle("on", k > 0.5);
    });
    // raiz: cresce até a linha a 72% da tela
    const target = y + vh * 0.72 - (m.top + G.top);
    const P = G.P;
    let ti = P.length - 1;
    if (!RM) {
      for (let i = 0; i < P.length; i++)
        if (P[i][1] >= target) {
          ti = i;
          break;
        }
      if (P[0][1] >= target) ti = 0;
    }
    if (ti === lastTi.current) return;
    lastTi.current = ti;
    const Lt = G.L[ti];
    G.chunks.forEach((c) => {
      const k = clamp((Lt - G.L[c.a]) / Math.max(1e-3, G.L[c.b] - G.L[c.a]));
      const off = (1 - k).toFixed(4);
      c.paths.forEach((p) => {
        p.style.strokeDashoffset = off;
        p.style.visibility = k > 0 ? "visible" : "hidden";
      });
    });
    G.rootlets.forEach((rl) => {
      const grow = ti < rl.oi ? 0 : RM ? 1 : clamp((Lt - G.L[rl.oi]) / 70);
      rl.el.style.strokeDashoffset = (1 - grow).toFixed(4);
      rl.el.style.visibility = grow > 0 ? "visible" : "hidden";
    });
    // ponta crescendo: um brilho quente suave
    if (tip.current) {
      const on = !RM && ti > 0 && ti < P.length - 1;
      tip.current.style.opacity = on ? "0.75" : "0";
      if (on) {
        tip.current.setAttribute("cx", P[ti][0].toFixed(1));
        tip.current.setAttribute("cy", P[ti][1].toFixed(1));
      }
    }
  });

  return (
    <section ref={section} className="jornada" id="jornada" aria-labelledby="jornT">
      <svg ref={svg} className="j-root" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="jrGlow">
            <stop offset="0" stopColor="var(--glow)" stopOpacity="1" />
            <stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="jr-lets" />
        <g className="jr-main" />
        <circle ref={tip} r="26" fill="url(#jrGlow)" style={{ opacity: 0 }} />
      </svg>
      <div className="wrap">
        <div ref={title} className="j-head">
          <Dissolve as="h2" className="title" id="jornT" text={t("title")} seed={6} />
          <p className="glass">{t("sub")}</p>
        </div>
        <ol ref={list} className="zig">
          {journey.map((it, i) => (
            <li
              key={i}
              ref={(el) => {
                items.current[i] = el;
              }}
              className={`zi${it.next ? " next" : ""}`}
            >
              <span className="knot" aria-hidden="true" />
              <div className="zi-card glass">
                <span className="tl-when">{pick(it.when, locale)}</span>
                <h3 className="tl-what">{pick(it.title, locale)}</h3>
                <p className="tl-desc">{richSents(pick(it.desc, locale))}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** troca <sents>$ents</sents> pela marca em linha */
function richSents(text: string) {
  const parts = text.split(/<sents>(.*?)<\/sents>/);
  return parts.map((p, i) =>
    i % 2 ? (
      <span key={i} className="sents-inline">
        {p}
      </span>
    ) : (
      p
    ),
  );
}
