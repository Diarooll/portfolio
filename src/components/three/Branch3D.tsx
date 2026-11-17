"use client";
// Galho 3D do Contato: atravessa a tela inteira, PARADO (sem balanço), com
// folhas. Câmera ortográfica: 1 unidade = 1 px, então o galho bate com o
// passarinho (que é SVG, por cima). Desenha só quando muda (frameloop "demand").
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThemeDark } from "@/hooks/useThemeDark";
import { rng } from "@/lib/math";
import { TWIGS, branchR, branchY } from "@/lib/branch";
import { CANOPY, cssColor, getLeafGeometry, makeLeafMaterial } from "./assets";

export default function Branch3D({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      className="branch-canvas"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      orthographic
      flat
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 600], near: 1, far: 2000, zoom: 1 }}
    >
      <Scene onReady={onReady} />
    </Canvas>
  );
}

/** textura de casca: veios no sentido do galho */
function barkTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 64;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, 256, 64);
  const r = rng(77);
  for (let i = 0; i < 60; i++) {
    const y = r() * 64;
    x.strokeStyle = `rgba(0,0,0,${0.08 + r() * 0.18})`;
    x.lineWidth = 0.6 + r() * 1.6;
    x.beginPath();
    x.moveTo(0, y);
    for (let k = 1; k <= 8; k++) x.lineTo(k * 32, y + (r() - 0.5) * 4);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Scene({ onReady }: { onReady?: () => void }) {
  const dark = useThemeDark();
  const { size, scene, invalidate } = useThree();
  const W = size.width;
  const H = size.height;
  const mats = useMemo(() => {
    const tex = barkTexture();
    return { bark: new THREE.MeshLambertMaterial({ map: tex, color: "#7a5233" }), leaf: makeLeafMaterial(), tex };
  }, []);

  const built = useMemo(() => {
    if (W < 10 || H < 10) return null;
    const group = new THREE.Group();
    const geos: THREE.BufferGeometry[] = [];
    const X = (x: number) => x * W - W / 2;
    const Y = (y: number) => H / 2 - y * H;
    // galho principal: passa um pouco das bordas para "atravessar" a tela
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = -0.04 + (i / 40) * 1.08;
      pts.push(new THREE.Vector3(X(x), Y(branchY(x)), 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const seg = 160;
    const radial = 12;
    const main = new THREE.TubeGeometry(curve, seg, 1, radial, false);
    // raio variável ao longo do galho
    const p = main.attributes.position;
    for (let i = 0; i <= seg; i++) {
      const tt = i / seg;
      const c = curve.getPointAt(tt);
      const xr = -0.04 + tt * 1.08;
      const rad = branchR(Math.min(1, Math.max(0, xr)), H) * (1 + 0.06 * Math.sin(tt * 40));
      for (let j = 0; j <= radial; j++) {
        const k = i * (radial + 1) + j;
        p.setXYZ(k, c.x + (p.getX(k) - c.x) * rad, c.y + (p.getY(k) - c.y) * rad, c.z + (p.getZ(k) - c.z) * rad);
      }
    }
    main.computeVertexNormals();
    // a casca se repete ao longo do comprimento
    const uv = main.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (W / 90));
    geos.push(main);
    group.add(new THREE.Mesh(main, mats.bark));
    // galhinhos
    const r = rng(9);
    const ends: THREE.Vector3[] = [];
    TWIGS.forEach((tw) => {
      const a = new THREE.Vector3(X(tw.x), Y(branchY(tw.x)), 0);
      const len = tw.len * H;
      const b = a.clone().add(new THREE.Vector3(Math.cos(tw.ang) * len, Math.sin(tw.ang) * len * 0.6, (r() - 0.5) * 30));
      const mid = a
        .clone()
        .lerp(b, 0.5)
        .add(new THREE.Vector3(0, len * 0.12, 0));
      const tc = new THREE.QuadraticBezierCurve3(a, mid, b);
      const g = new THREE.TubeGeometry(tc, 24, branchR(tw.x, H) * 0.42, 8, false);
      const gp = g.attributes.position;
      for (let i = 0; i <= 24; i++) {
        const c = tc.getPointAt(i / 24);
        const f = 1 - (i / 24) * 0.75;
        for (let j = 0; j <= 8; j++) {
          const k = i * 9 + j;
          gp.setXYZ(k, c.x + (gp.getX(k) - c.x) * f, c.y + (gp.getY(k) - c.y) * f, c.z + (gp.getZ(k) - c.z) * f);
        }
      }
      g.computeVertexNormals();
      geos.push(g);
      group.add(new THREE.Mesh(g, mats.bark));
      ends.push(b, a.clone().lerp(b, 0.55));
    });
    // folhas: tufos nas pontas dos galhinhos e algumas soltas ao longo do galho
    const spots: THREE.Vector3[] = [];
    ends.forEach((e) => {
      for (let i = 0; i < 6; i++) spots.push(e.clone().add(new THREE.Vector3((r() - 0.5) * 40, (r() - 0.5) * 30, (r() - 0.5) * 40)));
    });
    for (let i = 0; i < 14; i++) {
      const x = 0.03 + r() * 0.94;
      spots.push(new THREE.Vector3(X(x), Y(branchY(x)) + (r() < 0.5 ? 1 : -1) * branchR(x, H) * 1.2, 10 + r() * 10));
    }
    const leaves = new THREE.InstancedMesh(getLeafGeometry(), mats.leaf, spots.length);
    const M4 = new THREE.Matrix4();
    const Q = new THREE.Quaternion();
    const E = new THREE.Euler();
    const S = new THREE.Vector3();
    const col = new THREE.Color();
    const scale = Math.max(22, H * 0.15);
    spots.forEach((sp, i) => {
      E.set((r() - 0.5) * 1.6, (r() - 0.5) * 1.6, r() * Math.PI * 2);
      Q.setFromEuler(E);
      M4.compose(sp, Q, S.setScalar(scale * (0.7 + r() * 0.5)));
      leaves.setMatrixAt(i, M4);
      leaves.setColorAt(i, col.set(r() < 0.12 ? "#c27a3a" : CANOPY[Math.floor(r() * (CANOPY.length - 1))]));
    });
    group.add(leaves);
    return { group, dispose: () => (geos.forEach((g) => g.dispose()), leaves.dispose()) };
  }, [W, H, mats]);

  useEffect(() => {
    if (!built) return;
    scene.add(built.group);
    invalidate();
    onReady?.();
    return () => {
      scene.remove(built.group);
      built.dispose();
    };
  }, [built, scene, invalidate, onReady]);

  useEffect(() => {
    const apply = () => {
      mats.bark.color.set(cssColor("--wood", "#7a5233"));
      invalidate();
    };
    apply();
    window.addEventListener("themechange", apply);
    return () => window.removeEventListener("themechange", apply);
  }, [mats, invalidate]);

  useEffect(
    () => () => {
      mats.bark.dispose();
      mats.leaf.dispose();
      mats.tex.dispose();
    },
    [mats],
  );

  return (
    <>
      <hemisphereLight args={["#fff1cf", "#5a4630", dark ? 0.5 : 1.1]} />
      <directionalLight position={[-300, 500, 400]} intensity={dark ? 0.7 : 1.4} color={dark ? "#d8b8c8" : "#ffe2a8"} />
    </>
  );
}
