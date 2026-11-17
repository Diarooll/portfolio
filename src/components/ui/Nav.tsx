"use client";
// Barra fixa: marca (aparece quando o nome do hero chega nela), links das
// seções com o capítulo atual marcado, idioma e tema.
import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { M } from "@/lib/scroll-engine";
import { NAV_IDS, brandSwap, heroProgress } from "@/lib/choreo";
import { clamp } from "@/lib/math";
import { useScrollFrame } from "@/hooks/useScrollFrame";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const other = locale === "pt" ? "en" : "pt";
  const brand = useRef<HTMLAnchorElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);

  useScrollFrame((s) => {
    if (!s.changed) return;
    const { y, vh } = s;
    const hero = M.hero;
    const sw = hero ? brandSwap(heroProgress(y, hero.h, vh), s.reduced) : 1;
    if (brand.current) {
      brand.current.style.opacity = sw.toFixed(3);
      brand.current.style.visibility = sw > 0.001 ? "visible" : "hidden";
    }
    if (bg.current) bg.current.style.opacity = sw.toFixed(3);
    // capítulo atual e progresso dentro dele
    const starts: [string, number][] = [
      ["sobre", (M.sobre?.top ?? 0) - 0.2 * vh],
      ["stack", (M.stack?.top ?? 0) - 0.1 * vh],
      ["projetos", M.projetos?.top ?? 0],
      ["jornada", (M.jornada?.top ?? 0) - 0.3 * vh],
      ["contato", (M.contato?.top ?? 0) - 0.4 * vh],
    ];
    const endAll = (M.fim?.top ?? document.documentElement.scrollHeight) - vh;
    let cur = "";
    let prog = 0;
    for (let i = starts.length - 1; i >= 0; i--) {
      if (y >= starts[i][1]) {
        const end = i < starts.length - 1 ? starts[i + 1][1] : endAll;
        cur = starts[i][0];
        prog = clamp((y - starts[i][1]) / Math.max(1, end - starts[i][1]));
        break;
      }
    }
    if (line.current) line.current.style.transform = `scaleX(${prog.toFixed(4)})`;
    links.current.forEach((a) => {
      if (!a) return;
      if (a.dataset.ch === cur) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }, 20);

  return (
    <header className="nav">
      <div ref={bg} className="nav-bg" />
      <div className="nav-in">
        <a ref={brand} className="brand" href="#hero" aria-label={t("home")}>
          Diego Olalla
        </a>
        <nav className="nav-links" aria-label={t("label")}>
          {NAV_IDS.map((id, i) => (
            <a
              key={id}
              ref={(el) => {
                links.current[i] = el;
              }}
              href={`#${id}`}
              data-ch={id}
            >
              {t(id)}
            </a>
          ))}
        </nav>
        <div className="nav-tools">
          <Link className="icon-btn" href="/" locale={other} hrefLang={other === "pt" ? "pt-BR" : "en"} aria-label={t("lang")} title={t("lang")}>
            {t("langShort")}
          </Link>
          <ThemeToggle />
        </div>
      </div>
      <div ref={line} className="nav-line" />
    </header>
  );
}
