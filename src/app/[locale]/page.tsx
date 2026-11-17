import { getTranslations, setRequestLocale } from "next-intl/server";
import Landscape from "@/components/landscape/Landscape";
import Nav from "@/components/ui/Nav";
import Hero from "@/components/sections/Hero";
import Sobre from "@/components/sections/Sobre";
import Stack from "@/components/sections/Stack";
import Projetos from "@/components/sections/Projetos";
import Jornada from "@/components/sections/Jornada";
import Contato from "@/components/sections/Contato";
import Footer from "@/components/sections/Footer";
import Experience from "@/components/Experience";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("nav");
  return (
    <>
      <a className="skip" href="#conteudo">
        {t("skip")}
      </a>
      <Landscape />
      <Nav />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <Sobre />
        <Stack />
        <Projetos />
        <Jornada />
        <Contato />
      </main>
      <Footer />
      <Experience />
    </>
  );
}
