import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

// Re-generate at most hourly; park data changes slowly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const parks = await prisma.park.findMany({
    where: { status: "APPROVED" },
    select: { slug: true, updatedAt: true },
  });

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/reviews`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.5 },
    {
      url: `${SITE_URL}/legal/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/legal/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const parkRoutes: MetadataRoute.Sitemap = parks.map((park) => ({
    url: `${SITE_URL}/parks/${park.slug}`,
    lastModified: park.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...parkRoutes];
}
