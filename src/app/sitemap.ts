import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { en: `${site.url}/`, "pt-BR": `${site.url}/pt`, "x-default": `${site.url}/` };
  return [
    { url: `${site.url}/`, changeFrequency: "monthly", priority: 1, alternates: { languages } },
    { url: `${site.url}/pt`, changeFrequency: "monthly", priority: 0.8, alternates: { languages } },
  ];
}
