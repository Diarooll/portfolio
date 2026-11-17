// Modo de movimento: ?motion= manda; sem ele, vale a preferência do sistema.
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMotion } from "@/lib/motion";
import { useReducedMotionPref } from "@/hooks/useReducedMotionPref";

function mockMatchMedia(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes("prefers-reduced-motion") ? reduce : false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
  document.documentElement.removeAttribute("data-motion");
  document.documentElement.classList.remove("rm");
});

describe("resolveMotion", () => {
  it("segue o sistema sem parâmetro", () => {
    expect(resolveMotion("", true)).toBe("reduced");
    expect(resolveMotion("", false)).toBe("full");
  });
  it("?motion= ganha do sistema", () => {
    expect(resolveMotion("?motion=full", true)).toBe("full");
    expect(resolveMotion("?motion=reduced", false)).toBe("reduced");
  });
  it("ignora valores desconhecidos", () => {
    expect(resolveMotion("?motion=zoom", true)).toBe("reduced");
  });
});

describe("useReducedMotionPref", () => {
  it("lê a preferência do sistema e marca o <html>", async () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useReducedMotionPref());
    await waitFor(() => expect(result.current.reduced).toBe(true));
    expect(document.documentElement.dataset.motion).toBe("reduced");
    expect(document.documentElement.classList.contains("rm")).toBe(true);
  });
  it("respeita ?motion=reduced mesmo com o sistema pedindo movimento", async () => {
    mockMatchMedia(false);
    window.history.replaceState(null, "", "/?motion=reduced");
    const { result } = renderHook(() => useReducedMotionPref());
    await waitFor(() => expect(result.current.mode).toBe("reduced"));
  });
  it("modo completo por padrão", async () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useReducedMotionPref());
    await waitFor(() => expect(result.current.mode).toBe("full"));
    expect(document.documentElement.classList.contains("rm")).toBe(false);
  });
});
