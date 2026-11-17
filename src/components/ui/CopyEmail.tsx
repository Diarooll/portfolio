"use client";
// Botão "Copiar e-mail". Usa a área de transferência; se o navegador não deixar
// (http, permissão negada), seleciona o texto para a pessoa copiar com Ctrl+C.
import { useEffect, useRef, useState } from "react";

export interface CopyEmailProps {
  email: string;
  /** id do elemento com o e-mail, para selecionar no plano B */
  targetId: string;
  labels: { copy: string; copied: string; fail: string };
}

export function selectText(el: HTMLElement | null) {
  if (!el || !window.getSelection) return false;
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
  return true;
}

export default function CopyEmail({ email, targetId, labels }: CopyEmailProps) {
  const [state, setState] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const done = (ok: boolean) => {
    if (!ok) selectText(document.getElementById(targetId));
    setState(ok ? labels.copied : labels.fail);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState(""), 2500);
  };

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("sem clipboard");
      await navigator.clipboard.writeText(email);
      done(true);
    } catch {
      done(false);
    }
  };

  return (
    <>
      <button className="btn btn-leaf btn-sm" type="button" onClick={copy}>
        {labels.copy}
      </button>
      <span className="copy-state" role="status" aria-live="polite">
        {state}
      </span>
    </>
  );
}
