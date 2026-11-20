"use client";
// Jornada: rolagem NORMAL, sem seção presa. Tudo acompanha a rolagem 1:1, sempre de baixo para cima, em ordem
// cronológica (o mais antigo em cima, o mais recente embaixo). Os cartões fazem zigue-zague ligados por uma
// linha em S; a ponta da linha fica fixa a 62% da altura da tela e o traço vai até ela. Cada cartão acende
// quando a ponta passa de 30% da altura dele. Movimento reduzido: linha toda desenhada e cartões acesos.
// Desenho em SVG: o caminho é calculado uma vez (no resize) e só o stroke-dashoffset muda com a rolagem.
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  /** topo e altura de cada cartão na cena (px) */
  cards: { top: number; h: number }[];
  nodes: SVGCircleElement[];
  knotAt: number[];
  /** topo da cena no documento (px) */
  sceneTop: number;
  rm: boolean;
}

const NS = "http://www.w3.org/2000/svg";
const d = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

export default function Jornada() {
  const t = useTranslations("jornada");
  const locale = useLocale();
  const section = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tip = useRef<SVGCircleElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const geo = useRef<LineGeo | null>(null);
  const lastTi = useRef(-2);
  const dirty = useRef(true);
  useSection("jornada", section);

  useMeasure((s) => {
    const sec = section.current;
    const sc = scene.current;
    const sv = svg.current;
    const hd = head.current;
    if (!sec || !sc || !sv || !hd || !list.current) return;
    const { vw } = s;
    const rm = document.documentElement.dataset.motion === "reduced";
    const sr = sc.getBoundingClientRect();
    const W = sr.width;
    const Hc = sc.offsetHeight;
    sv.setAttribute("viewBox", `0 0 ${W.toFixed(0)} ${Hc.toFixed(0)}`);
    sv.style.height = `${Hc}px`;
    const mob = vw < 860;
    const lis = items.current.filter(Boolean) as HTMLLIElement[];
    const cardsEl = lis.map((li) => li.querySelector<HTMLElement>(".zi-card")!);
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, top: r.top - sr.top, h: r.height };
    };
    const cards = cardsEl.map((c) => {
      const r = rect(c);
      return { top: r.top, h: r.h };
    });
    // âncoras: a borda interna de cada cartão (onde fica o nó), na altura da data; no celular a linha corre
    // na trilha da esquerda
    const knots = lis.map((li) => {
      const kn = rect(li.querySelector(".knot")!);
      return [kn.x, kn.y] as Pt;
    });
    const cx = mob ? (knots[0]?.[0] ?? 24) : W / 2;
    const hb = rect(hd);
    const start: Pt = [cx, hb.top + hb.h + 14];
    const last = knots[knots.length - 1];
    const end: Pt = [last ? last[0] : cx, (last ? last[1] : start[1]) + 36];
    const pts: Pt[] = [start];
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
    const knotAt: number[] = [];
    const anchors: Pt[] = [start, ...knots, end];
    for (let i = 0; i < anchors.length - 1; i++) {
      curve(anchors[i], anchors[i + 1], 36);
      if (i < knots.length) knotAt.push(pts.length - 1);
    }
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
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
    // nós só no celular (no desktop o cartão cobre o ponto, e o próprio cartão muda de cor)
    const nodes = mob
      ? knots.map((k) => {
          const c = document.createElementNS(NS, "circle");
          c.setAttribute("class", "jr-node");
          c.setAttribute("cx", k[0].toFixed(1));
          c.setAttribute("cy", k[1].toFixed(1));
          c.setAttribute("r", "4.5");
          g.appendChild(c);
          return c;
        })
      : [];
    geo.current = { P: pts, L, main, cards, nodes, knotAt, sceneTop: sr.top + window.scrollY, rm };
    lastTi.current = -2;
    dirty.current = true;
  });

  useScrollFrame((s) => {
    const G = geo.current;
    if (!G || (!s.changed && !dirty.current)) return;
    dirty.current = false;
    const { P, L, cards } = G;
    const total = L[L.length - 1] || 1;

    // movimento reduzido: tudo desenhado e aceso, nada se mexe
    if (G.rm || s.reduced) {
      if (lastTi.current !== -1) {
        lastTi.current = -1;
        G.main.style.strokeDashoffset = "0";
        G.nodes.forEach((n) => n.classList.add("on"));
        items.current.forEach((li) => li?.classList.add("on"));
        if (tip.current) tip.current.style.opacity = "0";
      }
      return;
    }

    // ponta da linha: fixa a 62% da altura da tela, em coordenadas da cena
    const c = s.y + 0.62 * s.vh - G.sceneTop;
    items.current.forEach((li, i) => {
      if (!li || !cards[i]) return;
      li.classList.toggle("on", c >= cards[i].top + 0.3 * cards[i].h);
    });
    // último ponto do caminho com y <= c (os pontos vão de cima para baixo: y crescente)
    let lo = 0;
    let hi = P.length - 1;
    if (P[0][1] > c) hi = 0;
    else
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (P[mid][1] <= c) lo = mid;
        else hi = mid - 1;
      }
    const ti = hi;
    if (ti === lastTi.current) return;
    lastTi.current = ti;
    G.main.style.strokeDashoffset = (1 - L[ti] / total).toFixed(4);
    G.nodes.forEach((n, i) => n.classList.toggle("on", ti >= G.knotAt[i]));
    if (tip.current) {
      const on = ti > 0 && ti < P.length - 1;
      tip.current.style.opacity = on ? "1" : "0";
      if (on) {
        tip.current.setAttribute("cx", P[ti][0].toFixed(1));
        tip.current.setAttribute("cy", P[ti][1].toFixed(1));
      }
    }
  }, -1);

  return (
    <section ref={section} className="jornada" id="jornada" aria-labelledby="jornT">
      <div>
        <div ref={scene} className="j-scene">
          <svg ref={svg} className="j-root" aria-hidden="true" focusable="false">
            <g className="jr-main" />
            <circle ref={tip} className="jr-tip" r="5" style={{ opacity: 0 }} />
          </svg>
          <div className="wrap">
            <div ref={head} className="j-head">
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
        </div>
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
