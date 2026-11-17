"use client";
// Botão de tema: dia (padrão) ou anoitecer. A escolha fica salva no navegador.
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { THEME_KEY } from "@/lib/motion";

export const THEME_EVENT = "themechange";

export default function ThemeToggle() {
  const t = useTranslations("nav");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* navegação privada: tudo bem, só não lembra */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const label = dark ? t("themeToLight") : t("themeToDark");
  return (
    <button className="icon-btn" type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={dark}>
      {dark ? (
        // lua: estamos no anoitecer
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      ) : (
        // sol: estamos de dia
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
        </svg>
      )}
    </button>
  );
}
