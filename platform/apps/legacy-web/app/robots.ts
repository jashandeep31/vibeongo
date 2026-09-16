import type { MetadataRoute } from "next";

const siteUrl = "https://vibeongo.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/projects", "/chats", "/admin", "/invite"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
