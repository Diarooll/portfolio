// Stack, versão sem WebGL (e enquanto o 3D carrega): as mesmas peças em 2D,
// num círculo inclinado (uma elipse invisível) em volta de um centro vazio.
// Com a rolagem as peças chegam uma a uma. Tudo continua sendo botão de verdade.
import { clamp, easeOut } from "@/lib/math";

export interface FallbackOrbit {
  update: (p: number, reduced: boolean) => void;
  clear: () => void;
}

/** ângulos com um respiro maior entre grupos (igual ao 3D) */
function angles(groupOf: number[]) {
  const gap = 0.55;
  const groups = new Set(groupOf).size;
  const units = groupOf.length + groups * gap;
  let u = 0;
  return groupOf.map((g, i) => {
    if (i > 0 && g !== groupOf[i - 1]) u += gap;
    const a = (u / units) * Math.PI * 2;
    u += 1;
    return a;
  });
}

export function layoutFallback(tree: HTMLElement, svg: SVGSVGElement, leaves: HTMLElement[], groupOf: number[]): FallbackOrbit | null {
  svg.textContent = "";
  const W = tree.clientWidth;
  const H = tree.clientHeight;
  if (!W || !H) return null;
  const mob = window.innerWidth < 700;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const cx = W / 2;
  const cy = H * 0.5;
  // no celular a elipse é mais alta, para caber as 10 peças sem amontoar
  const rx = mob ? W * 0.36 : Math.min(W * 0.42, H * 1.05);
  const ry = mob ? H * 0.36 : H * 0.3;
  const put = (el: HTMLElement, x: number, y: number) => {
    el.style.left = `${x.toFixed(1)}px`;
    el.style.top = `${y.toFixed(1)}px`;
  };
  const A = angles(groupOf);
  const pos = A.map((a) => [cx + Math.cos(a + Math.PI / 2) * rx, cy + Math.sin(a + Math.PI / 2) * ry] as const);
  leaves.forEach((el) => {
    el.style.width = mob ? "72px" : "104px";
  });
  return {
    update(p, reduced) {
      const pp = reduced ? 1 : p;
      const n = leaves.length;
      leaves.forEach((el, i) => {
        const k = reduced ? 1 : easeOut(clamp((pp - 0.05 - (i / n) * 0.5) / 0.3));
        // sai do centro e vai até o lugar na elipse
        const x = cx + (pos[i][0] - cx) * k;
        const y = cy + (pos[i][1] - cy) * k;
        put(el, x, y);
        el.style.opacity = k.toFixed(3);
        el.style.visibility = k > 0.01 ? "visible" : "hidden";
        el.style.transform = `translate(-50%, -50%) scale(${(0.6 + 0.4 * k).toFixed(3)})`;
        // a de baixo (mais perto de quem olha) fica por cima
        el.style.zIndex = String(10 + Math.round(((pos[i][1] - cy) / ry + 1) * 20));
      });
    },
    clear() {
      svg.textContent = "";
      leaves.forEach((el) => el.removeAttribute("style"));
    },
  };
}
