"use client";
// Hero: as letras do nome se juntam, e com a rolagem o nome sobe e encolhe
// até virar a marca da barra. O nome fica ATRÁS do morro (camada da paisagem),
// então o morro cobre o pé das letras enquanto sobe.
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { clamp, ease, easeOut, noise, sstep } from "@/lib/math";
import { brandSwap, heroProgress } from "@/lib/choreo";
import { M } from "@/lib/scroll-engine";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";

const NAME = ["Diego", "Olalla"];

export default function Hero() {
  const t = useTranslations("hero");
  const section = useRef<HTMLElement>(null);
  const backStage = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLHeadingElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const letters = useRef<HTMLSpanElement[]>([]);
  const mh = useRef({ s: 1, tx: 0, ty: 0 });
  const lastSpread = useRef(-1);
  useSection("hero", section);

  // entrada: cada letra sai do desfoque e encaixa no lugar
  useEffect(() => {
    const el = name.current;
    if (!el?.animate) return;
    const rm = document.documentElement.dataset.motion === "reduced";
    if (rm) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, fill: "backwards" });
      return;
    }
    letters.current.forEach((l, i) => {
      const dx = (noise(i, 2) * 2 - 1) * 0.08;
      const dy = 0.16 + noise(i, 5) * 0.16;
      l.animate(
        [
          { opacity: 0, transform: `translate(${dx}em, ${dy}em)`, filter: "blur(6px)" },
          { opacity: 1, transform: "translate(0, 0)", filter: "blur(0px)" },
        ],
        { duration: 900, delay: 160 + i * 38, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
      );
    });
  }, []);

  // medidas: de onde o nome sai e onde fica a marca da barra
  useMeasure(() => {
    const el = name.current;
    const brand = document.querySelector<HTMLElement>(".brand");
    const stage = backStage.current;
    if (!el || !brand || !stage) return;
    el.style.transform = "none";
    // celular: o nome fica relativo ao cartão (logo acima dele), não a uma % da altura da tela;
    // em tela baixa o cartão sobe e o nome sobe junto, sem cobrir o texto
    const card = info.current;
    const wrapEl = el.parentElement;
    if (card && wrapEl && window.innerWidth < 700) {
      const gap = 14;
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 96;
      const pref = navH + 0.3 * window.innerHeight;
      const fit = wrapEl.clientHeight - parseFloat(getComputedStyle(card).bottom || "16") - card.offsetHeight - gap - el.offsetHeight;
      el.style.setProperty("--hn-top", `${Math.max(8, Math.min(pref, fit)).toFixed(1)}px`);
    } else el.style.removeProperty("--hn-top");
    const hs = stage.getBoundingClientRect();
    const nr = el.getBoundingClientRect();
    const br = brand.getBoundingClientRect();
    const nfs = parseFloat(getComputedStyle(el).fontSize);
    const bfs = parseFloat(getComputedStyle(brand).fontSize);
    const s = bfs / nfs;
    mh.current = {
      s,
      tx: br.left - nr.left,
      ty: br.top + br.height / 2 - (nr.top - hs.top + (nr.height * s) / 2),
    };
  });

  useScrollFrame((s) => {
    if (!s.changed) return;
    const el = name.current;
    const hero = M.hero;
    if (!el || !hero) return;
    const hp = heroProgress(s.y, hero.h, s.vh);
    const { s: sc, tx, ty } = mh.current;
    const sw = brandSwap(hp, s.reduced);
    if (!s.reduced) {
      const tt = clamp((hp - 0.03) / 0.85);
      const e = ease(tt);
      el.style.transform = `translate3d(${(tx * e).toFixed(2)}px, ${(ty * e).toFixed(2)}px, 0) scale(${(1 + (sc - 1) * e).toFixed(5)})`;
      // as letras se afastam um pouco no meio do caminho e voltam a se juntar
      const spr = Math.round(Math.sin(Math.PI * tt) * 400) / 400;
      if (spr !== lastSpread.current) {
        lastSpread.current = spr;
        letters.current.forEach((l, i) => {
          l.style.transform = spr > 0 ? `translate3d(${((i - 5) * 0.03 * spr).toFixed(4)}em, 0, 0)` : "";
        });
      }
      el.style.opacity = (1 - sw).toFixed(3);
      if (info.current) {
        info.current.style.opacity = (1 - sstep(clamp(hp / 0.34))).toFixed(3);
        info.current.style.transform = `translate3d(0, ${(-easeOut(clamp(hp / 0.5)) * 48).toFixed(2)}px, 0)`;
      }
    } else {
      el.style.transform = "none";
      el.style.opacity = (1 - sstep(clamp((hp - 0.2) / 0.35))).toFixed(3);
      if (info.current) info.current.style.opacity = (1 - sstep(clamp(hp / 0.34))).toFixed(3);
    }
    if (info.current) info.current.style.visibility = hp > 0.4 ? "hidden" : "visible";
  });

  let li = 0;
  letters.current = [];
  return (
    <section ref={section} className="pin hero" id="hero" aria-label={t("label")}>
      {/* camada de trás: só o nome, entre as camadas da paisagem */}
      <div ref={backStage} className="stage hero-back">
        <div className="wrap">
          <h1 ref={name} className="hero-name">
            <span className="sr">Diego Olalla</span>
            {NAME.map((w, wi) => (
              <span key={w} aria-hidden="true">
                <span className="w">
                  {Array.from(w).map((ch) => {
                    const idx = li++;
                    return (
                      <span
                        key={idx}
                        className="l"
                        ref={(n) => {
                          if (n) letters.current[idx] = n;
                        }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>
                {wi === 0 ? " " : null}
              </span>
            ))}
          </h1>
        </div>
      </div>
      {/* camada da frente: texto de apoio num vidro, sobre a grama */}
      <div className="stage hero-front-stage hero-front">
        <div className="wrap">
          <div ref={info} className="hero-info glass">
            <div>
              <p className="role">{t("role")}</p>
              <p className="role-sub">{t("roleSub")}</p>
              <p className="role-want">{t("want")}</p>
            </div>
            <div>
              <p className="lead">{t("lead")}</p>
              <div className="ctas">
                <a className="btn btn-leaf" href="#projetos">
                  {t("ctaProjects")}
                </a>
                <a className="btn btn-out" href="#contato">
                  {t("ctaContact")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
