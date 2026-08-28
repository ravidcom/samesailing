import type { MetadataRoute } from "next";
import { getAllSailingIds } from "@/lib/cruiseData";

const BASE_URL = "https://samesailing.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/contact`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/trust-safety`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const sailingIds = await getAllSailingIds();
  const sailingRoutes: MetadataRoute.Sitemap = sailingIds.flatMap((id) => [
    { url: `${BASE_URL}/sailing/${id}`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/sailing/${id}/board`, changeFrequency: "daily", priority: 0.6 },
  ]);

  return [...staticRoutes, ...sailingRoutes];
}
