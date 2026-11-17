"use client";
// Árvore 3D da Stack: "Diego" é o tronco; raízes de madeira crescem com a
// rolagem até as 10 tecnologias. Arrastar gira a árvore; os rótulos são
// sprites (sempre virados para a câmera). Os botões de verdade ficam no DOM,
// por cima de cada ponta (acessíveis pelo teclado e leitores de tela).
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThemeDark } from "@/hooks/useThemeDark";
import { clamp, rng } from "@/lib/math";
import { iconSrc, type IconId } from "@/content/techs";
import { CANOPY, combine, cssColor, fillAttr, getLeafGeometry, jag, makeLeafMaterial, taperedTube } from "./assets";

export interface TreeBus {
  /** crescimento das raízes 0..1 */
  p: number;
  /** opacidade da árvore inteira 0..1 */
  fade: number;
  rot: { y: number; v: number; drag: boolean; idle: number };
  hover: boolean[];
  focus: boolean[];
  buttons: (HTMLButtonElement | null)[];
  reduced: boolean;
  cursor: { x: number; y: number };
  /** pede um quadro (o canvas só desenha quando a Stack está por perto) */
  invalidate?: () => void;
  /** a árvore avisa onde está o chão (px dentro da caixa) */
  onGround?: (px: number) => void;
  /** chamado quando a cena 3D está pronta */
  onReady?: () => void;
}

interface Props {
  bus: TreeBus;
  groups: { ref: string; name: string; items: { id: IconId; name: string; ref: string }[] }[];
  rootRef: string;
}

const CAMZ = 14;
const FOV = 38;
const TAN = Math.tan((FOV * Math.PI) / 360);

