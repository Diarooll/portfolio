/* =====================================================================
 * contact3d.js: envelope 3D da seção de contato (three.js)
 * ---------------------------------------------------------------------
 * - O HTML já é a grade final de cards (links de verdade). Este módulo
 *   só "liga" o 3D por cima: se algo falhar (sem WebGL, CDN fora), a
 *   grade continua como está.
 * - three.js é baixado só quando a seção chega perto (import dinâmico).
 * - O envelope é geometria procedural (Shape + ExtrudeGeometry com bevel),
 *   MeshPhysicalMaterial e um "estúdio" convertido em ambiente via PMREM.
 * - Os cards são HTML: o JS calcula para cada um o mesmo transform 3D
 *   da cena (câmera e CSS com a mesma perspectiva, 1 unidade = 1 px),
 *   então o texto continua nítido e clicável.
 * ===================================================================== */

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const wrap = document.getElementById("contact3d");
const list = document.getElementById("contact-cards");

if (wrap && list && "IntersectionObserver" in window) {
  const near = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      near.disconnect();
      import(THREE_URL).then(start).catch((err) => {
        console.warn("[contact3d] three.js indisponível, mantendo a grade:", err);
      });
    }
  }, { rootMargin: "800px 0px" });
  near.observe(wrap);
}

/* ---------- utilidades ---------- */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeBack = (t) => { const c = 1.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const DEG = Math.PI / 180;

function roundedRect(THREE, w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function start(THREE) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  /* ---------- renderer (falha aqui = fica a grade) ---------- */
  const canvas = document.createElement("canvas");
  canvas.className = "contact3d__canvas";
  canvas.setAttribute("aria-hidden", "true");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    if (!renderer.getContext()) throw new Error("sem contexto WebGL");
  } catch (err) {
    console.warn("[contact3d] WebGL indisponível, mantendo a grade:", err);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const FOV = 30;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 5000);

  /* ---------- estúdio -> environment (PMREM) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new THREE.Scene();
  studio.add(new THREE.Mesh(new THREE.BoxGeometry(100, 100, 100),
    new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.BackSide })));
  function panel(w, h, intensity, pos) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color.setScalar(intensity);
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    studio.add(m);
  }
  panel(44, 28, 3.2, [-30, 28, 30]); // softbox principal, fora do eixo
  panel(5, 60, 6, [44, 6, 16]);      // strip de borda
  panel(5, 60, 3, [-44, -4, -12]);   // strip de contra
  scene.environment = pmrem.fromScene(studio, 0.04).texture;
  scene.environmentIntensity = 0.9;
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-0.5, 1, 1.2);
  scene.add(key);
  const fill = new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.4);
  scene.add(fill);

  /* ---------- materiais (cores vindas dos tokens CSS) ---------- */
  const paper = new THREE.MeshPhysicalMaterial({ roughness: 0.72, sheen: 0.5, sheenRoughness: 0.8 });
  const paperEdge = new THREE.MeshPhysicalMaterial({ roughness: 0.4 });
  const inner = new THREE.MeshPhysicalMaterial({ roughness: 0.85 });
  const flapMat = new THREE.MeshPhysicalMaterial({ roughness: 0.6, sheen: 0.4, sheenRoughness: 0.7 });
  const seal = new THREE.MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, side: 2 });

  function readTokens() {
    const cs = getComputedStyle(document.documentElement);
    const get = (n) => new THREE.Color(cs.getPropertyValue(n).trim() || "#888");
    const surface = get("--surface"), fg = get("--fg"), accent = get("--accent"),
      warm = get("--warm"), line = get("--line"), bgSoft = get("--bg-soft");
    const light = surface.getHSL({ h: 0, s: 0, l: 0 }).l > 0.5;
    renderer.toneMappingExposure = light ? 1.15 : 1;
    fill.intensity = light ? 2.2 : 0.5;
    paper.color.copy(surface).lerp(light ? accent : fg, light ? 0.05 : 0.12);
    paper.sheenColor.copy(accent);
    paperEdge.color.copy(line).lerp(accent, 0.35);
    inner.color.copy(bgSoft).lerp(line, 0.5);
    flapMat.color.copy(surface).lerp(accent, 0.4);
    flapMat.sheenColor.copy(accent);
    seal.color.copy(warm);
    shadowMat.color.set(0x000000);
  }

  /* ---------- envelope (montado em unidades de px) ---------- */
  const group = new THREE.Group();   // tudo que gira com o parallax
  const env = new THREE.Group();     // o envelope
  group.add(env);
  scene.add(group);

  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    grd.addColorStop(0, "rgba(0,0,0,0.55)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.6 });
  readTokens();

  let parts = null; // { flapPivot, envW, envH, vPoints }
  function buildEnvelope(envW, envH) {
    env.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    env.clear();
    const bevel = { bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 3, curveSegments: 10 };
    const r = Math.min(10, envW * 0.025);

    const sh = new THREE.Mesh(new THREE.PlaneGeometry(envW * 1.35, envH * 1.5), shadowMat);
    sh.position.set(6, -14, -30);
    env.add(sh);

    // fundo (verso) e "forro" interno
    const back = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(THREE, envW, envH, r), { depth: 2, ...bevel }), [inner, paperEdge]);
    back.position.z = -2;
    env.add(back);

    // bolso da frente: topo em V (as abas laterais se encontrando)
    const vY = -envH * 0.06, sideY = envH * 0.2;
    const pocket = new THREE.Shape();
    pocket.moveTo(-envW / 2 + r, -envH / 2);
    pocket.lineTo(envW / 2 - r, -envH / 2);
    pocket.quadraticCurveTo(envW / 2, -envH / 2, envW / 2, -envH / 2 + r);
    pocket.lineTo(envW / 2, sideY);
    pocket.lineTo(0, vY);
    pocket.lineTo(-envW / 2, sideY);
    pocket.lineTo(-envW / 2, -envH / 2 + r);
    pocket.quadraticCurveTo(-envW / 2, -envH / 2, -envW / 2 + r, -envH / 2);
    const front = new THREE.Mesh(new THREE.ExtrudeGeometry(pocket, { depth: 1.5, ...bevel }), [paper, paperEdge]);
    front.position.z = 6;
    env.add(front);

    // aba de cima, presa na borda superior (pivô)
    const flapLen = envH * 0.6;
    const flap = new THREE.Shape();
    flap.moveTo(-envW / 2, 0);
    flap.lineTo(envW / 2, 0);
    flap.lineTo(envW * 0.06, -flapLen + 8);
    flap.quadraticCurveTo(0, -flapLen, -envW * 0.06, -flapLen + 8);
    flap.lineTo(-envW / 2, 0);
    const flapMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(flap, { depth: 1.2, ...bevel }), [flapMat, paperEdge]);
    const flapPivot = new THREE.Group();
    flapPivot.position.set(0, envH / 2, 9.5);
    flapPivot.add(flapMesh);
    env.add(flapPivot);

    // lacre de cera (lathe com perfil anti-horário) na ponta da aba
    const sr = Math.min(22, envW * 0.055);
    const prof = [];
    prof.push(new THREE.Vector2(0, 0));
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI / 2;
      prof.push(new THREE.Vector2(sr - 3 + Math.sin(a) * 3, 3 - Math.cos(a) * 3));
    }
    prof.push(new THREE.Vector2(sr - 3, 5.5));
    prof.push(new THREE.Vector2(sr * 0.55, 5.5));
    prof.push(new THREE.Vector2(sr * 0.5, 4));
    prof.push(new THREE.Vector2(0, 4));
    const sealMesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), seal);
    sealMesh.rotation.x = Math.PI / 2;
    sealMesh.position.set(0, -flapLen + sr + 4, 2);
    flapPivot.add(sealMesh);

    parts = { flapPivot, envW, envH, vY, sideY };
  }

  /* ---------- layout: casa a câmera com a perspectiva do CSS ---------- */
  const cards = Array.from(list.querySelectorAll(".ccard"));
  const state = cards.map(() => ({ hover: 0, hoverT: 0, nx: 0, ny: 0, w: 0, h: 0 }));
  let W = 0, H = 0, P = 1000, envCenterY = 0, finalRot = [];

  wrap.classList.add("contact3d--live");
  wrap.insertBefore(canvas, list);

  function layout() {
    W = list.offsetWidth; H = list.offsetHeight;
    if (!W || !H) return;
    P = (H / 2) / Math.tan((FOV / 2) * DEG);
    camera.aspect = W / H;
    camera.position.set(0, 0, P);
    camera.near = P * 0.2; camera.far = P * 3;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    list.style.perspective = P.toFixed(1) + "px";

    const space = parseFloat(getComputedStyle(list).paddingBottom) || 160;
    const envH = space / 0.72;
    const envW = Math.min(W * 0.92, envH / 0.62);
    envCenterY = -H / 2 + envH / 2 + 4;
    env.position.set(0, envCenterY, -40);
    buildEnvelope(envW, envH);

    const twoCols = W >= 520;
    finalRot = twoCols ? [-1.6, 1.2, 1.4, -1.1] : [-0.6, 0.5, -0.4, 0.6];
    cards.forEach((c, i) => {
      const s = state[i];
      s.w = c.offsetWidth; s.h = c.offsetHeight;
      s.nx = c.offsetLeft + s.w / 2 - W / 2;
      s.ny = c.offsetTop + s.h / 2 - H / 2;
      c.style.transformOrigin = (-s.nx + s.w / 2).toFixed(1) + "px " + (-s.ny + s.h / 2).toFixed(1) + "px";
    });
    wake();
  }

  /* ---------- animação ---------- */
  let t0 = null;               // início da abertura (s)
  let clock = 0;
  const OPEN = 0.9, RISE0 = 0.65, RISE_STEP = 0.15, RISE = 0.7, SPREAD = 0.75, SPREAD_STEP = 0.08;
  const ALL_OUT = RISE0 + RISE_STEP * 3 + RISE;
  const END = ALL_OUT + SPREAD_STEP * 3 + SPREAD;
  let done = reduced;

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const v = new THREE.Vector3();

  function project(x, y, z) {
    v.set(x, y, z);
    env.localToWorld(v);
    v.project(camera);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  }

  function pose(t) {
    const p = parts;
    const open = done ? 1 : clamp01(t / OPEN);
    p.flapPivot.rotation.x = -easeInOut(open) * 1.04 * Math.PI;
    // a aba passa por trás do bolso só depois de levantar
    p.flapPivot.position.z = open > 0.5 ? -6 : 9.5;

    const gx = -mouse.y * 2.5 * DEG, gy = mouse.x * 3.5 * DEG;
    group.rotation.set(gx, gy, 0);
    env.rotation.set(-6 * DEG, 0, 0);
    group.updateMatrixWorld(true);

    const clipping = !done && t < ALL_OUT;
    if (clipping) {
      const [lx, ly] = project(-p.envW / 2, p.sideY, 6);
      const [cx, cy] = project(0, p.vY, 6);
      const [rx, ry] = project(p.envW / 2, p.sideY, 6);
      list.style.clipPath = `polygon(0 0, 100% 0, 100% ${ry}px, ${rx}px ${ry}px, ${cx}px ${cy}px, ${lx}px ${ly}px, 0 ${ly}px)`;
    } else if (list.style.clipPath) {
      list.style.clipPath = "";
    }

    const mouthY = envCenterY + p.vY; // y (para cima) da boca do bolso, no mundo
    const restScale = Math.min(1, (p.envW * 0.8) / Math.max(...state.map((s) => s.w)));

    cards.forEach((c, i) => {
      const s = state[i];
      // final: posição natural da grade (CSS -> mundo: y invertido)
      const fx = s.nx, fy = -s.ny, fz = 0;
      let x = fx, y = fy, z = fz, rz = finalRot[i] || 0, rx = 0, sc = 1;
      if (!done) {
        const order = cards.length - 1 - i; // os de baixo saem primeiro
        const spread = (i % 2 ? 1 : -1) * p.envW * 0.08;
        const inX = spread * 0.4, inY = mouthY - (s.h * restScale) / 2 - 14, inZ = -38;
        const outX = spread, outY = mouthY + (s.h * restScale) / 2 + 10 + order * 6, outZ = -30 + order * 2;
        const kr = easeOut(clamp01((t - RISE0 - order * RISE_STEP) / RISE));
        const ks = easeBack(clamp01((t - ALL_OUT - order * SPREAD_STEP) / SPREAD));
        const ax = lerp(inX, outX, kr), ay = lerp(inY, outY, kr), az = lerp(inZ, outZ, kr);
        x = lerp(ax, fx, ks); y = lerp(ay, fy, ks); z = lerp(az, fz, ks);
        rz = lerp(spread * 0.04, finalRot[i] || 0, ks);
        rx = lerp(8, 0, ks);
        sc = lerp(restScale, 1, ks);
      }
      // hover levanta o card
      s.hover += (s.hoverT - s.hover) * 0.18;
      z += s.hover * 22; y += s.hover * 4;

      const still = Math.abs(gx) < 1e-4 && Math.abs(gy) < 1e-4 && Math.abs(z) < 0.05 && Math.abs(rx) < 0.01 && sc === 1;
      const tx = (x - s.nx).toFixed(2), ty = (-y - s.ny).toFixed(2);
      c.style.transform = still
        ? `translate(${tx}px, ${ty}px) rotate(${rz.toFixed(2)}deg)`
        : `rotateX(${(-gx / DEG).toFixed(3)}deg) rotateY(${(gy / DEG).toFixed(3)}deg) translate3d(${(x).toFixed(2)}px, ${(-y).toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${(-rx).toFixed(2)}deg) rotate(${rz.toFixed(2)}deg) scale(${sc.toFixed(4)}) translate(${(-s.nx).toFixed(2)}px, ${(-s.ny).toFixed(2)}px)`;
    });
  }

  /* ---------- loop: só roda visível, aba ativa e com algo mudando ---------- */
  let visible = false, raf = 0, last = 0;
  function settled() {
    const m = Math.abs(mouse.tx - mouse.x) + Math.abs(mouse.ty - mouse.y);
    const h = state.some((s) => Math.abs(s.hoverT - s.hover) > 0.002);
    return done && m < 0.001 && !h;
  }
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    if (t0 !== null && !done) {
      clock += dt;
      if (clock >= END) done = true;
    }
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    scene.environmentRotation.set(mouse.y * 0.45, -mouse.x * 0.8, 0);
    pose(clock);
    renderer.render(scene, camera);
    if (visible && !document.hidden && (t0 !== null || done) && !settled()) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function wake() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver((entries) => {
    const e = entries[0];
    visible = e.isIntersecting;
    if (visible && t0 === null && e.intersectionRatio >= 0.3) t0 = 0;
    if (visible) wake();
  }, { threshold: [0, 0.3] });
  io.observe(wrap);
  document.addEventListener("visibilitychange", wake);

  // teclado: focar um card durante a animação pula para o final
  list.addEventListener("focusin", (e) => {
    if (!done) { done = true; t0 = 0; }
    const i = cards.findIndex((c) => c.contains(e.target));
    if (i >= 0) state[i].hoverT = 1;
    wake();
  });
  list.addEventListener("focusout", (e) => {
    const i = cards.findIndex((c) => c.contains(e.target));
    if (i >= 0) state[i].hoverT = 0;
    wake();
  });

  if (!reduced) {
    cards.forEach((c, i) => {
      if (c.classList.contains("ccard--soon")) return;
      c.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") { state[i].hoverT = 1; wake(); } });
      c.addEventListener("pointerleave", () => { state[i].hoverT = 0; wake(); });
    });
    if (!coarse) {
      const section = wrap.closest("section") || wrap;
      section.addEventListener("pointermove", (e) => {
        const r = wrap.getBoundingClientRect();
        mouse.tx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width / 2)));
        mouse.ty = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / (r.height / 2)));
        wake();
      }, { passive: true });
      section.addEventListener("pointerleave", () => { mouse.tx = 0; mouse.ty = 0; wake(); });
    }
  }

  // cores: tema, stack e mudança do sistema; render na hora
  const recolor = () => { readTokens(); if (W) { pose(clock); renderer.render(scene, camera); } };
  document.addEventListener("themechange", recolor);
  document.addEventListener("stackchange", recolor);
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", recolor);

  // tamanho: ResizeObserver na lista (não depende de window.innerHeight)
  let pending = 0;
  const relayout = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; layout(); pose(clock); renderer.render(scene, camera); }); };
  new ResizeObserver(relayout).observe(list);
  document.addEventListener("langchange", relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  layout();
  pose(clock);
  renderer.render(scene, camera);
}
