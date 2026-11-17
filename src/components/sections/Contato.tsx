"use client";
// Contato: "Vamos conversar?", um galho 3D que atravessa a tela com o
// passarinho pousado, e o terminal de vidro com e-mail e links.
// No fim, o nome gigante afunda atrás do morro, ao anoitecer.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { clamp, easeOut, sstep } from "@/lib/math";
import { docTop } from "@/lib/scroll-engine";
import { TWIGS, birdX, branchR, branchSlope, branchY } from "@/lib/branch";
import { site } from "@/content/site";
import Dissolve from "@/components/ui/Dissolve";
import CopyEmail from "@/components/ui/CopyEmail";
import Bird from "@/components/ui/Bird";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { hasWebGL } from "@/lib/webgl";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";
import { useInViewOnce } from "@/hooks/useInViewOnce";

const Branch3D = dynamic(() => import("@/components/three/Branch3D"), { ssr: false });

/** galho em SVG (sem WebGL, e enquanto o 3D carrega): mesma forma do 3D */
function branchSvg(W: number, H: number) {
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const x = -0.02 + (i / 60) * 1.04;
    const xc = Math.min(1, Math.max(0, x));
    const y = branchY(x) * H;
    const r = branchR(xc, H);
    top.push(`${(x * W).toFixed(1)} ${(y - r).toFixed(1)}`);
    bot.unshift(`${(x * W).toFixed(1)} ${(y + r).toFixed(1)}`);
  }
  const main = `M${top.join(" L")} L${bot.join(" L")} Z`;
  const twigs = TWIGS.map((tw) => {
    const ax = tw.x * W;
    const ay = branchY(tw.x) * H;
    const len = tw.len * H;
    const bx = ax + Math.cos(tw.ang) * len;
    const by = ay + Math.sin(tw.ang) * len * 0.6;
    return {
      d: `M${ax.toFixed(1)} ${ay.toFixed(1)} Q ${((ax + bx) / 2).toFixed(1)} ${((ay + by) / 2 - len * 0.12).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`,
      w: branchR(tw.x, H) * 0.8,
      bx,
      by,
    };
  });
  return { main, twigs };
}

