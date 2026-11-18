"use client";
// Stack: as 10 tecnologias como broches grossos de cantos arredondados (tipo
// fatia de pão), girando juntas em volta de um centro invisível, num círculo
// inclinado. Nada desenhado no centro, sem anel e sem linhas: só as peças,
// cada uma balançando e flutuando de leve, como ao vento, e girando devagar
// sobre o próprio eixo. Material físico (verniz leve, borda chanfrada), logo
// na cor da marca e gravado na face, frente e verso iguais. A luz vem de um
// "céu" gerado na cena (Environment com Lightformers, sem baixar HDRI).
// Arrastar gira o conjunto. Os botões de verdade ficam no DOM, por cima de
// cada peça (teclado e leitor de tela); aqui só desenhamos.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { clamp, easeOut, rng } from "@/lib/math";
import { iconSrc, type IconId } from "@/content/techs";
import { BRAND, enamel } from "@/content/brands";
import { cssColor } from "./assets";
import { useThemeDark } from "@/hooks/useThemeDark";

export interface OrbitBus {
  /** chegada das peças, 0..1 (rolagem) */
  p: number;
  /** opacidade geral 0..1 (entra com a seção; no movimento reduzido também sai) */
  fade: number;
  /** saída: 0 = peças no círculo, 1 = já se espalharam e sumiram */
  exit: number;
  rot: { y: number; v: number; drag: boolean; idle: number };
  hover: boolean[];
  focus: boolean[];
  buttons: (HTMLButtonElement | null)[];
  reduced: boolean;
  cursor: { x: number; y: number };
  /** pede um quadro (o canvas só desenha quando a Stack está por perto) */
  invalidate?: () => void;
  /** chamado quando a cena 3D está pronta */
  onReady?: () => void;
}

export interface OrbitTile {
  id: IconId;
  name: string;
  ref: string;
  /** índice do grupo (dá um respiro maior entre grupos no círculo) */
  group: number;
}

// câmera longe e lente fechada: perspectiva suave (as peças da frente não ficam gigantes)
const CAMZ = 24;
const FOV = 23;
const TAN = Math.tan((FOV * Math.PI) / 360);
/** inclinação do círculo: visto um pouco de cima e levemente torto, como no esboço */
const TILT_X = 0.44;
const TILT_Z = -0.12;

export default function StackOrbit(props: { bus: OrbitBus; tiles: OrbitTile[] }) {
  return (
    <Canvas
      className="tree-canvas"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      dpr={[1, 1.75]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: FOV, position: [0, 0, CAMZ], near: 0.1, far: 90 }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

/* ---------- peça "fatia de pão" ---------- */
const TW = 1;
const TH = 1.18;
const TR = 0.24;
const DEPTH = 0.1;
const BEVEL = 0.075;

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** corpo com borda chanfrada e arredondada, e a face lisa com UV 0..1 para o logo */
function tileGeometries() {
  const shape = roundedRect(TW, TH, TR);
  const body = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL * 0.85,
    bevelSegments: 8,
    curveSegments: 14,
  });
  body.translate(0, 0, -DEPTH / 2);
  body.computeVertexNormals();
  const face = new THREE.ShapeGeometry(roundedRect(TW * 0.96, TH * 0.96, TR * 0.92), 14);
  const uv = face.attributes.uv;
  const pos = face.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / TW + 0.5, pos.getY(i) / TH + 0.5);
  return { body, face };
}

function fontFamily(v: string, fb: string) {
  return cssColor(v, fb) + `, ${fb}`;
}

function fit(x: CanvasRenderingContext2D, s: string, w: number, h: number, max: number, fam: string) {
  x.font = `${w} ${h}px ${fam}`;
  const m = x.measureText(s).width;
  if (m > max) x.font = `${w} ${(h * max) / m}px ${fam}`;
}

/** pinta o logo (SVG de uma cor) nas cores da marca; logos de duas cores são divididos por região */
function brandLogo(img: HTMLImageElement, id: IconId, s: number, mono?: string) {
  const cols = mono ? [mono] : enamel(id).logo;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0, s, s);
  x.globalCompositeOperation = "source-in";
  const b = BRAND[id];
  x.fillStyle = cols[0];
  x.fillRect(0, 0, s, s);
  if (cols.length === 2) {
    x.fillStyle = cols[1];
    x.beginPath();
    if (b.split === "diag") {
      // Python: cobra de cima/esquerda clara, a de baixo/direita amarela
      x.moveTo(s, 0);
      x.lineTo(s, s);
      x.lineTo(0, s);
    } else {
      // vapor em cima (1ª cor), xícara embaixo (2ª cor)
      x.rect(0, s * 0.5, s, s * 0.5);
    }
    x.closePath();
    x.fill();
  }
  return c;
}

