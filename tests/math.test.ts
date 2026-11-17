import { describe, expect, it } from "vitest";
import { clamp, keyframes, progress } from "@/lib/math";
import { branchY, branchR } from "@/lib/branch";

describe("math", () => {
  it("clamp e progress ficam entre 0 e 1", () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(progress(50, 0, 100)).toBe(0.5);
  });
  it("keyframes interpola e segura as pontas", () => {
    const k = [
      { y: 0, v: 0 },
      { y: 100, v: 1 },
    ];
    expect(keyframes(k, -10)).toBe(0);
    expect(keyframes(k, 50)).toBeCloseTo(0.5);
    expect(keyframes(k, 200)).toBe(1);
  });
  it("o galho do Contato fica dentro da faixa e engrossa para a direita", () => {
    for (let x = 0; x <= 1; x += 0.1) {
      expect(branchY(x)).toBeGreaterThan(0.2);
      expect(branchY(x)).toBeLessThan(0.9);
    }
    expect(branchR(1, 200)).toBeGreaterThan(branchR(0, 200));
  });
});
