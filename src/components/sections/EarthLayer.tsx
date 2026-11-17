"use client";
// Fundo do Contato: a Terra girando no espaço. O 3D só carrega perto da tela,
// para de desenhar fora dela e fica parado com movimento reduzido. Sem WebGL,
// a mesma composição em CSS (foto recortada num círculo).
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { EARTH } from "@/content/earth";
import { hasWebGL } from "@/lib/webgl";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import styles from "./EarthLayer.module.css";

const EarthBackdrop = dynamic(() => import("@/components/three/EarthBackdrop"), { ssr: false });

export default function EarthLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInViewOnce(ref, "100% 0px");
  const [gl, setGl] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setReduced(document.documentElement.dataset.motion === "reduced");
    setMobile(window.innerWidth < 700);
  }, []);
  useEffect(() => {
    if (near && hasWebGL()) setGl(true);
  }, [near]);
  // desenha só quando a seção está na tela
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const onReady = useCallback(() => setReady(true), []);

  const L = mobile ? EARTH.mobile : EARTH.desktop;
  const r = mobile ? `calc(${L.r * 2.1} * 100vw)` : `calc(${L.r} * 100svh)`;
  return (
    <div ref={ref} className={styles.layer} aria-hidden="true">
      <div className={styles.sticky}>
        <div className={`${styles.fallback}${ready ? ` ${styles.hidden}` : ""}`}>
          <div className={styles.globe} style={{ ["--x" as string]: L.x, ["--y" as string]: L.y, ["--r" as string]: r } as CSSProperties} />
        </div>
        {gl && (
          <ErrorBoundary onError={() => setGl(false)}>
            <EarthBackdrop active={active} reduced={reduced} onReady={onReady} />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}
