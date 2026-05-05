import type { RangeKey } from "./types";

export const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "최근 7일",
  "30d": "최근 30일",
  "90d": "최근 90일",
  "all": "전체 기간",
};

export const RANGE_ORDER: RangeKey[] = ["7d", "30d", "90d", "all"];

export function parseRange(v: string | undefined | null): RangeKey {
  if (v === "7d" || v === "30d" || v === "90d" || v === "all") return v;
  return "30d";
}

export function rangeStart(r: RangeKey): Date | null {
  if (r === "all") return null;
  const days = r === "7d" ? 7 : r === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function rangeDays(r: RangeKey, fallback = 30): number {
  if (r === "7d") return 7;
  if (r === "30d") return 30;
  if (r === "90d") return 90;
  return fallback;
}
