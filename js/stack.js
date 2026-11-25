/* =====================================================================
 * stack.js: seletor Python | Java
 * ---------------------------------------------------------------------
 * Muda data-stack no <html> (independente de data-theme) e lembra a
 * escolha em localStorage "stack". A troca é animada por um círculo
 * que cresce a partir do botão clicado (View Transitions API).
 * Sem a API: fade curto. Com prefers-reduced-motion: troca direta.
 * ===================================================================== */
(function () {
  "use strict";

  const root = document.documentElement;
  const buttons = document.querySelectorAll("[data-stack-btn]");
  if (!buttons.length) return;

  function current() {
    return root.getAttribute("data-stack") === "java" ? "java" : "python";
  }

  function paint(stack) {
    root.setAttribute("data-stack", stack);
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-stack-btn") === stack));
    });
    try { localStorage.setItem("stack", stack); } catch (e) { /* sem armazenamento */ }
    // topo.js relê as cores do canvas; i18n/typing reagem ao stack
    document.dispatchEvent(new CustomEvent("themechange", { detail: { stack: stack } }));
    document.dispatchEvent(new CustomEvent("stackchange", { detail: { stack: stack } }));
  }

  function setStack(stack, originEl) {
    if (stack === current()) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) { paint(stack); return; }

    if (typeof document.startViewTransition === "function") {
      const r = (originEl || buttons[0]).getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const radius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y)
      );
      const t = document.startViewTransition(function () { paint(stack); });
      t.ready.then(function () {
        root.animate(
          { clipPath: ["circle(0px at " + x + "px " + y + "px)",
                       "circle(" + radius + "px at " + x + "px " + y + "px)"] },
          { duration: 700, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)" }
        );
      }).catch(function () {});
      return;
    }

    // fallback: fade de ~300 ms (150 saindo + 150 entrando)
    root.classList.add("stack-fade");
    setTimeout(function () {
      paint(stack);
      root.classList.remove("stack-fade");
    }, 150);
  }

  buttons.forEach(function (b) {
    b.setAttribute("aria-pressed", String(b.getAttribute("data-stack-btn") === current()));
    b.addEventListener("click", function () {
      setStack(b.getAttribute("data-stack-btn"), b);
    });
    // setas esquerda/direita alternam entre as pílulas
    b.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const other = Array.prototype.find.call(buttons, function (x) { return x !== b; });
      if (other) { other.focus(); setStack(other.getAttribute("data-stack-btn"), other); }
    });
  });
})();
