// Stack: cada tecnologia tem cor de marca e a face escolhida deixa o logo visível.
import { describe, expect, it } from "vitest";
import { techs } from "@/content/techs";
import { BRAND, DARK_FACE, contrast, enamel, faceTone } from "@/content/brands";
import { stackCopy } from "@/content/stack";

describe("cores de marca da Stack", () => {
  it("toda tecnologia tem cor de marca em hex", () => {
    for (const t of techs) {
      expect(BRAND[t.id]).toBeDefined();
      for (const c of BRAND[t.id].colors) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it("Python é azul e amarelo; Django e PostgreSQL usam face clara", () => {
    expect(BRAND.python.colors).toEqual(["#3776AB", "#FFD43B"]);
    expect(faceTone("django")).toBe("light");
    expect(faceTone("postgresql")).toBe("light");
  });
  it("logo em face escura sempre tem pelo menos uma cor com contraste 3:1", () => {
    for (const t of techs) if (faceTone(t.id) === "dark") expect(Math.max(...BRAND[t.id].colors.map((c) => contrast(c, DARK_FACE)))).toBeGreaterThanOrEqual(3);
  });
  it("o rótulo da Stack não fala mais de centro nem de órbita desenhada", () => {
    expect(stackCopy.label.pt).not.toMatch(/terminal|centro|órbita/i);
  });

  it("peças esmaltadas: corpo na cor da marca e logo legível", () => {
    for (const t of techs) {
      const e = enamel(t.id);
      expect(e.top).toMatch(/^#[0-9a-f]{6}$/i);
      expect(e.body).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrast(e.ink, BRAND[t.id].colors[0])).toBeGreaterThanOrEqual(3);
    }
    expect(enamel("python").logo).toEqual(["#ffffff", "#FFD43B"]);
  });
});