export default function StackTree(props: Props) {
  return (
    <Canvas
      className="tree-canvas"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      flat
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: FOV, position: [0, 0, CAMZ], near: 0.1, far: 90 }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

/* ---------- rótulos desenhados em canvas ---------- */
function rrect(x: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, r: number) {
  x.beginPath();
  x.moveTo(x0 + r, y0);
  x.arcTo(x0 + w, y0, x0 + w, y0 + h, r);
  x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
  x.arcTo(x0, y0 + h, x0, y0, r);
  x.arcTo(x0, y0, x0 + w, y0, r);
  x.closePath();
}
function fitFont(x: CanvasRenderingContext2D, s: string, w: number, h: number, max: number, fam: string) {
  x.font = `${w} ${h}px ${fam}`;
  const m = x.measureText(s).width;
  if (m > max) x.font = `${w} ${(h * max) / m}px ${fam}`;
}
const fonts = () => ({
  body: cssColor("--font-schibsted", "Arial") + ", Arial, sans-serif",
  mono: cssColor("--font-dm-mono", "Menlo") + ", Menlo, monospace",
});
function chipColors() {
  return {
    chip: cssColor("--sc-chip", "#f7f0e3"),
    edge: cssColor("--sc-edge", "#c9b394"),
    silk: cssColor("--sc-silk", "#231e2b"),
    dim: cssColor("--sc-dim", "#6a5847"),
  };
}

/** ícone monocromático: desenha o SVG e pinta por cima com a cor do texto */
function drawIcon(x: CanvasRenderingContext2D, src: string, color: string, dx: number, dy: number, size: number, done: () => void) {
  const img = new Image();
  img.onload = () => {
    const t = document.createElement("canvas");
    t.width = t.height = size;
    const tx = t.getContext("2d")!;
    tx.drawImage(img, 0, 0, size, size);
    tx.globalCompositeOperation = "source-in";
    tx.fillStyle = color;
    tx.fillRect(0, 0, size, size);
    x.drawImage(t, dx, dy);
    done();
  };
  img.src = src;
}

function tipSprite(name: string, ref: string, icon: string) {
  const C = chipColors();
  const F = fonts();
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const x = cv.getContext("2d")!;
  rrect(x, 18, 10, 220, 236, 28);
  x.fillStyle = C.chip;
  x.globalAlpha = 0.94;
  x.fill();
  x.globalAlpha = 1;
  x.strokeStyle = C.edge;
  x.lineWidth = 3;
  x.stroke();
  x.textAlign = "center";
  x.fillStyle = C.silk;
  fitFont(x, name, 700, 30, 196, F.body);
  x.fillText(name, 128, 196);
  x.fillStyle = C.dim;
  fitFont(x, ref, 500, 18, 196, F.mono);
  x.fillText(ref, 128, 226);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  drawIcon(x, icon, C.silk, 128 - 52, 40, 104, () => (tex.needsUpdate = true));
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
}

function textSprite(ref: string, name: string, big: boolean) {
  const C = chipColors();
  const F = fonts();
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 160;
  const x = cv.getContext("2d")!;
  x.textAlign = "center";
  fitFont(x, name, 700, big ? 76 : 54, 440, F.body);
  const tw = x.measureText(name).width;
  fitFont(x, ref, 500, 24, 440, F.mono);
  const pw = Math.min(500, Math.max(tw, x.measureText(ref).width) + 56);
  rrect(x, 256 - pw / 2, 6, pw, 148, 34);
  x.fillStyle = C.chip;
  x.globalAlpha = 0.94;
  x.fill();
  x.globalAlpha = 1;
  x.strokeStyle = C.edge;
  x.lineWidth = 3;
  x.stroke();
  x.fillStyle = C.dim;
  fitFont(x, ref, 500, 24, 440, F.mono);
  x.fillText(ref, 256, 46);
  x.fillStyle = C.silk;
  fitFont(x, name, 700, big ? 76 : 54, 440, F.body);
  x.fillText(name, 256, big ? 126 : 116);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
}

/* ---------- material da madeira: cresce do começo para a ponta (uP), com veios ---------- */
function makeTreeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uP: { value: 0 },
      uFade: { value: 0 },
      uHi: { value: -99 },
      uHiG: { value: -99 },
      uBark: { value: new THREE.Color("#4a3423") },
      uBarkL: { value: new THREE.Color("#a87b4f") },
      uGlow: { value: new THREE.Color("#e0a54b") },
      uLight: { value: new THREE.Color("#ffe7b0") },
    },
    vertexShader: `attribute float aT; attribute float aU; attribute float aS; attribute float aD; attribute float aId;
      varying float vT; varying float vU; varying float vS; varying float vD; varying float vId; varying vec3 vN; varying vec3 vV;
      void main(){ vT=aT; vU=aU; vS=aS; vD=aD; vId=aId; vec4 mv = modelViewMatrix*vec4(position,1.0);
        vN = normalize(normalMatrix*normal); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uP; uniform float uFade; uniform float uHi; uniform float uHiG;
      uniform vec3 uBark; uniform vec3 uBarkL; uniform vec3 uGlow; uniform vec3 uLight;
      varying float vT; varying float vU; varying float vS; varying float vD; varying float vId; varying vec3 vN; varying vec3 vV;
      void main(){
        float k = clamp((uP - vS) / vD, 0.0, 1.0);
        if (vT > k) discard;
        float head = k < 1.0 ? smoothstep(0.1, 0.0, k - vT) : 0.0;
        float hl = (abs(vId - uHi) < 0.5 || abs(vId - uHiG) < 0.5) ? 1.0 : 0.0;
        vec3 N = normalize(vN);
        // luz quente vindo de cima e da esquerda, como o sol da foto
        float lam = 0.45 + 0.6 * max(dot(N, normalize(vec3(-0.45, 0.8, 0.5))), 0.0);
        float ridge = 0.5 + 0.5 * sin(vU * 6.2831 * 5.0 + sin(vT * 38.0 + vId * 1.7) * 1.8);
        float grain = fract(sin(dot(vec2(floor(vT * 140.0), floor(vU * 18.0)), vec2(12.9898, 78.233))) * 43758.5453);
        vec3 c = mix(uBark, uBarkL, ridge * 0.55 + grain * 0.18) * lam;
        float rim = pow(1.0 - abs(dot(N, normalize(vV))), 2.5);
        c += uLight * rim * 0.22;
        c = mix(c, uGlow, clamp(head * 0.85 + hl * 0.35, 0.0, 1.0));
        gl_FragColor = vec4(c, uFade);
        #include <colorspace_fragment>
      }`,
    transparent: true,
  });
}

type Tip = {
  idx: number;
  gi: number;
  p: THREE.Vector3;
  tEnd: number;
  sprite: THREE.Sprite;
  hv: number;
  depth: number;
  vis: boolean;
  bw: number;
  sw: number;
};

