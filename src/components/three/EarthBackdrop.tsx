"use client";
// Terra girando no fundo do Contato: esfera com a foto da NASA (dia), luzes
// das cidades no lado escuro, atmosfera fina nas bordas (fresnel) e estrelas
// finas atrás. Câmera ortográfica: 1 unidade = 1 px, então o enquadramento
// (Terra grande saindo do quadro embaixo/direita) é fácil de controlar.
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import * as THREE from "three";
import { EARTH } from "@/content/earth";
import { rng } from "@/lib/math";

/** de onde vem o sol (esquerda, um pouco de cima e da frente) */
const SUN = new THREE.Vector3(-0.85, 0.35, 0.45).normalize();

export default function EarthBackdrop({ active, reduced, onReady }: { active: boolean; reduced: boolean; onReady?: () => void }) {
  return (
    <Canvas
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      orthographic
      dpr={[1, 2]}
      frameloop={active && !reduced ? "always" : "demand"}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 2000], near: 1, far: 5000, zoom: 1 }}
    >
      <Stars />
      <Suspense fallback={null}>
        <Earth reduced={reduced} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}

function Earth({ reduced, onReady }: { reduced: boolean; onReady?: () => void }) {
  const { size, invalidate } = useThree();
  const [day, night] = useLoader(THREE.TextureLoader, [EARTH.day, EARTH.night]);
  const mob = size.width < 700;
  const L = mob ? EARTH.mobile : EARTH.desktop;
  const R = L.r * (mob ? size.width * 2.1 : size.height);

  const mats = useMemo(() => {
    [day, night].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
    const surface = new THREE.ShaderMaterial({
      uniforms: { uDay: { value: day }, uNight: { value: night }, uSun: { value: SUN } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vNv; varying vec3 vView;
        void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vNv = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uDay; uniform sampler2D uNight; uniform vec3 uSun;
        varying vec2 vUv; varying vec3 vN; varying vec3 vNv; varying vec3 vView;
        void main(){
          float d = dot(normalize(vN), uSun);
          float dayK = smoothstep(-0.12, 0.22, d);
          vec3 dayC = texture2D(uDay, vUv).rgb * (0.04 + 1.15 * max(d, 0.0));
          // luzes das cidades só no lado escuro, num tom quente
          vec3 nightC = texture2D(uNight, vUv).rgb * vec3(1.0, 0.82, 0.55) * 1.4 * (1.0 - dayK);
          // atmosfera: um azul fino na borda, mais forte do lado do sol
          float fres = pow(1.0 - max(dot(normalize(vNv), normalize(vView)), 0.0), 3.0);
          vec3 atm = vec3(0.35, 0.58, 1.0) * fres * (0.15 + 0.85 * smoothstep(-0.25, 0.5, d)) * 0.85;
          gl_FragColor = vec4(dayC * dayK + nightC + atm, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    // halo da atmosfera por fora da esfera (bem sutil, só do lado iluminado)
    const halo = new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN } },
      vertexShader: `varying vec3 vN; varying vec3 vNv; varying vec3 vView;
        void main(){ vN = normalize(mat3(modelMatrix) * normal); vNv = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vNv; varying vec3 vView;
        void main(){
          float rim = pow(max(0.0, 0.62 - abs(dot(normalize(vNv), normalize(vView)))), 2.2);
          float lit = smoothstep(-0.3, 0.6, dot(normalize(vN), uSun));
          gl_FragColor = vec4(vec3(0.38, 0.62, 1.0) * rim * lit * 1.3, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { surface, halo };
  }, [day, night]);

  const geo = useMemo(() => new THREE.SphereGeometry(1, 96, 64), []);
  const spinGroup = useMemo(() => new THREE.Group(), []);

  useEffect(() => {
    onReady?.();
    invalidate();
  }, [onReady, invalidate]);
  useEffect(
    () => () => {
      mats.surface.dispose();
      mats.halo.dispose();
      geo.dispose();
    },
    [mats, geo],
  );

  useFrame((_, dt) => {
    if (!reduced) spinGroup.rotation.y += Math.min(dt, 0.05) * EARTH.spin;
  });

  const x = L.x * size.width - size.width / 2;
  const y = size.height / 2 - L.y * size.height;
  return (
    <group position={[x, y, 0]} rotation={[0.2, 0, (EARTH.tilt * Math.PI) / 180]} scale={R}>
      <primitive object={spinGroup}>
        <mesh geometry={geo} material={mats.surface} rotation={[0, -1.9, 0]} />
      </primitive>
      <mesh geometry={geo} material={mats.halo} scale={1.035} />
    </group>
  );
}

/** estrelas: pontos finos, brilhos e tons um pouco diferentes; quase paradas */
function Stars() {
  const { size } = useThree();
  const pts = useMemo(() => {
    const n = size.width < 700 ? 380 : 900;
    const r = rng(7);
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const sz = new Float32Array(n);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (r() - 0.5) * size.width;
      pos[i * 3 + 1] = (r() - 0.5) * size.height;
      pos[i * 3 + 2] = -1000;
      // a maioria fraca, poucas brilhantes
      const b = Math.pow(r(), 3) * 0.85 + 0.15;
      c.setHSL(r() < 0.7 ? 0.6 : 0.1, 0.25, 0.75);
      col[i * 3] = c.r * b;
      col[i * 3 + 1] = c.g * b;
      col[i * 3 + 2] = c.b * b;
      sz[i] = 0.7 + Math.pow(r(), 4) * 1.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sz, 1));
    const m = new THREE.ShaderMaterial({
      uniforms: { uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: `attribute float aSize; varying vec3 vC; uniform float uDpr;
        void main(){ vC = color; gl_PointSize = aSize * uDpr * 1.6; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC * a, a); #include <colorspace_fragment> }`,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(g, m);
  }, [size.width, size.height]);
  useEffect(
    () => () => {
      pts.geometry.dispose();
      (pts.material as THREE.Material).dispose();
    },
    [pts],
  );
  return <primitive object={pts} />;
}
