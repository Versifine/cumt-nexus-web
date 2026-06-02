import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

const routes = [
  { path: "/", priority: 1 },
  { path: "/communities", priority: 0.9 },
  { path: "/community-applications/new", priority: 0.7 },
  { path: "/login", priority: 0.5 },
  { path: "/register", priority: 0.5 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return routes.map((route) => ({
    url: new URL(route.path, siteUrl).toString(),
    priority: route.priority,
  }));
}