function buildTree(groups: Props["groups"], rootRef: string, mob: boolean, treeMat: THREE.ShaderMaterial, leafMat: THREE.Material, dotMat: THREE.Material) {
  const r = rng(2026);
  const nLeaf = groups.reduce((a, g) => a + g.items.length, 0);
  const R1 = mob ? 1.25 : 1.75;
  const R2 = mob ? 2.7 : 3.8;
  const yGround = 0.9;
  const yG = -0.35;
  const yTip = -1.8;
  const trunkTop = 2.6;
  const canY = 3.35;
  const canR = mob ? 1.45 : 2.1;
  const canRy = mob ? 0.95 : 1.15;
  const slots = nLeaf + groups.length * 0.7;
  let az = 0.35;
  let li = 0;
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);
  const geos: THREE.BufferGeometry[] = [];
  const disp: { dispose: () => void }[] = [];
  const rootP = new THREE.Vector3(0, yGround, 0);
  const tips: Tip[] = [];
  const gnodes: { p: THREE.Vector3; sprite: THREE.Sprite; gi: number; tEnd: number }[] = [];
  const addPath = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    amp: number,
    depth: number,
    rad: number,
    tEnd: number,
    start: number,
    dur: number,
    id: number,
    seg: number,
  ) => {
    const curve = new THREE.CatmullRomCurve3(jag(a, b, amp, depth, r), false, "catmullrom", 0.25);
    const g = taperedTube(curve, seg, rad, 6, tEnd);
    fillAttr(g, "aS", start);
    fillAttr(g, "aD", dur);
    fillAttr(g, "aId", id);
    geos.push(g);
    return curve;
  };
  // raízes finas saindo das grossas
  const rootlets = (curve: THREE.Curve<THREE.Vector3>, start: number, dur: number, id: number, rad: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const t = 0.2 + r() * 0.65;
      const p = curve.getPointAt(t);
      const tg = curve.getTangentAt(t);
      const side = new THREE.Vector3(r() - 0.5, -0.35 - r() * 0.5, r() - 0.5).normalize();
      const end = p.clone().addScaledVector(side.add(tg.multiplyScalar(0.5)).normalize(), 0.3 + r() * 0.5);
      addPath(p, end, 0.3, 3, rad, 0.15, start + t * dur, dur * 0.35, id, 12);
    }
  };
  // tronco e galhos da copa: sempre visíveis (começam "antes" do crescimento)
  addPath(new THREE.Vector3(0, yGround - 0.05, 0), new THREE.Vector3(0.05, trunkTop, 0), 0.04, 2, mob ? 0.2 : 0.24, 0.5, -2, 0.01, -60, 24);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r();
    const e = new THREE.Vector3(Math.sin(a) * canR * 0.72, canY + (r() - 0.3) * canRy * 0.8, Math.cos(a) * canR * 0.72);
    addPath(new THREE.Vector3(0, trunkTop - 0.3 - r() * 0.4, 0), e, 0.12, 3, 0.085, 0.25, -2, 0.01, -61, 20);
  }
  groups.forEach((g, gi) => {
    const azs: number[] = [];
    g.items.forEach(() => {
      azs.push((az / slots) * Math.PI * 2);
      az += 1;
    });
    az += 0.7;
    const ga = azs.reduce((a, v) => a + v, 0) / azs.length;
    const gp = new THREE.Vector3(Math.sin(ga) * R1, yG - (gi % 2) * 0.22, Math.cos(ga) * R1);
    const start = 0.02 + gi * 0.05;
    const c = addPath(rootP, gp, 0.16, 4, 0.11, 0.45, start, 0.26, -1 - gi, 40);
    rootlets(c, start, 0.26, -1 - gi, 0.022, 3);
    gnodes.push({ p: gp, sprite: textSprite(g.ref, g.name, false), gi, tEnd: start + 0.26 });
    g.items.forEach((it, k) => {
      const a = azs[k];
      const tp = new THREE.Vector3(Math.sin(a) * R2, yTip - ((li + gi) % 2) * 0.38, Math.cos(a) * R2);
      const st = 0.3 + li * 0.045;
      const lc = addPath(gp, tp, 0.15, 4, 0.055, 0.3, st, 0.24, li, 40);
      rootlets(lc, st, 0.24, li, 0.014, 2);
      tips.push({ idx: li, gi, p: tp, tEnd: st + 0.24, sprite: tipSprite(it.name, it.ref, iconSrc(it.id)), hv: 0, depth: 0, vis: false, bw: 0, sw: 1 });
      li++;
    });
  });
  const geo = combine(geos);
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, treeMat);
  mesh.frustumCulled = false;
  inner.add(mesh);
  // copa: muitas folhas num elipsoide em volta do topo do tronco, verdes como a árvore da foto
  const NC = mob ? 220 : 420;
  const cr = rng(5);
  const canopy = new THREE.InstancedMesh(getLeafGeometry(), leafMat, NC);
  canopy.frustumCulled = false;
  const V = new THREE.Vector3();
  const Q = new THREE.Quaternion();
  const M4 = new THREE.Matrix4();
  const S = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < NC; i++) {
    V.set(cr() - 0.5, cr() - 0.5, cr() - 0.5).normalize();
    const rr = 0.5 + cr() * 0.5;
    const p = new THREE.Vector3(V.x * canR * rr, canY + V.y * canRy * rr, V.z * canR * rr);
    Q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), V).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, cr() * 6.28)));
    M4.compose(p, Q, S.setScalar(0.34 + cr() * 0.26));
    canopy.setMatrixAt(i, M4);
    // folhas de baixo um pouco mais escuras (sombra da própria copa)
    const shade = V.y < -0.2 ? 0 : V.y > 0.4 ? 4 : 1 + Math.floor(cr() * 3);
    canopy.setColorAt(i, col.set(CANOPY[Math.min(CANOPY.length - 1, shade)]));
  }
  inner.add(canopy);
  // miolo da copa: bolhas verde-escuras que dão volume e tapam os buracos entre as folhas
  const blobMat = new THREE.MeshLambertMaterial({ color: "#3f6e25" });
  const blobGeo = new THREE.IcosahedronGeometry(1, 2);
  const crown = new THREE.Group();
  inner.add(crown);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const b = new THREE.Mesh(blobGeo, blobMat);
    b.position.set(Math.sin(a) * canR * 0.38, canY + (cr() - 0.5) * canRy * 0.5, Math.cos(a) * canR * 0.38);
    b.scale.set(canR * 0.48, canRy * 0.62, canR * 0.48);
    crown.add(b);
  }
  disp.push(blobMat, blobGeo);
  // pontos de luz quente nas pontas
  const sph = new THREE.SphereGeometry(1, 14, 10);
  const dots = new THREE.InstancedMesh(sph, dotMat, gnodes.length + tips.length);
  dots.frustumCulled = false;
  inner.add(dots);
  const rootS = textSprite(rootRef, "Diego", true);
  rootS.position.set(0, yGround + 0.78, 0.3);
  rootS.scale.set(1.9, 0.6, 1);
  inner.add(rootS);
  gnodes.forEach((g) => {
    g.sprite.position.copy(g.p).add(new THREE.Vector3(0, 0.34, 0));
    g.sprite.scale.set(1.35, 0.42, 1);
    inner.add(g.sprite);
  });
  const tipW = mob ? 1.0 : 1.15;
  tips.forEach((n) => {
    n.sprite.position.copy(n.p).add(new THREE.Vector3(0, -0.62 * tipW, 0));
    n.sprite.scale.set(tipW, tipW, 1);
    n.sw = tipW;
    inner.add(n.sprite);
  });
  disp.push(geo, sph, rootS.material.map!, rootS.material);
  gnodes.forEach((g) => disp.push(g.sprite.material.map!, g.sprite.material));
  tips.forEach((n) => disp.push(n.sprite.material.map!, n.sprite.material));
  return {
    group,
    inner,
    canopy,
    crown,
    dots,
    tips,
    gnodes,
    rootS,
    R2,
    tipW,
    yGround,
    top: canY + canRy + 0.4,
    bot: yTip - 0.38 - R2 * Math.sin(0.22) - tipW * 1.15,
    dispose: () => {
      disp.forEach((o) => o.dispose());
      canopy.dispose();
      dots.dispose();
    },
  };
}

