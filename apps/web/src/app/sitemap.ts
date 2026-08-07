import type { MetadataRoute } from "next";
import { BLOG, FEATURE_PAGES } from "@/features/marketing";

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
  const staticPages: MetadataRoute.Sitemap = pages.map(([path, priority]) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
    priority,
  }));
  const posts: MetadataRoute.Sitemap = BLOG.map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.iso,
    changeFrequency: "monthly",
    priority: 0.5,
  }));
  const featurePages: MetadataRoute.Sitemap = FEATURE_PAGES.map((f) => ({
    url: `${BASE}/features/${f.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [...staticPages, ...posts, ...featurePages];
}
