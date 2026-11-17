// Ícone monocromático: o SVG vira máscara e pega a cor do texto (currentColor).
// Assim os logos ficam todos na cor da paleta, nos dois temas.
import type { IconId } from "@/content/techs";
import { iconSrc } from "@/content/techs";

export default function TechIcon({ id, className = "" }: { id: IconId; className?: string }) {
  return <span className={`ticon ${className}`} style={{ ["--icon" as string]: `url(${iconSrc(id)})` }} aria-hidden="true" />;
}
