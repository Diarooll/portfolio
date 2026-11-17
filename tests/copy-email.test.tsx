// Botão de copiar e-mail: copia pela área de transferência ou seleciona o texto.
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import CopyEmail from "@/components/ui/CopyEmail";

const labels = { copy: "Copiar e-mail", copied: "copiado.", fail: "selecionado. Use Ctrl+C." };

function setup() {
  render(
    <div>
      <span id="mail">seu-email@exemplo.com</span>
      <CopyEmail email="seu-email@exemplo.com" targetId="mail" labels={labels} />
    </div>,
  );
  return screen.getByRole("button", { name: "Copiar e-mail" });
}

afterEach(() => vi.restoreAllMocks());

describe("CopyEmail", () => {
  it("copia o e-mail e avisa no status", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(setup());
    expect(writeText).toHaveBeenCalledWith("seu-email@exemplo.com");
    expect(await screen.findByRole("status")).toHaveTextContent("copiado.");
  });

  it("sem permissão, seleciona o texto e explica como copiar", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("negado"));
    await user.click(setup());
    expect(await screen.findByRole("status")).toHaveTextContent("Use Ctrl+C");
    expect(window.getSelection()?.toString()).toBe("seu-email@exemplo.com");
  });

  it("o aviso some depois de alguns segundos", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(setup());
    expect(await screen.findByRole("status")).toHaveTextContent("copiado.");
    await act(async () => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.getByRole("status")).toHaveTextContent("");
    vi.useRealTimers();
  });
});