/**
 * Face da peça: duas texturas no mesmo layout.
 * - cor: fundo esmaltado na cor da marca, logo e nome "impressos" em tom contrastante;
 * - relevo (bumpMap): branco = alto, preto = baixo, então o logo fica gravado.
 */
function faceTextures(t: OrbitTile, onLoad: () => void) {
  const W = 512;
  const H = Math.round(512 * (TH / TW));
  const tone = enamel(t.id);
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return c;
  };
  const color = mk();
  const bump = mk();
  const body = fontFamily("--font-schibsted", "Arial");
  const mono = fontFamily("--font-dm-mono", "Menlo");
  const layout = (x: CanvasRenderingContext2D, bg: CanvasFillStrokeStyles["fillStyle"], ink: string, dim: string, logo?: HTMLCanvasElement) => {
    x.clearRect(0, 0, W, H);
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);
    if (logo) x.drawImage(logo, (W - logo.width) / 2, 70);
    x.textAlign = "center";
    x.fillStyle = ink;
    fit(x, t.name, 700, 82, 450, body);
    x.fillText(t.name, W / 2, H - 120);
    x.fillStyle = dim;
    fit(x, t.ref, 500, 36, 430, mono);
    x.fillText(t.ref, W / 2, H - 62);
  };
  const draw = (img?: HTMLImageElement) => {
    const cx = color.getContext("2d")!;
    // leve degradê e um "grão" quase invisível: a face não fica chapada
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tone.top);
    g.addColorStop(1, tone.bottom);
    layout(cx, g, tone.ink, tone.dim, img ? brandLogo(img, t.id, 224) : undefined);
    const n = cx.getImageData(0, 0, W, H);
    for (let i = 0; i < n.data.length; i += 4) {
      const v = (Math.random() - 0.5) * 6;
      n.data[i] += v;
      n.data[i + 1] += v;
      n.data[i + 2] += v;
    }
    cx.putImageData(n, 0, 0);
    const bx = bump.getContext("2d")!;
    bx.filter = "blur(1.5px)";
    layout(bx, "#ffffff", "#000000", "#555555", img ? brandLogo(img, t.id, 224, "#000000") : undefined);
    bx.filter = "none";
  };
  draw();
  const map = new THREE.CanvasTexture(color);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = 8;
  const img = new Image();
  img.onload = () => {
    draw(img);
    map.needsUpdate = true;
    bumpMap.needsUpdate = true;
    onLoad();
  };
  img.src = iconSrc(t.id);
  return { map, bumpMap, body: tone.body };
}

/** ângulo de cada peça no círculo, com um respiro maior entre grupos */
function slotAngles(tiles: OrbitTile[]) {
  const gap = 0.55;
  const groups = new Set(tiles.map((t) => t.group)).size;
  const units = tiles.length + groups * gap;
  let u = 0;
  return tiles.map((t, i) => {
    if (i > 0 && t.group !== tiles[i - 1].group) u += gap;
    const a = (u / units) * Math.PI * 2;
    u += 1;
    return a;
  });
}

