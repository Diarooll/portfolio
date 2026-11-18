"use client";
// Projetos: painéis num trilho horizontal. Cada painel entra com uma
// "cortina" diagonal (clip-path) da direita para a esquerda, nas cores da
// marca: $ents (marrom e off-white), ALERA (azul-marinho e amarelo) e Sito's
// (cores do site). No celular os painéis ficam um embaixo do outro.
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { clamp, ease, easeOut, lerp, sstep } from "@/lib/math";
import { M, docTop } from "@/lib/scroll-engine";
import { projects } from "@/content/projects";
import { pick } from "@/content/types";
import Dissolve from "@/components/ui/Dissolve";
import { AleraLogo, SentsLogo } from "@/components/ui/Logos";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";

/** janelas de rolagem (0..1 do capítulo) em que cada painel entra */
const A: [number, number][] = [
  [0, 0.1],
  [0.22, 0.355],
  [0.5, 0.635],
  [0.76, 0.895],
];
/** escala inicial do cartão de cada painel */
const PD = [0.86, 0.9, 0.9, 0.9];

interface Panel {
  el: HTMLDivElement | null;
  inner: HTMLDivElement | null;
  unit: HTMLElement | null;
  edge: HTMLElement | null;
  logo: HTMLDivElement | null;
}

