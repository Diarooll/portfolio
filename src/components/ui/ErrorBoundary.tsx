"use client";
// Se uma cena 3D quebrar (driver, contexto perdido...), a página continua:
// mostramos o desenho em SVG no lugar.
import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode; onError?: (e: unknown) => void; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("3D desligado:", e);
    this.props.onError?.(e);
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
