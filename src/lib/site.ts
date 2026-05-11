export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  const trimmed = raw.replace(/\/+$/, "");
  // If the env var came in without a scheme (e.g. "myapp.vercel.app"),
  // default to https — bare hosts in QR codes break on some scanners.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function trackingUrlFor(slug: string): string {
  return `${siteUrl()}/r/${slug}`;
}
