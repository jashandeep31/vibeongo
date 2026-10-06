import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in areas and routes that only redirect to app.vibeongo.com.
      disallow: [
        "/dashboard",
        "/projects",
        "/chats",
        "/admin",
        "/invite",
        "/new",
        "/login",
        "/signup",
        "/api/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
