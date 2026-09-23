import type { MetadataRoute } from "next";

import { locations, services } from "@/content/site";
import { absoluteUrl } from "@/lib/seo";

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes: Array<{
  path: string;
  changeFrequency: SitemapEntry["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/services", changeFrequency: "weekly", priority: 0.9 },
  { path: "/shrink-wrapping", changeFrequency: "weekly", priority: 0.95 },
  { path: "/locations", changeFrequency: "weekly", priority: 0.9 },
  { path: "/quote", changeFrequency: "weekly", priority: 0.9 },
  { path: "/booking", changeFrequency: "weekly", priority: 0.9 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/condition-report", changeFrequency: "monthly", priority: 0.8 },
  { path: "/preview", changeFrequency: "monthly", priority: 0.7 },
];

function createEntry(
  path: string,
  changeFrequency: SitemapEntry["changeFrequency"],
  priority: number,
): SitemapEntry {
  return {
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  // /services/shrink-wrapping is a 301 to /shrink-wrapping (listed above).
  const serviceRoutes = services
    .filter((service) => service.slug !== "shrink-wrapping")
    .map((service) => createEntry(`/services/${service.slug}`, "monthly", 0.8));

  const locationRoutes = locations.map((location) =>
    createEntry(`/locations/${location.slug}`, "monthly", 0.8),
  );

  const serviceLocationRoutes = services.flatMap((service) =>
    locations.map((location) =>
      createEntry(`/${service.slug}/${location.slug}`, "monthly", 0.7),
    ),
  );

  return [
    ...staticRoutes.map((route) =>
      createEntry(route.path, route.changeFrequency, route.priority),
    ),
    ...serviceRoutes,
    ...locationRoutes,
    ...serviceLocationRoutes,
  ];
}
