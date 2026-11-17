"use client";
// Sobre: a frase se dissolve para dentro por cima do fim do hero, e depois
// entram o texto (num vidro, com a foto) e os números.
import Image from "next/image";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { clamp, easeOut, sstep } from "@/lib/math";
import { M, type FrameState } from "@/lib/scroll-engine";
import { projects } from "@/content/projects";
import { techGroups, techs } from "@/content/techs";
import Dissolve from "@/components/ui/Dissolve";
import { useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";

/** progresso da frase: começa a aparecer antes de a seção encostar no topo */
const stmtP = (s: FrameState) => clamp((s.y - ((M.sobre?.top ?? 0) - 0.95 * s.vh)) / (0.8 * s.vh));

export default function Sobre() {
  const t = useTranslations("sobre");
  const section = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const ds = useRef<HTMLDListElement>(null);
  const lines = useRef<(HTMLSpanElement | null)[]>([]);
  useSection("sobre", section);

  const online = projects.filter((p) => p.status === "online").length;

  useScrollFrame((s) => {
    if (!s.changed) return;
    const m = M.sobre;
    if (!m) return;
    const sp = clamp((s.y - m.top) / Math.max(1, m.h - s.vh));
    const p0 = stmtP(s);
    if (!s.reduced) {
      lines.current.forEach((ln, i) => {
        if (!ln) return;
        const k = clamp((p0 - i * 0.12) / 0.62);
        ln.style.transform = `translate3d(${((1 - easeOut(k)) * (i % 2 ? 5 : -5)).toFixed(3)}vw, 0, 0)`;
      });
    }
    const a1 = clamp((sp - 0.1) / 0.18);
    const b1 = clamp((sp - 0.2) / 0.18);
    if (card.current) {
      card.current.style.opacity = sstep(a1).toFixed(3);
      if (!s.reduced) card.current.style.transform = `translate3d(0, ${((1 - easeOut(a1)) * 24).toFixed(2)}px, 0)`;
    }
    if (ds.current) {
      ds.current.style.opacity = sstep(b1).toFixed(3);
      if (!s.reduced) ds.current.style.transform = `translate3d(0, ${((1 - easeOut(b1)) * 24).toFixed(2)}px, 0)`;
    }
    // saída: a seção inteira sobe um pouco e some (a nuvem chega logo depois)
    const sEnd = m.top + m.h - s.vh;
    const sx = sstep(clamp((s.y - (sEnd - 0.2 * s.vh)) / (0.7 * s.vh)));
    if (wrap.current) {
      wrap.current.style.opacity = (1 - sx).toFixed(3);
      if (!s.reduced) wrap.current.style.transform = sx > 0 ? `translate3d(0, ${(-sx * 7).toFixed(3)}vh, 0)` : "";
      wrap.current.style.visibility = sx > 0.999 ? "hidden" : "visible";
    }
  });

  const stmt = [t("line1"), t("line2"), t("line3")];
  return (
    <section ref={section} className="pin sobre" id="sobre" aria-labelledby="sobreT">
      <div className="stage">
        <div ref={wrap} className="wrap">
          <h2 className="statement" id="sobreT">
            <span className="sr">{t("statement")}</span>
            {stmt.map((line, i) => (
              <span
                key={i}
                className="line"
                ref={(el) => {
                  lines.current[i] = el;
                }}
              >
                <Dissolve text={line} seed={3 + i} progress={stmtP} label={false} />
              </span>
            ))}
          </h2>
          <div ref={card} className="about-card glass">
            <div className="about-photo">
              <Image src="/foto.jpg" alt={t("photoAlt")} fill sizes="120px" style={{ objectFit: "cover", objectPosition: "50% 30%" }} />
            </div>
            <p className="about">
              {t.rich("about", { sents: (c) => <span className="sents-inline">{c}</span> })}
            </p>
            <dl ref={ds} className="ds">
              <div>
                <dt>{t("statProjects")}</dt>
                <dd>{projects.length}</dd>
                <small>{t("statProjectsSub", { online, wip: projects.length - online })}</small>
              </div>
              <div>
                <dt>{t("statTechs")}</dt>
                <dd>{techs.length}</dd>
                <small>{t("statTechsSub", { groups: techGroups.length })}</small>
              </div>
              <div>
                <dt>{t("statLangs")}</dt>
                <dd>{techGroups[0].items.length}</dd>
                <small>{t("statLangsSub")}</small>
              </div>
              <div>
                <dt>{t("statFrameworks")}</dt>
                <dd>{techGroups[1].items.length}</dd>
                <small>{t("statFrameworksSub")}</small>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
