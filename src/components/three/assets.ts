// Peças 3D compartilhadas: textura e geometria da folha, tubo afinado (galhos
// e raízes), cores lidas dos tokens CSS. Criadas uma vez e reaproveitadas.
import * as THREE from "three";
import { lerp } from "@/lib/math";

let leafTex: THREE.CanvasTexture | null = null;
let leafGeo: THREE.BufferGeometry | null = null;

/** folha branca com nervuras: a cor vem de cada instância (setColorAt) */
export function getLeafTexture() {
  if (leafTex) return leafTex;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const x = c.getContext("2d")!;
  x.beginPath();
  x.moveTo(64, 236);
  x.bezierCurveTo(2, 186, 8, 68, 64, 8);
  x.bezierCurveTo(120, 68, 126, 186, 64, 236);
  x.closePath();
  x.fillStyle = "#ffffff";
  x.fill();
  x.strokeStyle = "#d6d6d6";
  x.lineWidth = 3;
  x.stroke();
  x.strokeStyle = "#c4c4c4";
  x.lineWidth = 3.2;
  x.beginPath();
  x.moveTo(64, 250);
  x.lineTo(64, 20);
  x.stroke();
  x.lineWidth = 1.6;
  x.strokeStyle = "#d2d2d2";
  for (let i = 1; i <= 6; i++) {
    const y = 222 - i * 30;
    const w = 22 + Math.sin((i / 7) * Math.PI) * 26;
    x.beginPath();
    x.moveTo(64, y);
    x.quadraticCurveTo(64 - w * 0.5, y - 10, 64 - w, y - 26);
    x.moveTo(64, y);
    x.quadraticCurveTo(64 + w * 0.5, y - 10, 64 + w, y - 26);
    x.stroke();
  }
  leafTex = new THREE.CanvasTexture(c);
  leafTex.colorSpace = THREE.SRGBColorSpace;
  return leafTex;
}

/** plano curvado como uma folha de verdade (não um cartão chapado) */
export function getLeafGeometry() {
  if (leafGeo) return leafGeo;
  const g = new THREE.PlaneGeometry(0.55, 1, 4, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, 0.55 * x * x + 0.22 * (y + 0.5) * (y + 0.5) - 0.05);
  }
  g.computeVertexNormals();
  leafGeo = g;
  return g;
}

export function makeLeafMaterial() {
  return new THREE.MeshLambertMaterial({ map: getLeafTexture(), alphaTest: 0.5, side: THREE.DoubleSide });
}

/** lê um token de cor do CSS (muda com o tema) */
export function cssColor(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** verdes da copa, parecidos com a árvore da foto */
export const CANOPY = ["#4e8a2a", "#5e9e2f", "#6fae3a", "#7fb843", "#9ccb5a", "#3f7322"];

/** tubo que afina: cada anel encolhe em direção ao centro da curva */
export function taperedTube(curve: THREE.Curve<THREE.Vector3>, seg: number, rad: number, radial: number, tEnd: number) {
  const g = new THREE.TubeGeometry(curve, seg, rad, radial, false);
  const p = g.attributes.position;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const c = curve.getPointAt(t);
    const f = lerp(1, tEnd, t);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.setXYZ(k, c.x + (p.getX(k) - c.x) * f, c.y + (p.getY(k) - c.y) * f, c.z + (p.getZ(k) - c.z) * f);
    }
  }
  g.computeVertexNormals();
  const ng = g.toNonIndexed();
  g.dispose();
  // aT = posição ao longo do tubo (0..1); aU = volta em torno dele
  const uv = ng.attributes.uv;
  const n = uv.count;
  const at = new Float32Array(n);
  const au = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    at[i] = uv.getX(i);
    au[i] = uv.getY(i);
  }
  ng.setAttribute("aT", new THREE.BufferAttribute(at, 1));
  ng.setAttribute("aU", new THREE.BufferAttribute(au, 1));
  ng.deleteAttribute("uv");
  return ng;
}

/** junta várias geometrias não indexadas num desenho só (uma chamada de GPU) */
export function combine(list: THREE.BufferGeometry[]) {
  const names = Object.keys(list[0].attributes);
  let n = 0;
  list.forEach((g) => (n += g.attributes.position.count));
  const out = new THREE.BufferGeometry();
  names.forEach((nm) => {
    const sz = list[0].attributes[nm].itemSize;
    const arr = new Float32Array(n * sz);
    let o = 0;
    list.forEach((g) => {
      arr.set(g.attributes[nm].array as Float32Array, o);
      o += g.attributes[nm].array.length;
    });
    out.setAttribute(nm, new THREE.BufferAttribute(arr, sz));
  });
  return out;
}

export function fillAttr(g: THREE.BufferGeometry, nm: string, v: number) {
  const n = g.attributes.position.count;
  g.setAttribute(nm, new THREE.BufferAttribute(new Float32Array(n).fill(v), 1));
}

/** caminho torto, como raiz: deslocamento do ponto médio em 3D */
export function jag(a: THREE.Vector3, b: THREE.Vector3, amp: number, depth: number, r: () => number) {
  let pts = [a.clone(), b.clone()];
  for (let d = 0; d < depth; d++) {
    const np = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const len = p.distanceTo(q);
      const dir = q.clone().sub(p).normalize();
      const off = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5);
      off.sub(dir.clone().multiplyScalar(off.dot(dir))).normalize();
      np.push(
        p
          .clone()
          .add(q)
          .multiplyScalar(0.5)
          .addScaledVector(off, len * amp * (0.25 + r() * 0.75)),
        q,
      );
    }
    pts = np;
  }
  return pts;
}

/** testa se dá para usar WebGL (sem isso a página usa os desenhos em SVG) */
export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
