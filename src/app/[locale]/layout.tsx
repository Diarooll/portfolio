import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { headScript } from "@/lib/motion";
import { site } from "@/content/site";
import { fontVars } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const path = locale === routing.defaultLocale ? "/" : `/${locale}`;
  return {
    metadataBase: new URL(site.url),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: path,
      languages: { "pt-BR": "/", en: "/en", "x-default": "/" },
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: site.name,
      title: t("title"),
      description: t("description"),
      locale: locale === "pt" ? "pt_BR" : "en_US",
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    authors: [{ name: site.name, url: site.github }],
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3c93da" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1430" },
  ],
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    // suppressHydrationWarning: o script do <head> mexe nas classes/atributos do <html> antes do React
    <html lang={locale === "pt" ? "pt-BR" : "en"} data-theme="light" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
