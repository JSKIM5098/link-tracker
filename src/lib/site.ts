export function siteUrl(): string {
  const v = process.env.NEXT_PUBLIC_SITE_URL;
  if (!v) return "http://localhost:3000";
  return v.replace(/\/+$/, "");
}

export function trackingUrlFor(slug: string): string {
  return `${siteUrl()}/r/${slug}`;
}
