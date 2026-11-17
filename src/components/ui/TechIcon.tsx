// Ícone de tecnologia: o SVG vira máscara e pega a cor do texto (currentColor),
// ou a cor passada em "color" (as cores de marca, na Stack).
import type { IconId } from "@/content/techs";
import { iconSrc } from "@/content/techs";

export default function TechIcon({ id, className = "", color }: { id: IconId; className?: string; color?: string }) {
  return <span className={`ticon ${className}`} style={{ ["--icon" as string]: `url(${iconSrc(id)})`, ...(color ? { color } : {}) }} aria-hidden="true" />;
}