function Scene({ bus, groups, rootRef }: Props) {
  const dark = useThemeDark();
  const { camera, size, invalidate, scene } = useThree();
  const mob = size.width < 640;
  const mats = useMemo(
    () => ({
      tree: makeTreeMaterial(),
      leaf: makeLeafMaterial(),
      dot: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
    }),
    [],
  );
  const TR = useMemo(() => buildTree(groups, rootRef, mob, mats.tree, mats.leaf, mats.dot), [groups, rootRef, mob, mats]);

  // cores vêm do tema (CSS); recarrega quando o tema muda
  useEffect(() => {
    const apply = () => {
      const u = mats.tree.uniforms;
      (u.uBark.value as THREE.Color).set(cssColor("--bark", "#4a3423"));
      (u.uBarkL.value as THREE.Color).set(cssColor("--wood-light", "#a87b4f"));
      (u.uGlow.value as THREE.Color).set(cssColor("--glow", "#e0a54b"));
      mats.dot.color.set(cssColor("--glow", "#e0a54b"));
      invalidate();
    };
    apply();
    window.addEventListener("themechange", apply);
    return () => window.removeEventListener("themechange", apply);
  }, [mats, invalidate]);

  useEffect(() => {
    scene.add(TR.group);
    bus.invalidate = invalidate;
    bus.onReady?.();
    return () => {
      scene.remove(TR.group);
      TR.dispose();
    };
  }, [TR, scene, bus, invalidate]);

  useEffect(
    () => () => {
      mats.tree.dispose();
      mats.leaf.dispose();
      mats.dot.dispose();
    },
    [mats],
  );

  // encaixe: a árvore ocupa a caixa inteira, com folga
  const fit = useMemo(() => {
    const hh0 = CAMZ * TAN;
    const hw0 = hh0 * (size.width / Math.max(1, size.height));
    const ext = TR.R2 + TR.tipW * 0.55;
    const s = Math.min((2 * hw0) / (2 * ext), (2 * hh0) / (TR.top - TR.bot)) * 0.96;
    const cy = (TR.top + TR.bot) / 2 - 0.15;
    const bw = Math.round(((TR.tipW * s) / (2 * hw0)) * size.width * 0.86);
    return { s, cy, bw };
  }, [TR, size.width, size.height]);

  // tamanho dos alvos do DOM = tamanho da ficha na tela
  useEffect(() => {
    TR.tips.forEach((n) => {
      n.bw = fit.bw;
      const b = bus.buttons[n.idx];
      if (b) {
        b.style.width = `${fit.bw}px`;
        b.style.height = `${fit.bw}px`;
      }
    });
  }, [TR, fit, bus]);

  const tmp = useMemo(
    () => ({ V: new THREE.Vector3(), M4: new THREE.Matrix4(), Q: new THREE.Quaternion(), S: new THREE.Vector3(), cam: { x: 0, y: 0 }, auto: 0 }),
    [],
  );

  // onde fica o chão na tela (sem paralaxe do cursor): a paisagem alinha a terra aqui
  useEffect(() => {
    const { V } = tmp;
    TR.group.position.set(0, -fit.cy * fit.s, 0);
    TR.group.rotation.set(0.22, 0, 0);
    TR.group.scale.setScalar(fit.s);
    TR.group.updateMatrixWorld(true);
    camera.position.set(0, 0, CAMZ);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    V.set(0, TR.yGround, 0);
    TR.inner.localToWorld(V);
    V.project(camera);
    bus.onGround?.((1 - V.y) * 0.5 * size.height);
    invalidate();
  }, [TR, fit, camera, size.height, bus, tmp, invalidate]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const { V, M4, Q, S, cam } = tmp;
    const RM = bus.reduced;
    const ROT = bus.rot;
    // paralaxe leve do cursor
    const k = 1 - Math.exp(-dt * 2.2);
    cam.x += ((RM ? 0 : bus.cursor.x) - cam.x) * k;
    cam.y += ((RM ? 0 : bus.cursor.y) - cam.y) * k;
    camera.position.set(cam.x * 0.3, -cam.y * 0.2, CAMZ);
    camera.lookAt(0, 0, 0);
    // giro: inércia depois de arrastar e, parada, uma volta lenta sozinha
    if (!ROT.drag) {
      ROT.v = clamp(ROT.v, -6, 6);
      ROT.y += ROT.v * dt;
      ROT.v *= Math.exp(-dt * 2.6);
      ROT.idle += dt;
      if (!RM && ROT.idle > 2.5) {
        tmp.auto += (0.12 - tmp.auto) * (1 - Math.exp(-dt * 0.8));
        ROT.y += tmp.auto * dt;
      } else tmp.auto = 0;
    } else tmp.auto = 0;
    TR.group.position.set(0, -fit.cy * fit.s, 0);
    TR.group.rotation.set(0.22 + (RM ? 0 : cam.y * 0.04), 0, 0);
    TR.inner.rotation.y = ROT.y + (RM ? 0 : cam.x * 0.08);
    TR.canopy.rotation.z = RM ? 0 : Math.sin(state.clock.elapsedTime * 0.7) * 0.02;
    TR.group.scale.setScalar(fit.s);
    const fade = bus.fade;
    const uP = RM ? 1 : bus.p;
    mats.tree.uniforms.uP.value = uP;
    mats.tree.uniforms.uFade.value = fade;
    TR.canopy.visible = fade > 0.02;
    TR.crown.visible = fade > 0.02;
    let hi = -99;
    let hiG = -99;
    TR.tips.forEach((n) => {
      const on = bus.hover[n.idx] || bus.focus[n.idx];
      n.hv += ((on ? 1 : 0) - n.hv) * (1 - Math.exp(-dt * 10));
      if (on) {
        hi = n.idx;
        hiG = -1 - n.gi;
      }
    });
    mats.tree.uniforms.uHi.value = hi;
    mats.tree.uniforms.uHiG.value = hiG;
    mats.dot.opacity = fade * 0.9;
    TR.group.updateMatrixWorld(true);
    let di = 0;
    const setDot = (p: THREE.Vector3, rr: number) => {
      M4.compose(p, Q.identity(), S.setScalar(Math.max(rr, 0.0001)));
      TR.dots.setMatrixAt(di++, M4);
    };
    const cz = TR.group.position.z;
    const rz = TR.R2 * fit.s;
    TR.gnodes.forEach((g) => {
      const kk = clamp((uP - g.tEnd + 0.02) / 0.04);
      setDot(g.p, 0.07 * kk);
      g.sprite.getWorldPosition(V);
      const dp = clamp((V.z - (cz - rz * 0.5)) / rz);
      g.sprite.material.opacity = fade * kk * (0.3 + 0.7 * dp);
      g.sprite.renderOrder = 5 + Math.round(dp * 4);
    });
    TR.rootS.material.opacity = fade;
    TR.tips.forEach((n) => {
      const kk = clamp((uP - n.tEnd + 0.02) / 0.05);
      setDot(n.p, (0.06 + n.hv * 0.05) * kk);
      n.sprite.getWorldPosition(V);
      const depth = clamp((V.z - (cz - rz)) / (2 * rz));
      n.depth = depth;
      // atrás fica mais apagado; o que está na frente fica nítido
      n.sprite.material.opacity = fade * kk * (0.42 + 0.58 * depth) * (1 + n.hv * 0.3);
      n.sprite.scale.setScalar(n.sw * (1 + n.hv * 0.14));
      n.sprite.renderOrder = 10 + Math.round(depth * 100);
      n.vis = kk > 0.5 && fade > 0.3;
    });
    TR.dots.instanceMatrix.needsUpdate = true;
    // alvos do DOM em cima de cada ponta
    const W = state.size.width;
    const H = state.size.height;
    TR.tips.forEach((n) => {
      const b = bus.buttons[n.idx];
      if (!b) return;
      n.sprite.getWorldPosition(V);
      V.project(camera);
      const x = (V.x + 1) * 0.5 * W - n.bw / 2;
      const y = (1 - V.y) * 0.5 * H - n.bw / 2;
      b.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      b.style.zIndex = String(10 + Math.round(n.depth * 100));
      b.style.visibility = n.vis || bus.focus[n.idx] ? "visible" : "hidden";
    });
    // enquanto gira sozinha ou ainda desacelera, pede o próximo quadro
    if (Math.abs(ROT.v) > 0.001 || tmp.auto > 0.0005 || TR.tips.some((n) => Math.abs(n.hv - (bus.hover[n.idx] || bus.focus[n.idx] ? 1 : 0)) > 0.01))
      invalidate();
  });

  return (
    <>
      <hemisphereLight args={["#fff1cf", "#4a6a2a", dark ? 0.55 : 1.15]} />
      <directionalLight position={[-4, 7, 6]} intensity={dark ? 0.6 : 1.3} color={dark ? "#c9b8ff" : "#ffe2a8"} />
      <ambientLight intensity={0.15} />
    </>
  );
}
