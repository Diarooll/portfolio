// Modo de movimento da página: "full" (coreografia completa) ou "reduced"
// (versão calma, pensada para quem pede menos movimento no sistema).
// ?motion=full ou ?motion=reduced na URL força um dos modos (útil para revisar).

export type MotionMode = "full" | "reduced";

export function resolveMotion(search: string, prefersReduced: boolean): MotionMode {
  try {
    const q = new URLSearchParams(search).get("motion");
    if (q === "full" || q === "reduced") return q;
  } catch {
    /* URL estranha: segue a preferência do sistema */
  }
  return prefersReduced ? "reduced" : "full";
}

/** o modo foi forçado pela URL? (aí mudanças no sistema não valem) */
export function motionOverride(search: string): MotionMode | null {
  try {
    const q = new URLSearchParams(search).get("motion");
    return q === "full" || q === "reduced" ? q : null;
  } catch {
    return null;
  }
}

/** lê o modo já aplicado no <html> pelo script do <head> */
export function currentMotion(): MotionMode {
  if (typeof document === "undefined") return "full";
  return document.documentElement.dataset.motion === "reduced" ? "reduced" : "full";
}

export const THEME_KEY = "diego-theme";

// Script que roda no <head>, antes da primeira pintura, para não piscar:
// marca js/fx/rm, o modo de movimento e o tema salvo.
// Fica em string porque vai inline no HTML (sem esperar o bundle).
export const headScript = `(function(){var d=document.documentElement,m=null;d.classList.add('js');
try{var q=new URLSearchParams(location.search).get('motion');if(q==='full'||q==='reduced')m=q;}catch(e){}
if(!m){try{m=matchMedia('(prefers-reduced-motion: reduce)').matches?'reduced':'full';}catch(e){m='full';}}
d.setAttribute('data-motion',m);d.classList.add('fx');if(m==='reduced')d.classList.add('rm');
try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);}catch(e){}
})();`;
