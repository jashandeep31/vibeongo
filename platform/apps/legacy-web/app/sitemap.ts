import type { MetadataRoute } from "next";
import { LEGAL_LAST_UPDATED, absoluteUrl } from "@/lib/seo";

// Only public marketing pages. App routes (dashboard, projects, chats, …)
// redirect to app.vibeongo.com and are excluded in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      images: [absoluteUrl("/assets/hero.png"), absoluteUrl("/assets/app.png")],
    },
    {
      url: absoluteUrl("/pricing"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/app"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
      images: [absoluteUrl("/assets/app.png")],
    },
    {
      url: absoluteUrl("/contact"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: new Date(LEGAL_LAST_UPDATED.privacy),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: new Date(LEGAL_LAST_UPDATED.terms),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
