"use client";
// Jornada: marcos em zigue-zague ligados por uma linha fina, no estilo motion
// graphics: um traço limpo que se desenha conforme a página desce, com nós
// discretos em cada marco e um ponto na ponta. O título fica no topo, centralizado.
// Desenho em SVG: o caminho é calculado uma vez (no resize) e só o
// stroke-dashoffset muda com a rolagem (barato).
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp } from "@/lib/math";
import { M, docTop } from "@/lib/scroll-engine";
import { journey } from "@/content/journey";
import { pick } from "@/content/types";
import Dissolve from "@/components/ui/Dissolve";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";

type Pt = [number, number];
interface LineGeo {
  P: Pt[];
  L: number[];
  main: SVGPathElement;
  /** índice do ponto em cada nó */
  knotAt: number[];
  nodes: SVGCircleElement[];
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
  const geo = useRef<LineGeo | null>(null);
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
    const tBot = tr.bottom - sr.top - top;
    // sai de baixo do título e passa por cada nó, alternando direita e esquerda (curvas suaves, tangentes verticais)
    const pts: Pt[] = [];
    const curve = (p: Pt, q: Pt, n: number) => {
      const dy = q[1] - p[1];
      for (let i = 1; i <= n; i++) {
        const tt = i / n;
        const u = 1 - tt;
        const c1 = [p[0], p[1] + dy * 0.55];
        const c2 = [q[0], q[1] - dy * 0.55];
        pts.push([
          u * u * u * p[0] + 3 * u * u * tt * c1[0] + 3 * u * tt * tt * c2[0] + tt * tt * tt * q[0],
          u * u * u * p[1] + 3 * u * u * tt * c1[1] + 3 * u * tt * tt * c2[1] + tt * tt * tt * q[1],
        ]);
      }
    };
    const start: Pt = [cx, tBot + 18];
    pts.push(start);
    const knotAt: number[] = [];
    const anchors: Pt[] = [start, ...knots];
    for (let i = 0; i < anchors.length - 1; i++) {
      curve(anchors[i], anchors[i + 1], 36);
      knotAt.push(pts.length - 1);
    }
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    // monta o SVG: um trilho apagado (o caminho todo) e o traço que se desenha por cima
    sv.querySelectorAll("path, circle.jr-node").forEach((p) => p.remove());
    const g = sv.querySelector("g.jr-main")!;
    const dAttr = d(pts);
    const mk = (cls: string) => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", dAttr);
      p.setAttribute("class", cls);
      p.setAttribute("pathLength", "1");
      g.appendChild(p);
      return p;
    };
    mk("jr-track");
    const main = mk("jr-line");
    const nodes = knots.map((k) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "jr-node");
      c.setAttribute("cx", k[0].toFixed(1));
      c.setAttribute("cy", k[1].toFixed(1));
      c.setAttribute("r", mob ? "4.5" : "5.5");
      g.appendChild(c);
      return c;
    });
    geo.current = { P: pts, L, main, knotAt, nodes, top };
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
    // linha: desenha até a altura de 72% da tela
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
    const total = G.L[G.L.length - 1] || 1;
    G.main.style.strokeDashoffset = (1 - G.L[ti] / total).toFixed(4);
    G.nodes.forEach((n, i) => n.classList.toggle("on", ti >= G.knotAt[i]));
    // ponta: um ponto pequeno na frente do traço
    if (tip.current) {
      const on = !RM && ti > 0 && ti < P.length - 1;
      tip.current.style.opacity = on ? "1" : "0";
      if (on) {
        tip.current.setAttribute("cx", P[ti][0].toFixed(1));
        tip.current.setAttribute("cy", P[ti][1].toFixed(1));
      }
    }
  });

  return (
    <section ref={section} className="jornada" id="jornada" aria-labelledby="jornT">
      <svg ref={svg} className="j-root" aria-hidden="true" focusable="false">
        <g className="jr-main" />
        <circle ref={tip} className="jr-tip" r="4" style={{ opacity: 0 }} />
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
