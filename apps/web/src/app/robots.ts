import type { MetadataRoute } from "next";

// Marketing pages are crawlable; the app shell, auth, and unlisted share
// links are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/login",
        "/watch/",
        "/dashboard",
        "/canvas",
        "/clips",
        "/projects",
        "/assets",
        "/templates",
        "/video-editor",
        "/explore",
        "/search",
        "/settings",
        "/help",
      ],
    },
    sitemap: "https://riocut.com/sitemap.xml",
  };
}
