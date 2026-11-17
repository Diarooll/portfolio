// Fica fora de components/three de propósito: este teste não pode puxar o three.js
// para o pacote principal (o 3D só baixa quando precisa).

/** dá para usar WebGL? Sem isso, a página usa os desenhos em SVG */
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
