"use client";
// Folhas 3D caindo (uma malha instanciada: um desenho só para todas).
// São dois canvases: "back" fica atrás do morro (as folhas somem atrás da
// árvore e da grama) e "front", com poucas folhas, passa na frente do texto.
// Vento: a rolagem levanta as folhas e o cursor rápido abre uma rajada.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { clamp, lerp, rng } from "@/lib/math";
import { pointer, state as engine } from "@/lib/scroll-engine";
import { CANOPY, getLeafGeometry, makeLeafMaterial } from "./assets";
import { useThemeDark } from "@/hooks/useThemeDark";

const CAMZ = 14;
const FOV = 38;
const TAN = Math.tan((FOV * Math.PI) / 360);
const PAL = [...CANOPY, "#c27a3a", "#d9a441", "#a87b4f"];

interface Props {
  layer: "back" | "front";
  count: number;
  reduced: boolean;
}

export default function LeafField(props: Props) {
  const [dpr, setDpr] = useState(1.25);
  return (
    <Canvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      flat
      dpr={dpr}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      camera={{ fov: FOV, position: [0, 0, CAMZ], near: 0.1, far: 60 }}
    >
      {/* se o aparelho sofrer, baixa a resolução */}
      <PerformanceMonitor onDecline={() => setDpr(0.75)} onIncline={() => setDpr(1.25)} />
      <Leaves {...props} />
      <Lights />
    </Canvas>
  );
}

function Lights() {
  const dark = useThemeDark();
  return (
    <>
      <hemisphereLight args={["#fff4d8", "#557a33", dark ? 0.5 : 1.25]} />
      <directionalLight position={[-3, 6, 8]} intensity={dark ? 0.45 : 0.9} color="#ffe2a8" />
    </>
  );
}

function Leaves({ layer, count, reduced }: Props) {
  const { size } = useThree();
  const mat = useMemo(() => makeLeafMaterial(), []);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(getLeafGeometry(), mat, count);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    return m;
  }, [mat, count]);
  const S = useMemo(() => {
    const R = rng(layer === "back" ? 31 : 77);
    const aspect = size.width / Math.max(1, size.height);
    const col = new THREE.Color();
    const list = Array.from({ length: count }, (_, i) => {
      // atrás: longe e pequenas; na frente: perto, grandes e rápidas
      const z = layer === "back" ? lerp(-14, -2, R()) : lerp(2.5, 6.5, R());
      const hh = (CAMZ - z) * TAN;
      const hw = hh * aspect;
      mesh.setColorAt(i, col.set(PAL[Math.floor(R() * PAL.length)]));
      return {
        z,
        x: (R() * 2 - 1) * hw * 1.1,
        y: (R() * 2 - 1) * hh * 1.1,
        fall: (layer === "front" ? 1.1 : 0.35) + R() * 0.5,
        amp: 0.3 + R() * 0.6,
        sw: 0.5 + R() * 0.8,
        ph: R() * 6.28,
        a: 0.6 + R() * 1.2,
        b: 0.3 + R() * 0.9,
        c: 0.5 + R() * 1.1,
        r0: R() * 6.28,
        size: (layer === "front" ? 0.5 : 0.45) + R() * 0.6,
        gx: 0,
        gy: 0,
        spin: 0,
      };
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return list;
    // a lista só depende da quantidade e da camada (o tamanho da tela entra no laço)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesh, count, layer]);
  const tmp = useMemo(
    () => ({
      V: new THREE.Vector3(),
      Q: new THREE.Quaternion(),
      E: new THREE.Euler(),
      M: new THREE.Matrix4(),
      SC: new THREE.Vector3(),
      cv: { x: -1, y: -1, v: 0 },
      t: 0,
    }),
    [],
  );

  useEffect(
    () => () => {
      mesh.dispose();
      mat.dispose();
    },
    [mesh, mat],
  );

  useFrame(({ camera }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    tmp.t += dt;
    const T = tmp.t;
    const { V, Q, E, M, SC, cv } = tmp;
    const W = size.width;
    const H = size.height;
    const aspect = W / Math.max(1, H);
    const vs = engine.vel;
    const lift = reduced ? 0 : clamp(vs / 2500, -1.2, 1.2) * 1.4;
    const wind = reduced ? 0 : Math.sin(T * 0.13) * 0.25 + Math.sin(T * 0.041 + 1.3) * 0.12 + clamp(Math.abs(vs) / 3000) * 0.7;
    const slow = reduced ? 0.06 : 1;
    const gust = !reduced && pointer.seen;
    if (gust) {
      const d = Math.hypot(pointer.x - cv.x, pointer.y - cv.y);
      cv.v += (d / Math.max(dt, 0.001) - cv.v) * (1 - Math.exp(-dt * 8));
      cv.x = pointer.x;
      cv.y = pointer.y;
    }
    for (let i = 0; i < S.length; i++) {
      const L = S[i];
      const hh = (CAMZ - L.z) * TAN;
      const hw = hh * aspect;
      if (gust && L.z > -9) {
        V.set(L.x, L.y, L.z).project(camera);
        const sx = (V.x + 1) * 0.5 * W;
        const sy = (1 - V.y) * 0.5 * H;
        const dx = sx - pointer.x;
        const dy = sy - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 160 && d > 0.1) {
          const f = (1 - d / 160) * clamp(cv.v / 700, 0.2, 1.6) * 7 * dt;
          const k = ((2 * hw) / W) * 60;
          L.gx += (dx / d) * f * k * 0.04;
          L.gy -= (dy / d) * f * k * 0.04;
          L.spin += f * 2;
        }
      }
      L.gx *= Math.exp(-dt * 1.4);
      L.gy *= Math.exp(-dt * 1.4);
      L.spin *= Math.exp(-dt * 1.2);
      L.y += (-L.fall * slow + lift + L.gy) * dt;
      L.x += (Math.sin(T * L.sw * slow + L.ph) * L.amp * slow + wind + L.gx) * dt;
      if (L.y < -hh - 1.2) {
        L.y = hh + 1.2;
        L.x = (Math.random() * 2 - 1) * hw * 1.1;
      }
      if (L.y > hh + 1.4) L.y = -hh - 1.1;
      if (L.x > hw * 1.25) L.x = -hw * 1.25;
      else if (L.x < -hw * 1.25) L.x = hw * 1.25;
      const ts = T * slow;
      E.set(Math.sin(ts * L.a + L.ph) * 1.1 + L.r0 + L.spin, ts * L.b + L.ph + L.spin * 0.5, Math.cos(ts * L.c + L.ph) * 0.9);
      M.compose(V.set(L.x, L.y, L.z), Q.setFromEuler(E), SC.setScalar(L.size));
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive object={mesh} />;
}
