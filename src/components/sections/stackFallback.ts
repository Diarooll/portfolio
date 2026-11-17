// Árvore da Stack em SVG: usada sem WebGL (e enquanto o 3D carrega).
// Mesmo desenho do protótipo: tronco, grupos e pontas, com as raízes
// crescendo com a rolagem (stroke-dashoffset). No celular vira uma lista
// vertical com a raiz descendo pela esquerda.
import { clamp, easeOut } from "@/lib/math";

const NS = "http://www.w3.org/2000/svg";
type Pt = [number, number];
const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** caminho com cantos arredondados */
export function rpath(pts0: Pt[], r: number) {
  const pts = pts0.filter((p, i) => i === 0 || dist(p, pts0[i - 1]) > 0.5);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const l1 = dist(p0, p1);
    const l2 = dist(p1, p2);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const a = [p1[0] + ((p0[0] - p1[0]) * rr) / l1, p1[1] + ((p0[1] - p1[1]) * rr) / l1];
    const b = [p1[0] + ((p2[0] - p1[0]) * rr) / l2, p1[1] + ((p2[1] - p1[1]) * rr) / l2];
    d += ` L${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${p1[0].toFixed(1)} ${p1[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }
  const e = pts[pts.length - 1];
  return d + ` L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
}

/** rota em degraus a 45°: desce, vira, desce */
export function route(x0: number, y0: number, x1: number, y1: number): Pt[] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const s = dx < 0 ? -1 : 1;
  if (Math.abs(dx) < 1)
    return [
      [x0, y0],
      [x1, y1],
    ];
  const d = Math.min(Math.abs(dx), dy * 0.5);
  const ym = (y0 + y1) / 2;
  const pts: Pt[] = [
    [x0, y0],
    [x0, ym - d / 2],
    [x0 + s * d, ym + d / 2],
  ];
  if (Math.abs(dx) > d + 0.5) pts.push([x1, ym + d / 2]);
  pts.push([x1, y1]);
  return pts;
}

interface Node {
  el: HTMLElement;
  tf: string;
}
interface Item {
  path?: SVGPathElement;
  node?: Node;
  vias?: SVGCircleElement[];
  start: number;
  dur: number;
}

export interface FallbackTree {
  update: (p: number, reduced: boolean) => void;
  /** y (px, dentro da caixa) onde fica o chão */
  ground: number;
  clear: () => void;
}

