"use client";
import { useEffect, useState } from "react";

/** o tema anoitecer está ligado? (para as luzes das cenas 3D) */
export function useThemeDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark(document.documentElement.dataset.theme === "dark");
    read();
    window.addEventListener("themechange", read);
    return () => window.removeEventListener("themechange", read);
  }, []);
  return dark;
}
