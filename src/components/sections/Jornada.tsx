"use client";
// Jornada: o site SOBE. A seção fica presa na tela e o conteúdo desce com a rolagem (como a paisagem), então
// a Jornada começa por baixo: o marco mais antigo fica embaixo e o mais recente em cima. Uma linha fina
// (motion graphics) nasce no pé da cena e sobe passando pelo meio de cada cartão; o cartão fica colorido
// (cor de destaque) quando a linha chega nele e é neutro antes disso. Movimento reduzido: sem seção presa,
// linha toda desenhada e todos os cartões já coloridos.
// Desenho em SVG: o caminho é calculado uma vez (no resize) e só o stroke-dashoffset muda com a rolagem.
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, lerp } from "@/lib/math";
import { M, requestMeasure } from "@/lib/scroll-engine";
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
  /** quanto o conteúdo precisa descer durante a seção presa (px) */
  travel: number;
  /** altura útil do palco (tela menos a barra) */
  win: number;
  /** fim do título na cena (px): quando ele já cabe na tela */
  headBottom: number;
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
  const titleP = useRef(0);
  useSection("jornada", section);

  useMeasure((s) => {
    const sec = section.current;
    const sc = scene.current;
    const sv = svg.current;
    const hd = head.current;
    if (!sec || !sc || !sv || !hd || !list.current) return;
    const { vw, vh } = s;
    const rm = document.documentElement.dataset.motion === "reduced";
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 64;
    sc.style.transform = "none";
    const Hc = sc.offsetHeight;
    const win = Math.max(1, vh - navH);
    const travel = rm ? 0 : Math.max(0, Hc - win);
    // a seção presa dura a altura da tela + o quanto o conteúdo desce (rolagem 1:1); depois de ajustar a altura
    // pede uma nova medida (os tops das seções de baixo mudam)
    if (rm) {
      if (sec.style.height) {
        sec.style.height = "";
        requestMeasure();
      }
    } else {
      const want = Math.round(vh + travel);
      if (Math.abs(sec.offsetHeight - want) > 1) {
        sec.style.height = `${want}px`;
        requestMeasure();
      }
    }
    const sr = sc.getBoundingClientRect();
    const W = sr.width;
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
    // âncoras: no desktop a linha passa pelo MEIO de cada cartão (o vidro cobre o traço); no celular ela
    // corre na trilha da esquerda, ao lado dos cartões
    const knots = lis.map((li, i) => {
      const kn = rect(li.querySelector(".knot")!);
      const c = rect(cardsEl[i]);
      return [mob ? kn.x : c.x, c.y] as Pt;
    });
    const cx = mob ? (knots[0]?.[0] ?? 24) : W / 2;
    const hb = rect(hd);
    const headBottom = hb.top + hb.h;
    const start: Pt = [cx, Hc - 4];
    const end: Pt = [cx, headBottom + 18];
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
    geo.current = { P: pts, L, main, cards, nodes, knotAt, travel, win, headBottom, rm };
    lastTi.current = -2;
  });

  useScrollFrame((s) => {
    if (!s.changed) return;
    const m = M.jornada;
    const G = geo.current;
    const sc = scene.current;
    if (!m || !G || !sc) return;
    const { y, vh } = s;
    const { P, L, travel, win, cards } = G;
    const total = L[L.length - 1] || 1;

    // movimento reduzido: tudo desenhado e colorido, nada se mexe
    if (G.rm || s.reduced) {
      if (lastTi.current !== -1) {
        lastTi.current = -1;
        sc.style.transform = "";
        G.main.style.strokeDashoffset = "0";
        G.nodes.forEach((n) => n.classList.add("on"));
        items.current.forEach((li) => li?.classList.add("on"));
        if (tip.current) tip.current.style.opacity = "0";
      }
      titleP.current = 1;
      return;
    }

    // progresso da seção presa: o conteúdo DESCE (a câmera sobe), mostrando de baixo para cima
    const q = clamp((y - m.top) / Math.max(1, m.h - vh));
    const u = clamp((q - 0.04) / 0.92);
    const ty = -travel * (1 - u);
    sc.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`;
    // a "ponta" da linha fica numa altura da tela que sobe de 92% (embaixo) a 20% (em cima)
    const c = lerp(0.92, 0.2, u) * win - ty;
    titleP.current = clamp((u - (1 - G.headBottom / Math.max(1, travel))) / 0.12);

    // cartões: ficam coloridos quando a linha chega neles
    items.current.forEach((li, i) => {
      if (!li || !cards[i]) return;
      li.classList.toggle("on", c <= cards[i].top + cards[i].h * 0.72);
    });
    // linha: do pé da cena para cima (os pontos vão de baixo para cima: y decrescente)
    let ti = P.length - 1;
    if (P[0][1] <= c) ti = 0;
    else
      for (let i = 0; i < P.length; i++)
        if (P[i][1] <= c) {
          ti = i;
          break;
        }
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
    <section ref={section} className="pin jornada" id="jornada" aria-labelledby="jornT">
      <div className="stage j-stage">
        <div ref={scene} className="j-scene">
          <svg ref={svg} className="j-root" aria-hidden="true" focusable="false">
            <g className="jr-main" />
            <circle ref={tip} className="jr-tip" r="4" style={{ opacity: 0 }} />
          </svg>
          <div className="wrap">
            <div ref={head} className="j-head">
              <Dissolve as="h2" className="title" id="jornT" text={t("title")} seed={6} progress={() => titleP.current} />
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