export default function Contato() {
  const t = useTranslations("contato");
  const section = useRef<HTMLElement>(null);
  const branch = useRef<HTMLDivElement>(null);
  const term = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLElement[]>([]);
  const termTop = useRef(0);
  const clock1 = useRef<HTMLSpanElement>(null);
  const clock2 = useRef<HTMLElement>(null);
  const [box, setBox] = useState({ w: 1440, h: 240 });
  const [mobile, setMobile] = useState(false);
  const [want3d, setWant3d] = useState(false);
  const [gl3d, setGl3d] = useState(false);
  const near = useInViewOnce(section, "120% 0px");
  useSection("contato", section);

  useEffect(() => {
    if (near && hasWebGL()) setWant3d(true);
  }, [near]);
  const ready = useCallback(() => setGl3d(true), []);

  // relógio de São Paulo
  useEffect(() => {
    let fHM: Intl.DateTimeFormat | null = null;
    let fHMS: Intl.DateTimeFormat | null = null;
    try {
      fHM = new Intl.DateTimeFormat("pt-BR", { timeZone: site.timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
      fHMS = new Intl.DateTimeFormat("pt-BR", { timeZone: site.timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    } catch {}
    const tick = () => {
      const d = new Date();
      if (fHM && clock2.current) clock2.current.textContent = `SP ${fHM.format(d)}`;
      if (fHMS && clock1.current) clock1.current.textContent = `SP ${fHMS.format(d)}`;
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useMeasure((s) => {
    if (term.current) {
      termTop.current = docTop(term.current);
      lines.current = Array.from(term.current.querySelectorAll<HTMLElement>(".tln"));
    }
    const b = branch.current;
    if (b) {
      const w = b.clientWidth;
      const h = b.clientHeight;
      setBox((o) => (o.w === w && o.h === h ? o : { w, h }));
    }
    setMobile(s.vw < 700);
  });

  // linhas do terminal aparecem uma a uma, como se fossem digitadas
  useScrollFrame((s) => {
    if (!s.changed) return;
    const cp = clamp((s.y + s.vh * 0.82 - termTop.current) / (s.vh * 0.55));
    lines.current.forEach((ln, i) => {
      const k = clamp((cp - i * 0.13) / 0.28);
      ln.style.opacity = sstep(k).toFixed(3);
      if (!s.reduced) ln.style.clipPath = k >= 1 ? "none" : `inset(-4px ${((1 - easeOut(k)) * 100).toFixed(2)}% -4px 0)`;
    });
  });

  const svgB = useMemo(() => branchSvg(box.w, box.h), [box]);
  const bx = birdX(mobile);
  // o passarinho: largura 112 px no viewBox de 128; os pés (y=81) ficam em cima do galho
  const scale = 112 / 128;
  const perchLeft = bx * box.w - (46 + 16) * scale;
  const perchTop = branchY(bx) * box.h - branchR(bx, box.h) - (81 + 8) * scale + 2;
  const slope = branchSlope(bx, box.w, box.h) / scale;

  return (
    <section ref={section} className="contato" id="contato" aria-labelledby="contT">
      <div className="wrap">
        <Dissolve as="h2" className="closing" id="contT" text={t("closing")} seed={7} />
      </div>
      <div ref={branch} className={`branch${gl3d ? " gl3d-branch" : ""}`}>
        <svg className="branch-svg" viewBox={`0 0 ${box.w} ${box.h}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {svgB.twigs.map((tw, i) => (
            <path key={i} d={tw.d} stroke="var(--wood)" strokeWidth={tw.w} strokeLinecap="round" fill="none" />
          ))}
          <path className="br-main" d={svgB.main} />
          {svgB.twigs.map((tw, i) => (
            <ellipse
              key={`l${i}`}
              className={`bl l${(i % 3) + 1}`}
              cx={tw.bx}
              cy={tw.by}
              rx={box.h * 0.07}
              ry={box.h * 0.035}
              transform={`rotate(${i * 47} ${tw.bx} ${tw.by})`}
            />
          ))}
        </svg>
        {want3d && (
          <ErrorBoundary onError={() => setWant3d(false)}>
            <Branch3D onReady={ready} />
          </ErrorBoundary>
        )}
        <div style={{ position: "absolute", left: perchLeft, top: perchTop }}>
          <Bird label={t("bird")} slope={slope} />
        </div>
      </div>
      <div className="wrap">
        <div className="c-grid">
          <div ref={term} className="term glass">
            <div className="term-bar" aria-hidden="true">
              <span>
                <i />
                {t("tty")}
              </span>
              <span ref={clock1}>SP --:--:--</span>
            </div>
            <div className="term-body">
              <p className="tln">
                <span className="pr" aria-hidden="true">
                  &gt;
                </span>
                {t("cmdEmail")}
              </p>
              <div className="tln out mail-row">
                <a className="mail" id="mailText" href={`mailto:${site.email}`}>
                  {site.email}
                </a>
                <CopyEmail email={site.email} targetId="mailText" labels={{ copy: t("copy"), copied: t("copied"), fail: t("copyFail") }} />
              </div>
              <p className="tln cmt">{t("comment")}</p>
              <p className="tln">
                <span className="pr" aria-hidden="true">
                  &gt;
                </span>
                {t("cmdLinks")}
              </p>
              <ul className="tln out c-links">
                <li>
                  <a href={site.github} target="_blank" rel="noopener noreferrer">
                    GitHub <span aria-hidden="true">↗</span>
                  </a>
                </li>
                <li>
                  {/* TODO: enquanto o link for "#", não abre aba nova */}
                  <a href={site.linkedin} {...(site.linkedin.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    LinkedIn <span aria-hidden="true">↗</span>
                  </a>
                </li>
              </ul>
              <p className="tln" aria-hidden="true">
                <span className="pr">&gt;</span>
                <span className="caret" />
              </p>
            </div>
          </div>
          <div className="c-side glass">
            <p className="c-lead">{t("lead")}</p>
            <dl className="readout" aria-hidden="true">
              <div>
                <dt>{t("localTime")}</dt>
                <dd ref={clock2}>SP --:--</dd>
              </div>
              <div>
                <dt>{t("zone")}</dt>
                <dd>UTC−3</dd>
              </div>
              <div>
                <dt>{t("pulse")}</dt>
                <dd>
                  <span className="bars">
                    {[0.4, 0.7, 0.5, 0.9, 0.6, 0.3, 0.8, 0.5].map((h, i) => (
                      <i key={i} style={{ ["--i" as string]: i, ["--h" as string]: h }} />
                    ))}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="wordmark" aria-hidden="true">
          Diego Olalla
        </div>
      </div>
    </section>
  );
}
