"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { useSection } from "@/hooks/useSection";

export default function Footer() {
  const t = useTranslations("footer");
  const ref = useRef<HTMLElement>(null);
  // "fim" marca o fim da página para a barra de progresso da navegação
  useSection("fim", ref);
  return (
    <footer ref={ref} className="site-foot">
      <div className="wrap">
        <p className="glass">
          {t("text", { year: new Date().getFullYear() })} <a href="#hero">{t("top")} ↑</a>
        </p>
      </div>
    </footer>
  );
}
