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
  /** retângulo da área da Stack (.tree) dentro do canvas, em px: o canvas cobre a tela toda e a órbita se centra nessa área */
  view: { tx: number; ty: number; tw: number; th: number };
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
/** levemente torto, como no esboço (a inclinação para a câmera depende do formato da tela: tiltFor) */
const TILT_Z = -0.12;
/** em telas largas o círculo é visto bem de lado; em telas altas (celular) quase de cima */
const tiltFor = (aspect: number) => 0.95 + (0.56 - 0.95) * clamp((aspect - 0.7) / 1.0);

export default function StackOrbit(props: { bus: OrbitBus; tiles: OrbitTile[] }) {
  return (
    <Canvas
      className="tree-canvas"
      // o canvas é maior que a área da Stack: cobre a tela toda (--cv-* vêm do Stack.tsx), então as peças
      // saem pelo canto da tela e nunca são cortadas no meio
      style={{ position: "absolute", left: "var(--cv-x, 0px)", top: "var(--cv-y, 0px)", width: "var(--cv-w, 100%)", height: "var(--cv-h, 100%)", pointerEvents: "none" }}
      dpr={[1, 1.6]}
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
  const layout = (x: CanvasRenderingContext2D, bg: CanvasFillStrokeStyles["fillStyle"], ink: string, logo?: HTMLCanvasElement) => {
    x.clearRect(0, 0, W, H);
    x.fillStyle = bg;
    x.fillRect(0, 0, W, H);
    if (logo) x.drawImage(logo, (W - logo.width) / 2, 78);
    x.textAlign = "center";
    x.fillStyle = ink;
    // só o nome, grande (o subtítulo pequeno saiu: ficava ilegível no tamanho em que a peça aparece)
    fit(x, t.name, 700, 104, 440, body);
    x.fillText(t.name, W / 2, H - 86);
  };
  const draw = (img?: HTMLImageElement) => {
    const cx = color.getContext("2d")!;
    // leve degradê e um "grão" quase invisível: a face não fica chapada
    const g = cx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, tone.top);
    g.addColorStop(1, tone.bottom);
    layout(cx, g, tone.ink, img ? brandLogo(img, t.id, 256) : undefined);
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
    layout(bx, "#ffffff", "#000000", img ? brandLogo(img, t.id, 256, "#000000") : undefined);
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
  const { camera, invalidate, scene } = useThree();
  const dark = useThemeDark();

  // layout: o canvas cobre a tela toda; a órbita se centra na área da Stack (bus.view) e usa o maior raio
  // que cabe nela, contando a perspectiva (a frente desce e cresce).
  const lay = useMemo(() => ({ key: "", R: 4, Rx: 4, tileS: 1, tilt: 0.56, cx: 0, cy: 0 }), []);
  const layout = (W: number, H: number) => {
    const v = bus.view;
    const key = `${W}|${H}|${v.tx}|${v.ty}|${v.tw}|${v.th}`;
    if (key === lay.key) return false;
    lay.key = key;
    const tw = v.tw > 0 ? v.tw : W;
    const th = v.th > 0 ? v.th : H;
    const tx = v.tw > 0 ? v.tx : 0;
    const ty = v.th > 0 ? v.ty : 0;
    const cx = tx + tw / 2;
    const cy = ty + th / 2;
    const T = tiltFor(tw / th);
    const sinT = Math.sin(T);
    const cosT = Math.cos(T);
    const k = (z: number) => H / 2 / ((CAMZ - z) * TAN); // px por unidade de mundo no plano z
    const margin = W * 0.02;
    const slackB = Math.min(H * 0.1, Math.max(0, H - (ty + th)));
    const slackT = H * 0.03;
    let R = 9;
    let tileS = 1;
    for (; R > 1.4; R -= 0.05) {
      tileS = clamp(R * (tw / th < 1.1 ? 0.34 : 0.26), 0.45, 1.55);
      const halfW = (TW / 2) * tileS * 1.2;
      // reserva extra: peças que se sobreporiam nas laterais são afastadas na vertical (ver "separação")
      const halfH = (TH / 2) * tileS * 1.2 * 1.45;
      const yExt = R * sinT + halfH + R * 0.12;
      const below = yExt * k(R * cosT);
      const above = yExt * k(-R * cosT);
      const side = (R + halfW) * k(0);
      if (cy + below <= ty + th + slackB && cy - above >= ty - slackT && cx - side >= margin && cx + side <= W - margin) break;
    }
    // em telas largas o círculo se estica na horizontal (mais respiro entre as peças da frente e de trás)
    const halfW = (TW / 2) * tileS * 1.2;
    const roomX = Math.min(cx - margin, W - margin - cx) / k(0) - halfW;
    lay.R = R;
    lay.Rx = R * clamp(roomX / R, 1, 1.4);
    lay.tileS = tileS;
    lay.tilt = T;
    lay.cx = cx;
    lay.cy = cy;
    tmp.Q.setFromEuler(new THREE.Euler(T, 0, TILT_Z));
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
    return true;
  };

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
      Q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.56, 0, TILT_Z)),
      cam: { x: 0, y: 0 },
      sep: { x: [] as number[], y: [] as number[], w: [] as number[], h: [] as number[], k: [] as number[], z: [] as number[], o: [] as number[] },
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
    layout(state.size.width, state.size.height);
    const { R, Rx, tileS } = lay;
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
      // (a saída começa em ~56% do percurso: as peças precisam estar todas no círculo antes disso, com tempo parado)
      const ki = RM ? 1 : easeOut(clamp((p - (i / n) * 0.24) / 0.16));
      const a = it.a + ROT.y + (1 - ki) * 1.4;
      const w = it.wind;
      // vento: flutua, balança e gira devagar sobre o próprio eixo (parado com movimento reduzido)
      const float = RM ? 0 : Math.sin(T * w.f + w.ph) * 0.12;
      V.set(Math.cos(a) * Rx * ki, float, Math.sin(a) * R * ki).applyQuaternion(tmp.Q);
      // no hover a peça vem um pouco para a frente
      V.z += it.hv * 0.6;
      if (exE > 0) {
        // vai para fora: mistura da direção radial (de onde a peça está) com a direção sorteada dela
        const rx = Math.atan2(V.y, V.x);
        const ang = rx + Math.sin(it.out.ang) * 1.1;
        V.x += Math.cos(ang) * hw * 1.45 * it.out.reach * exE;
        V.y += Math.sin(ang) * hh * 1.45 * it.out.reach * exE;
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
      // sai encolhendo só no fim do caminho: a peça atravessa a tela até o canto, sem ser cortada pelo canvas
      const gone = 1 - clamp((ex - 0.72) / 0.28);
      const s = tileS * (0.35 + 0.65 * ki) * (1 + it.hv * 0.14) * (RM ? 1 : Math.max(0.001, fade)) * Math.max(0.001, gone);
      it.g.scale.setScalar(s);
      it.g.visible = ki > 0.01 && fade > 0.01 && gone > 0.002;
      it.depth = clamp((V.z + R) / (2 * R + 1));
      it.vis = ki > 0.6 && fade > 0.3 && ex < 0.1;
    });

    // separação: duas peças que se sobreporiam na tela (nas laterais do círculo, onde a fila vai "para dentro")
    // se afastam na vertical, a mais próxima desce e a mais distante sobe. É contínuo (nada pula) e vale
    // também para o movimento reduzido (sem animação, mas a posição parada nunca tem peças em cima de outras)
    {
      const S = tmp.sep;
      const on = 1 - clamp(ex / 0.08);
      const Wd0 = state.size.width;
      const Hd0 = state.size.height;
      built.items.forEach((it, i) => {
        W.copy(it.g.position).project(camera);
        const kz = Hd0 / 2 / ((CAMZ - it.g.position.z) * TAN);
        S.x[i] = (W.x + 1) * 0.5 * Wd0;
        S.y[i] = (1 - W.y) * 0.5 * Hd0;
        S.k[i] = kz;
        S.z[i] = it.g.position.z;
        S.w[i] = TW * 1.18 * it.g.scale.x * kz * (it.g.visible ? 1 : 0);
        S.h[i] = TH * 1.18 * it.g.scale.x * kz * (it.g.visible ? 1 : 0);
        S.o[i] = 0;
      });
      if (on > 0.001) {
        for (let pass = 0; pass < 4; pass++)
          for (let i = 0; i < n; i++)
            for (let j = i + 1; j < n; j++) {
              const ow = (S.w[i] + S.w[j]) / 2;
              if (ow <= 0) continue;
              const ox = ow - Math.abs(S.x[i] - S.x[j]);
              if (ox <= 0) continue;
              const dy = S.y[j] + S.o[j] - (S.y[i] + S.o[i]);
              const oy = (S.h[i] + S.h[j]) / 2 - Math.abs(dy);
              if (oy <= 0) continue;
              const f = clamp(ox / (0.35 * ow));
              const dir = S.z[j] === S.z[i] ? (dy >= 0 ? 1 : -1) : S.z[j] > S.z[i] ? 1 : -1;
              const m = oy * 0.5 * f * on * 1.02;
              S.o[j] += dir * m;
              S.o[i] -= dir * m;
            }
        built.items.forEach((it, i) => {
          const lim = S.h[i] * 1.3;
          it.g.position.y -= clamp(S.o[i], -lim, lim) / Math.max(1, S.k[i]);
        });
      }
    }

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
      // o canvas é maior que a área da Stack: os botões ficam em coordenadas da .tree
      const x = (W.x + 1) * 0.5 * Wd - bw / 2 - bus.view.tx;
      const y = (1 - W.y) * 0.5 * Hd - bh / 2 - bus.view.ty;
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
