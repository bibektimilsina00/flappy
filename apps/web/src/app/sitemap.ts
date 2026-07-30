import type { MetadataRoute } from "next";

const BASE = "https://riocut.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: Array<[path: string, priority: number]> = [
    ["", 1],
    ["/features", 0.9],
    ["/pricing", 0.9],
    ["/about", 0.5],
    ["/blog", 0.6],
    ["/contact", 0.5],
    ["/privacy", 0.2],
    ["/terms", 0.2],
    ["/data-deletion", 0.2],
  ];
  return pages.map(([path, priority]) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
    priority,
  }));
}
