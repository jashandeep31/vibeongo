import type { MetadataRoute } from "next";

const siteUrl = "https://vibeongo.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
    },
    {
      url: `${siteUrl}/contact`,
    },
    {
      url: `${siteUrl}/privacy`,
    },
    {
      url: `${siteUrl}/terms`,
    },
  ];
}
