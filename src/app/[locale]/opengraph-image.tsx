// Imagem de compartilhamento (Open Graph), gerada no build para cada idioma.
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Diego Olalla";

export default async function OG({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: "64px 72px",
        background: "linear-gradient(#3c93da, #b5dcf5 70%)",
        position: "relative",
        fontFamily: "serif",
      }}
    >
      {/* morro e árvore, como no hero */}
      <div style={{ position: "absolute", left: -200, right: -200, bottom: -420, height: 640, borderRadius: "50%", background: "#5e9e2f", display: "flex" }} />
      <div style={{ position: "absolute", right: 170, bottom: 190, width: 26, height: 120, background: "#5b3f2a", display: "flex" }} />
      <div style={{ position: "absolute", right: 60, bottom: 260, width: 250, height: 230, borderRadius: "50%", background: "#4e8a2a", display: "flex" }} />
      <div style={{ position: "absolute", right: 120, bottom: 330, width: 140, height: 120, borderRadius: "50%", background: "#7fb843", display: "flex" }} />
      <div style={{ display: "flex", fontSize: 128, fontWeight: 700, color: "#231e2b", letterSpacing: -4, lineHeight: 1 }}>Diego Olalla</div>
      <div
        style={{
          display: "flex",
          marginTop: 18,
          fontSize: 40,
          color: "#fbf8ef",
          background: "rgba(35,30,43,0.78)",
          padding: "10px 22px",
          borderRadius: 16,
          alignSelf: "flex-start",
        }}
      >
        {t("role")} · back-end · Python · Java
      </div>
    </div>,
    size,
  );
}
