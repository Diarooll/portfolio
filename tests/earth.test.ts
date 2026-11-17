// Terra do Contato: texturas existem, são leves e o enquadramento faz sentido.
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EARTH, EARTH_CREDITS } from "@/content/earth";

describe("Terra do Contato", () => {
  it("texturas existem em public/ e têm menos de 500 KB", () => {
    for (const src of [EARTH.day, EARTH.night]) {
      const f = join(process.cwd(), "public", src);
      expect(existsSync(f)).toBe(true);
      expect(statSync(f).size).toBeLessThan(500 * 1024);
    }
  });
  it("a Terra sai do quadro embaixo (centro abaixo da tela) e o eixo é inclinado", () => {
    expect(EARTH.desktop.y).toBeGreaterThan(1);
    expect(EARTH.mobile.y).toBeGreaterThan(1);
    expect(EARTH.tilt).toBeCloseTo(23.4, 0);
  });
  it("créditos da NASA registrados", () => {
    expect(EARTH_CREDITS.every((c) => c.url.startsWith("https://science.nasa.gov/"))).toBe(true);
  });
});