export function layoutFallback(
  tree: HTMLElement,
  svg: SVGSVGElement,
  rootEl: HTMLElement,
  groups: { el: HTMLElement; leaves: HTMLElement[] }[],
): FallbackTree | null {
  svg.textContent = "";
  const W = tree.clientWidth;
  const H = tree.clientHeight;
  if (!W || !H) return null;
  const v = window.innerWidth < 700;
  tree.classList.toggle("v", v);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const items: Item[] = [];
  const mkPath = (d: string, cls = "") => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("pathLength", "1");
    p.setAttribute("class", `rt ${cls}`);
    p.style.strokeDashoffset = "1";
    svg.appendChild(p);
    return p;
  };
  const mkVia = (x: number, y: number) => {
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", x.toFixed(1));
    c.setAttribute("cy", y.toFixed(1));
    c.setAttribute("r", "5");
    c.setAttribute("class", "via");
    svg.appendChild(c);
    return c;
  };
  const put = (el: HTMLElement, x: number, y: number) => {
    el.style.left = `${x.toFixed(1)}px`;
    el.style.top = `${y.toFixed(1)}px`;
  };
  let ground = 60;
  let rootTf = "";
  if (!v) {
    const rootX = W / 2;
    const rootY = 36;
    const y1 = H * 0.26;
    const y2 = H * 0.48;
    const y3 = H * 0.76;
    ground = rootY + 30;
    put(rootEl, rootX, rootY);
    const all: { el: HTMLElement; gi: number; x: number }[] = [];
    groups.forEach((g, gi) => g.leaves.forEach((el) => all.push({ el, gi, x: 0 })));
    const n = all.length;
    const gg = Math.max(26, W * 0.035);
    const m = 52;
    const step = Math.min(132, (W - 2 * m - (groups.length - 1) * gg) / (n - 1));
    const total = step * (n - 1) + (groups.length - 1) * gg;
    let x = (W - total) / 2;
    all.forEach((l, i) => {
      if (i > 0) {
        x += step;
        if (all[i - 1].gi !== l.gi) x += gg;
      }
      l.x = x;
    });
    const trunk = mkPath(rpath(route(rootX, rootY + 28, rootX, y1), 10), "trunk");
    items.push({ path: trunk, vias: [mkVia(rootX, y1)], start: 0, dur: 0.14 });
    let li = 0;
    groups.forEach((g, gi) => {
      const mine = all.filter((l) => l.gi === gi);
      const gx = mine.reduce((a, l) => a + l.x, 0) / mine.length;
      put(g.el, gx, y2);
      items.push({
        path: mkPath(rpath(route(rootX, y1, gx, y2 - 24), 12)),
        node: { el: g.el, tf: "translate(-50%, -50%) scale(S)" },
        vias: [mkVia(gx, y2 + 30)],
        start: 0.12 + gi * 0.07,
        dur: 0.2,
      });
      mine.forEach((l) => {
        put(l.el, l.x, y3);
        l.el.style.width = `${Math.min(112, step - 2).toFixed(0)}px`;
        items.push({
          path: mkPath(rpath(route(gx, y2 + 30, l.x, y3 - 30), 12)),
          node: { el: l.el, tf: "translate(-50%, -26px) scale(S)" },
          start: 0.32 + li * 0.05,
          dur: 0.16,
        });
        li++;
      });
    });
    rootTf = "translate(-50%, -50%) scale(S)";
  } else {
    const rows = 1 + groups.length + groups.reduce((a, g) => a + g.leaves.length, 0);
    const rh = clamp((H - 14) / rows, 26, 46);
    const ry = (i: number) => 7 + rh * (i + 0.5);
    const tx = 14;
    put(rootEl, 28, ry(0));
    ground = ry(0) + rh * 0.5;
    let row = 1;
    let lr = 1;
    groups.forEach((g, gi) => {
      if (gi < groups.length - 1) lr += 1 + g.leaves.length;
    });
    const y0 = ry(0);
    const lastG = ry(lr);
    const S = (y: number) => (0.6 * (y - y0)) / (lastG - y0);
    items.push({ path: mkPath(`M${tx} ${y0} L${tx} ${lastG}`, "trunk"), start: 0, dur: 0.62 });
    items.push({ path: mkPath(`M${tx} ${y0} L26 ${y0}`), start: 0, dur: 0.03 });
    groups.forEach((g) => {
      const gy = ry(row++);
      put(g.el, 28, gy);
      items.push({
        path: mkPath(`M${tx} ${gy} L26 ${gy}`),
        node: { el: g.el, tf: "translate(0, -50%) scale(S)" },
        vias: [mkVia(tx, gy)],
        start: Math.max(0, S(gy) - 0.01),
        dur: 0.04,
      });
      g.leaves.forEach((el, k) => {
        const ly = ry(row++);
        put(el, 64, ly);
        el.style.width = "";
        items.push({
          path: mkPath(
            rpath(
              [
                [tx, gy + 6],
                [tx, ly - 12],
                [tx + 12, ly],
                [58, ly],
              ],
              8,
            ),
          ),
          node: { el, tf: "translate(0, -50%) scale(S)" },
          start: S(gy) + 0.02 + k * 0.04,
          dur: 0.12,
        });
      });
    });
    rootTf = "translate(0, -50%) scale(S)";
  }
  const setNode = (n: Node, r: number, reduced: boolean) => {
    n.el.style.opacity = r.toFixed(3);
    n.el.style.visibility = r > 0.01 ? "visible" : "hidden";
    n.el.style.transform = n.tf.replace("S", reduced ? "1" : (0.6 + 0.4 * easeOut(r)).toFixed(3));
  };
  setNode({ el: rootEl, tf: rootTf }, 1, false);
  return {
    ground,
    update(p, reduced) {
      const pp = reduced ? 1 : p;
      items.forEach((it) => {
        const k = clamp((pp - it.start) / it.dur);
        if (it.path) it.path.style.strokeDashoffset = (1 - k).toFixed(4);
        it.vias?.forEach((vv) => (vv.style.opacity = k > 0.04 ? "1" : "0"));
        if (it.node) setNode(it.node, it.path ? clamp((k - 0.8) / 0.2) : k, reduced);
      });
    },
    clear() {
      svg.textContent = "";
      tree.classList.remove("v");
      tree.querySelectorAll<HTMLElement>(".tn").forEach((el) => el.removeAttribute("style"));
    },
  };
}
