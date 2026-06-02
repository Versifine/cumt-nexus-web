const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const siteUrl = value || DEFAULT_SITE_URL;

  try {
    return new URL(siteUrl);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}
