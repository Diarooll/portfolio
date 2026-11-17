"use client";
import { useEffect, useState, type RefObject } from "react";

/**
 * Vira true (uma vez) quando o elemento chega perto da tela.
 * Usado para só baixar o 3D de uma seção quando ela está para aparecer.
 */
export function useInViewOnce(ref: RefObject<Element | null>, rootMargin = "100% 0px") {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, seen]);
  return seen;
}
