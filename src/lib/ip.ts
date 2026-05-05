import { createHash } from "node:crypto";

export function getClientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT ?? "";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}