export default function Projetos() {
  const t = useTranslations("projetos");
  const locale = useLocale();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const panels = useRef<Panel[]>([0, 1, 2, 3].map(() => ({ el: null, inner: null, unit: null, edge: null, logo: null })));
  /** progresso de cada painel (usado pelos textos que se dissolvem) */
  const pp = useRef([0, 0, 0, 0]);
  const PM = useRef({ Wt: 0, H: 1, S: 56, sk: 100, skew: 0, phi: 0, fm: 140, tops: [0, 0, 0, 0], utops: [0, 0, 0, 0] });
  /** última máscara aplicada em cada painel (evita reescrever o estilo sem mudança) */
  const maskKey = useRef(["", "", "", ""]);
  useSection("projetos", section);

  useMeasure((s) => {
    const tr = track.current;
    if (!tr) return;
    const P = PM.current;
    if (s.vw >= 700) {
      P.Wt = tr.clientWidth;
      P.H = Math.max(1, tr.clientHeight);
      P.S = clamp(s.vw * 0.05, 44, 76);
      P.sk = clamp(P.Wt * 0.11, 60, 170);
      P.phi = Math.atan(P.sk / P.H);
      P.skew = (-P.phi * 180) / Math.PI;
      // largura da franja suave da cortina: 100 a 200px
      P.fm = clamp(s.vw * 0.11, 100, 200);
      tr.style.setProperty("--S", `${P.S.toFixed(1)}px`);
      tr.style.setProperty("--sk", `${P.sk.toFixed(1)}px`);
    } else {
      panels.current.forEach((pn) => {
        if (pn.el) {
          pn.el.style.clipPath = "";
          pn.el.style.opacity = "";
          pn.el.style.visibility = "";
          pn.el.style.maskImage = "";
          pn.el.style.webkitMaskImage = "";
        }
      });
    }
    P.tops = panels.current.map((pn) => (pn.el ? docTop(pn.el) : 0));
    // celular: os textos se dissolvem pela posição do cartão (unit), não do painel
    P.utops = panels.current.map((pn, i) => (pn.unit ? docTop(pn.unit) : P.tops[i]));
  });

  useScrollFrame((s) => {
    if (!s.changed) return;
    const m = M.projetos;
    const tr = track.current;
    if (!m || !tr) return;
    const { y, vh, vw, reduced: RM } = s;
    const P = PM.current;
    const D = Math.max(1, m.h - vh);
    const p = clamp((y - m.top) / D);
    if (vw >= 700) {
      const { Wt, S, sk } = P;
      panels.current.forEach((pn, i) => {
        if (!pn.el || !pn.inner) return;
        const raw = clamp((p - A[i][0]) / (A[i][1] - A[i][0]));
        const c = i < 3 ? clamp((p - A[i + 1][0]) / (A[i + 1][1] - A[i + 1][0])) : 0;
        const Lf = i === 0 ? -sk : i * S;
        // os painéis anteriores continuam visíveis atrás, empilhados (cor, faixa e rótulo); só o conteúdo
        // do painel coberto se apaga para o seguinte assumir
        if (!RM) {
          const a = ease(raw);
          const L = Wt + (Lf - Wt) * a;
          // a abertura é só uma luz que passa (borda larga e suave); os outros painéis nascem com a
          // borda em gradiente de 100 a 200px, que vai se firmando quando o painel assenta
          const gl = i === 0 ? sk * 0.65 : 0;
          pn.el.style.clipPath =
            a <= 0 ? "polygon(0 0, 0 0, 0 0)" : `polygon(${(L + sk - gl).toFixed(2)}px 0, ${Wt}px 0, ${Wt}px 100%, ${(L - gl).toFixed(2)}px 100%)`;
          pn.el.style.visibility = a <= 0 ? "hidden" : "visible";
          pn.el.style.opacity = "";
          if (i > 0) {
            const F = lerp(26, P.fm, Math.pow(1 - a, 0.8));
            const t0 = (L + sk) * Math.cos(P.phi);
            const mk = a <= 0 ? "" : `linear-gradient(${(90 + (P.phi * 180) / Math.PI).toFixed(3)}deg, transparent ${t0.toFixed(1)}px, #000 ${(t0 + F).toFixed(1)}px)`;
            if (maskKey.current[i] !== mk) {
              maskKey.current[i] = mk;
              pn.el.style.maskImage = mk;
              pn.el.style.webkitMaskImage = mk;
            }
          }
          const ce = ease(c);
          const enter = i === 0 ? 0 : (1 - easeOut(clamp((p - A[i][0] - 0.02) / (A[i][1] - A[i][0] + 0.04)))) * 70;
          pn.inner.style.opacity = (1 - ce).toFixed(3);
          pn.inner.style.transform = `translate3d(${(enter - 48 * ce).toFixed(2)}px, 0, 0)`;
          if (pn.edge) {
            pn.edge.style.transform = `translate3d(${L.toFixed(2)}px, 0, 0) skewX(${P.skew.toFixed(3)}deg)`;
            pn.edge.style.opacity = (i === 0 && a > 0 && a < 1 ? Math.sin(Math.PI * a) : 0).toFixed(3);
          }
          if (pn.unit) pn.unit.style.transform = `scale(${lerp(PD[i], 1, easeOut(clamp((p - A[i][0]) / (A[i][1] - A[i][0] + 0.06)))).toFixed(4)})`;
        } else {
          // movimento reduzido: troca no lugar, sem varredura
          const a = sstep(clamp((p - A[i][0]) / 0.05));
          const nxt = i < 3 ? sstep(clamp((p - A[i + 1][0]) / 0.05)) : 0;
          pn.el.style.clipPath = `polygon(${(Lf + sk).toFixed(1)}px 0, ${Wt}px 0, ${Wt}px 100%, ${Lf.toFixed(1)}px 100%)`;
          pn.el.style.opacity = a.toFixed(3);
          pn.el.style.visibility = a <= 0.001 ? "hidden" : "visible";
          pn.el.style.maskImage = "";
          pn.el.style.webkitMaskImage = "";
          maskKey.current[i] = "";
          pn.inner.style.opacity = (1 - nxt).toFixed(3);
          pn.inner.style.transform = "none";
        }
        // painel coberto pelo seguinte: fora do teclado e dos leitores de tela
        pn.el.inert = c > 0.98;
        pp.current[i] = RM ? (raw > 0 ? 1 : 0) * clamp((p - A[i][0]) / 0.05) : clamp((p - A[i][0] + 0.01) / 0.16);
      });
      // saída: o trilho se dissolve na cor do fundo (sem blur) e a base some
      // por uma máscara vertical longa, sem corte reto; a Jornada nasce daqui
      const pEnd = m.top + m.h - vh;
      const pe = sstep(clamp((y - (pEnd - 0.3 * vh)) / (0.9 * vh)));
      tr.style.opacity = (1 - pe * pe).toFixed(3);
      tr.style.filter = "";
      tr.style.transform = "";
      if (pe > 0.001) {
        const a0 = (100 - 70 * pe).toFixed(2);
        const a1 = (100 - 30 * pe).toFixed(2);
        const mk = `linear-gradient(to bottom, #000 ${a0}%, transparent ${a1}%)`;
        tr.style.maskImage = mk;
        tr.style.webkitMaskImage = mk;
      } else {
        tr.style.maskImage = "";
        tr.style.webkitMaskImage = "";
      }
    } else {
      tr.style.opacity = "";
      tr.style.filter = "";
      tr.style.transform = "";
      tr.style.maskImage = "";
      tr.style.webkitMaskImage = "";
      panels.current.forEach((pn, i) => {
        if (!pn.el) return;
        pn.el.inert = false;
        // sem cortina no celular: a entrada é o gradiente de cor do próprio painel (CSS) e o cartão que assenta
        pn.el.style.clipPath = "";
        const k = clamp((y + vh * 0.97 - P.utops[i]) / (vh * 0.5));
        if (!RM) {
          pn.el.style.opacity = "";
          if (pn.unit) pn.unit.style.transform = `scale(${lerp(0.94, 1, easeOut(k)).toFixed(4)})`;
        } else pn.el.style.opacity = (0.15 + 0.85 * sstep(k)).toFixed(3);
        // os textos terminam de se dissolver quando o cartão chega a ~70% da altura da tela
        pp.current[i] = clamp((y + vh * 0.98 - P.utops[i]) / (vh * 0.28));
      });
    }
    panels.current.forEach((pn, i) => {
      if (!pn.logo) return;
      const k = sstep(clamp(pp.current[i] * 1.25));
      pn.logo.style.opacity = k.toFixed(3);
      if (!RM) pn.logo.style.filter = k >= 1 ? "none" : `blur(${((1 - k) * 8).toFixed(2)}px)`;
    });
  }, -1);

  const setRef = (i: number, k: keyof Panel) => (el: HTMLElement | null) => {
    (panels.current[i] as unknown as Record<string, HTMLElement | null>)[k] = el;
  };
  /** progresso de um texto dentro do painel i */
  const prog = (i: number, delay: number) => () => clamp((pp.current[i] - delay) / 0.85);
  const strip = ["01 · " + t("title").toUpperCase(), "02 · $ENTS", "03 · ALERA", "04 · SITO'S"];

  return (
    <section ref={section} className="pin proj" id="projetos" aria-labelledby="projT">
      <div className="stage">
        <div ref={track} className="track">
          <div ref={setRef(0, "el")} className="pnl pn0" style={{ ["--j" as string]: 0 }}>
            <i ref={setRef(0, "edge")} className="edge" aria-hidden="true" />
            <span className="strip-lb" aria-hidden="true">
              {strip[0]}
            </span>
            <div ref={setRef(0, "inner")} className="pnl-in">
              <div className="pc">
                <Dissolve as="h2" className="p-big" id="projT" text={t("title")} seed={11} progress={prog(0, 0)} />
                <Dissolve as="p" className="p-line" unit="word" text={t("line")} seed={12} progress={prog(0, 0.15)} />
                <p className="key" aria-hidden="true">
                  <span>
                    <i className="led" />
                    {t("online")}
                  </span>
                  <span>
                    <i className="led warn" />
                    {t("wip")}
                  </span>
                </p>
              </div>
            </div>
          </div>
          {projects.map((pr, k) => {
            const i = k + 1;
            const titleId = `${pr.id}T`;
            return (
              <div key={pr.id} ref={setRef(i, "el")} className={`pnl pn${i}`} style={{ ["--j" as string]: i }}>
                <i ref={setRef(i, "edge")} className="edge" aria-hidden="true" />
                <span className="strip-lb" aria-hidden="true">
                  {strip[i]}
                </span>
                <div ref={setRef(i, "inner")} className="pnl-in">
                  <div className="pc">
                    <article ref={setRef(i, "unit")} className="unit" aria-labelledby={titleId}>
                      <div className="u-top">
                        <span className="u-id">{pick(pr.kicker, locale)}</span>
                        <span className="leds">
                          <i className={`led${pr.status === "wip" ? " warn" : ""}`} aria-hidden="true" />
                          {pick(pr.statusLabel, locale)}
                        </span>
                      </div>
                      <div className="u-body">
                        <div>
                          {pr.brand === "site" ? (
                            <Dissolve as="h3" className="u-name" id={titleId} text={pr.name} seed={13 + i * 5} progress={prog(i, 0)} />
                          ) : (
                            <>
                              <h3 className="sr" id={titleId}>
                                {pr.name}
                              </h3>
                              <div ref={setRef(i, "logo")} className={`p-logo ${pr.brand}-logo`} aria-hidden="true">
                                {pr.brand === "sents" ? <SentsLogo /> : <AleraLogo />}
                              </div>
                            </>
                          )}
                          <Dissolve as="p" className="u-desc" unit="word" text={pick(pr.desc, locale)} seed={14 + i * 5} progress={prog(i, 0.15)} />
                        </div>
                        <dl className="spec">
                          {pr.spec.map((sp, j) => (
                            <div key={j}>
                              <dt>{pick(sp.k, locale)}</dt>
                              <dd>{pick(sp.v, locale)}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                      <div className="u-foot">
                        <ul className="ports" aria-label={t("techLabel")}>
                          {pr.stack.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                        {pr.links.length > 0 && (
                          <p className="links">
                            {pr.links.map((l) => (
                              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
                                {pick(l.label, locale)} <span aria-hidden="true">↗</span>
                                <span className="sr"> {t("newTab")}</span>
                              </a>
                            ))}
                          </p>
                        )}
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