function Scene({ bus, tiles }: { bus: OrbitBus; tiles: OrbitTile[] }) {
  const { camera, size, invalidate, scene } = useThree();
  const dark = useThemeDark();

  // layout: maior raio que cabe na caixa, contando a perspectiva (a frente desce e cresce)
  const L = useMemo(() => {
    const hh0 = CAMZ * TAN;
    const hw0 = hh0 * (size.width / Math.max(1, size.height));
    const sinT = Math.sin(TILT_X);
    const cosT = Math.cos(TILT_X);
    let R = 6.4;
    let tileS = 1.3;
    for (; R > 1.6; R -= 0.05) {
      tileS = clamp(R * 0.19, 0.62, 1.12);
      const half = (TH / 2) * tileS * 1.25;
      const near = CAMZ / (CAMZ - R * cosT);
      const far = CAMZ / (CAMZ + R * cosT);
      const bottom = (R * sinT + half) * near;
      const top = (R * sinT + half) * far;
      const side = R + (TW / 2) * tileS * 1.25;
      if (bottom <= hh0 * 0.92 && top <= hh0 * 0.92 && side <= hw0 * 0.96) break;
    }
    return { R, tileS };
  }, [size.width, size.height]);

  const built = useMemo(() => {
    const { body, face } = tileGeometries();
    const r = rng(42);
    const angles = slotAngles(tiles);
    const bodyMats = new Map<string, THREE.MeshPhysicalMaterial>();
    // corpo: verniz leve (clearcoat) dá um reflexo discreto na borda, sem parecer plástico
    const bodyMat = (color: string) => {
      if (!bodyMats.has(color))
        bodyMats.set(
          color,
          new THREE.MeshPhysicalMaterial({
            color,
            roughness: 0.48,
            metalness: 0,
            clearcoat: 0.55,
            clearcoatRoughness: 0.32,
            sheen: 0.25,
            sheenColor: new THREE.Color("#ffffff"),
            sheenRoughness: 0.7,
          }),
        );
      return bodyMats.get(color)!;
    };
    const items = tiles.map((t, i) => {
      const tex = faceTextures(t, () => invalidate());
      const mat = new THREE.MeshPhysicalMaterial({
        map: tex.map,
        bumpMap: tex.bumpMap,
        bumpScale: 2.2,
        roughness: 0.55,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
      });
      const g = new THREE.Group();
      g.add(new THREE.Mesh(body, bodyMat(tex.body)));
      const front = new THREE.Mesh(face, mat);
      front.position.z = DEPTH / 2 + BEVEL + 0.003;
      // o verso também tem o logo (girado, então lê certo por trás)
      const back = new THREE.Mesh(face, mat);
      back.rotation.y = Math.PI;
      back.position.z = -(DEPTH / 2 + BEVEL + 0.003);
      g.add(front, back);
      // "vento": cada peça com fase e velocidade um pouco diferentes
      const wind = { ph: r() * Math.PI * 2, f: 0.55 + r() * 0.35, spin: (r() < 0.5 ? -1 : 1) * (0.16 + r() * 0.12), spin0: (r() - 0.5) * 0.6 };
      // saída: cada peça se espalha numa direção própria (ângulo, alcance, giro e profundidade)
      const out = { ang: r() * Math.PI * 2, reach: 0.9 + r() * 0.8, tw: (r() < 0.5 ? -1 : 1) * (0.8 + r() * 1.4), dz: r() * 2.2 };
      return { g, mat, a: angles[i], hv: 0, depth: 0, vis: false, wind, out };
    });
    const root = new THREE.Group();
    root.add(...items.map((it) => it.g));
    return {
      root,
      items,
      dispose: () => {
        body.dispose();
        face.dispose();
        bodyMats.forEach((m) => m.dispose());
        items.forEach((it) => {
          it.mat.map?.dispose();
          it.mat.bumpMap?.dispose();
          it.mat.dispose();
        });
      },
    };
  }, [tiles, invalidate]);

  useEffect(() => {
    scene.add(built.root);
    bus.invalidate = invalidate;
    bus.onReady?.();
    invalidate();
    return () => {
      scene.remove(built.root);
      built.dispose();
    };
  }, [built, scene, bus, invalidate]);

  const tmp = useMemo(
    () => ({
      V: new THREE.Vector3(),
      W: new THREE.Vector3(),
      Q: new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT_X, 0, TILT_Z)),
      cam: { x: 0, y: 0 },
      auto: 0,
      t: 0,
    }),
    [],
  );

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    tmp.t += dt;
    const T = tmp.t;
    const { V, W, cam } = tmp;
    const RM = bus.reduced;
    const ROT = bus.rot;
    const { R, tileS } = L;
    // paralaxe leve do cursor
    const k = 1 - Math.exp(-dt * 2.2);
    cam.x += ((RM ? 0 : bus.cursor.x) - cam.x) * k;
    cam.y += ((RM ? 0 : bus.cursor.y) - cam.y) * k;
    camera.position.set(cam.x * 0.6, -cam.y * 0.4, CAMZ);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    // giro: inércia depois de arrastar e, parado, uma volta lenta sozinho
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

    const p = RM ? 1 : bus.p;
    const fade = bus.fade;
    // saída por espalhamento (não existe com movimento reduzido: aí a seção só some num crossfade)
    const ex = RM ? 0 : bus.exit;
    const exE = ex * ex * (3 - 2 * ex);
    const hh = CAMZ * TAN;
    const hw = hh * (state.size.width / Math.max(1, state.size.height));
    const n = built.items.length;
    built.items.forEach((it, i) => {
      const on = bus.hover[i] || bus.focus[i];
      it.hv += ((on ? 1 : 0) - it.hv) * (1 - Math.exp(-dt * 10));
      // chegada: as peças vêm do centro, uma a uma, e encaixam no círculo
      const ki = RM ? 1 : easeOut(clamp((p - 0.05 - (i / n) * 0.5) / 0.3));
      const a = it.a + ROT.y + (1 - ki) * 1.4;
      const w = it.wind;
      // vento: flutua, balança e gira devagar sobre o próprio eixo (parado com movimento reduzido)
      const float = RM ? 0 : Math.sin(T * w.f + w.ph) * 0.12;
      V.set(Math.cos(a) * R * ki, float, Math.sin(a) * R * ki).applyQuaternion(tmp.Q);
      // no hover a peça vem um pouco para a frente
      V.z += it.hv * 0.6;
      if (exE > 0) {
        // vai para fora: mistura da direção radial (de onde a peça está) com a direção sorteada dela
        const rx = Math.atan2(V.y, V.x);
        const ang = rx + Math.sin(it.out.ang) * 1.1;
        V.x += Math.cos(ang) * hw * 1.15 * it.out.reach * exE;
        V.y += Math.sin(ang) * hh * 1.15 * it.out.reach * exE;
        V.z += it.out.dz * exE;
      }
      it.g.position.copy(V);
      // as peças só oscilam perto de "de frente" (nunca ficam de lado nem mostram o verso)
      const spin = RM ? w.spin0 * 0.8 : w.spin0 * 0.8 + Math.sin(T * w.f * 0.7 + w.ph * 1.7) * 0.34;
      const sway = RM ? 0 : Math.sin(T * w.f * 1.3 + w.ph * 2) * 0.07;
      const nod = RM ? -0.06 : -0.06 + Math.sin(T * w.f * 0.9 + w.ph) * 0.05;
      // no hover/foco ela fica de frente para quem olha
      const yaw = (spin + Math.cos(a) * 0.25) * (1 - it.hv);
      it.g.rotation.set(nod, yaw, sway * (1 - it.hv) + it.out.tw * exE);
      // sai encolhendo: some quando já está longe do círculo
      const gone = 1 - clamp((ex - 0.5) / 0.45);
      const s = tileS * (0.35 + 0.65 * ki) * (1 + it.hv * 0.14) * (RM ? 1 : Math.max(0.001, fade)) * Math.max(0.001, gone);
      it.g.scale.setScalar(s);
      it.g.visible = ki > 0.01 && fade > 0.01 && gone > 0.002;
      it.depth = clamp((V.z + R) / (2 * R + 1));
      it.vis = ki > 0.6 && fade > 0.3 && ex < 0.1;
    });

    // alvos do DOM em cima de cada peça (tamanho pela peça de frente, sem contar o giro)
    const Wd = state.size.width;
    const Hd = state.size.height;
    built.items.forEach((it, i) => {
      const b = bus.buttons[i];
      if (!b) return;
      W.copy(it.g.position).project(camera);
      V.set((TW / 2) * it.g.scale.x, 0, 0)
        .add(it.g.position)
        .project(camera);
      const bw = Math.max(28, Math.abs(V.x - W.x) * Wd);
      const bh = bw * (TH / TW);
      const x = (W.x + 1) * 0.5 * Wd - bw / 2;
      const y = (1 - W.y) * 0.5 * Hd - bh / 2;
      b.style.width = `${bw.toFixed(0)}px`;
      b.style.height = `${bh.toFixed(0)}px`;
      b.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      b.style.zIndex = String(10 + Math.round(it.depth * 100));
      b.style.visibility = it.vis || bus.focus[i] ? "visible" : "hidden";
    });

    // enquanto há vento, inércia ou hover animando, pede o próximo quadro
    const settling = built.items.some((it, i) => Math.abs(it.hv - (bus.hover[i] || bus.focus[i] ? 1 : 0)) > 0.01);
    if ((!RM && fade > 0.01) || Math.abs(ROT.v) > 0.001 || settling) invalidate();
  });

  return (
    <>
      {/* "céu" para os reflexos: gerado aqui, sem baixar HDRI (renderiza uma vez) */}
      <Environment key={dark ? "dusk" : "day"} resolution={128} frames={1}>
        <Lightformer form="rect" intensity={dark ? 0.8 : 2.4} color="#fff6e6" position={[0, 6, 3]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={dark ? 0.5 : 1.4} color="#d9e9ff" position={[-7, 2, 2]} rotation-y={Math.PI / 2} scale={[8, 6, 1]} />
        <Lightformer form="rect" intensity={dark ? 0.6 : 1.1} color="#ffe2b8" position={[7, -1, 3]} rotation-y={-Math.PI / 2} scale={[8, 4, 1]} />
      </Environment>
      <hemisphereLight args={["#fff3dc", "#5a4a32", dark ? 0.3 : 0.5]} />
      <directionalLight position={[-4, 8, 7]} intensity={dark ? 0.6 : 1.3} color={dark ? "#d8c8ff" : "#fff0d0"} />
    </>
  );
}
