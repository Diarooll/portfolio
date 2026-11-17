// Logos dos projetos, desenhados com as fontes das marcas.

export function SentsLogo() {
  return (
    <svg viewBox="0 0 294 130" focusable="false" aria-hidden="true">
      <text x="4" y="100" style={{ fontFamily: "var(--font-bodoni), Didot, serif" }} fontStyle="italic" fontWeight="400" fontSize="118" fill="currentColor">
        S
      </text>
      <line x1="50" y1="4" x2="22" y2="128" stroke="currentColor" strokeWidth="2.6" />
      <text
        x="80"
        y="100"
        style={{ fontFamily: "var(--font-outfit), 'Avenir Next', sans-serif" }}
        fontWeight="400"
        fontSize="108"
        letterSpacing="-3"
        fill="currentColor"
      >
        ents
      </text>
      <rect x="274" y="86" width="14" height="14" fill="currentColor" />
    </svg>
  );
}

// gota de chuva em "pixels" + nome, como na marca da ALERA
const DROP =
  "M26 -4h8v8h-8zM26 6h8v8h-8zM16 16h8v8h-8zM26 16h8v8h-8zM36 16h8v8h-8zM16 26h8v8h-8zM36 26h8v8h-8zM6 36h8v8h-8zM16 36h8v8h-8zM36 36h8v8h-8zM46 36h8v8h-8zM6 46h8v8h-8zM16 46h8v8h-8zM36 46h8v8h-8zM46 46h8v8h-8zM-4 56h8v8h-8zM6 56h8v8h-8zM16 56h8v8h-8zM36 56h8v8h-8zM46 56h8v8h-8zM56 56h8v8h-8zM-4 66h8v8h-8zM6 66h8v8h-8zM16 66h8v8h-8zM26 66h8v8h-8zM36 66h8v8h-8zM46 66h8v8h-8zM56 66h8v8h-8zM6 76h8v8h-8zM16 76h8v8h-8zM36 76h8v8h-8zM46 76h8v8h-8zM16 86h8v8h-8zM26 86h8v8h-8zM36 86h8v8h-8z";

export function AleraLogo() {
  return (
    <>
      <svg className="drop" viewBox="-21 -7 108 102" focusable="false" aria-hidden="true">
        <path d={DROP} />
        <path d="M-8 2h6v6h-6zM74 -6h6v6h-6zM70 16h6v6h-6zM-20 44h6v6h-6zM80 58h6v6h-6z" />
      </svg>
      <span>ALERA</span>
    </>
  );
}
