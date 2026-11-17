"use client";
// Contato: "Vamos conversar?" e um terminal de vidro com um trecho de FastAPI
// que devolve os contatos (links reais, clicáveis). Os dados vêm de content/site.ts.
// No fim, o nome gigante afunda atrás do morro, ao anoitecer.
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { clamp, easeOut, sstep } from "@/lib/math";
import { docTop } from "@/lib/scroll-engine";
import { contactSnippet, site } from "@/content/site";
import Dissolve from "@/components/ui/Dissolve";
import EarthLayer from "./EarthLayer";
import CopyEmail from "@/components/ui/CopyEmail";
import { useMeasure, useScrollFrame } from "@/hooks/useScrollFrame";
import { useSection } from "@/hooks/useSection";

export default function Contato() {
  const t = useTranslations("contato");
  const section = useRef<HTMLElement>(null);
  const term = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLElement[]>([]);
  const termTop = useRef(0);
  useSection("contato", section);

  useMeasure(() => {
    if (term.current) {
      termTop.current = docTop(term.current);
      lines.current = Array.from(term.current.querySelectorAll<HTMLElement>(".tln"));
    }
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

  const entries = contactSnippet.entries;
  return (
    <section ref={section} className="contato" id="contato" aria-labelledby="contT">
      {/* no espaço: a Terra girando ao fundo, atrás do terminal */}
      <EarthLayer />
      <div className="wrap">
        <Dissolve as="h2" className="closing" id="contT" text={t("closing")} seed={7} />
      </div>
      <div className="wrap">
        <div className="c-grid">
          <div ref={term} className="term glass">
            <div className="term-bar" aria-hidden="true">
              <span>
                <i />
                {t("tty")}
              </span>
              <span>FastAPI</span>
            </div>
            <div className="term-body code">
              <p className="tln">
                <span className="kw">@app</span>.get(<span className="str">&quot;{contactSnippet.route}&quot;</span>)
              </p>
              <p className="tln">
                <span className="kw">def</span> <span className="fn">{contactSnippet.fn}</span>():
              </p>
              <p className="tln ind">
                <span className="kw">return</span> {"{"}
              </p>
              {entries.map((e, i) => (
                <p key={e.key} className="tln ind2">
                  <span className="str">&quot;{e.key}&quot;</span>: <span className="str">&quot;</span>
                  <a
                    className="code-link"
                    id={e.key === "Email" ? "mailText" : undefined}
                    href={e.href}
                    {...(e.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {e.value}
                  </a>
                  <span className="str">&quot;</span>
                  {i < entries.length - 1 ? "," : ""}
                  {e.key === "Email" && (
                    <CopyEmail email={site.email} targetId="mailText" labels={{ copy: t("copy"), copied: t("copied"), fail: t("copyFail") }} />
                  )}
                </p>
              ))}
              <p className="tln ind">{"}"}</p>
              <p className="tln" aria-hidden="true">
                <span className="caret" />
              </p>
            </div>
          </div>
          <div className="c-side glass">
            <p className="c-lead">{t("lead")}</p>
            <dl className="readout" aria-hidden="true">
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
