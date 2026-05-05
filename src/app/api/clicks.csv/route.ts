import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClickRow = {
  clicked_at: string;
  user_agent: string | null;
  referrer: string | null;
  ip_hash: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  links: {
    slug: string;
    channel: string | null;
    original_url: string;
    tracking_url: string;
    campaigns: { name: string } | null;
  } | null;
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("clicks")
    .select(
      "clicked_at, user_agent, referrer, ip_hash, utm_source, utm_medium, utm_campaign, links(slug, channel, original_url, tracking_url, campaigns(name))"
    )
    .order("clicked_at", { ascending: false })
    .limit(10000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as ClickRow[];

  const header = [
    "clicked_at",
    "campaign_name",
    "channel",
    "slug",
    "tracking_url",
    "original_url",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "referrer",
    "user_agent",
    "ip_hash",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.clicked_at,
        r.links?.campaigns?.name,
        r.links?.channel,
        r.links?.slug,
        r.links?.tracking_url,
        r.links?.original_url,
        r.utm_source,
        r.utm_medium,
        r.utm_campaign,
        r.referrer,
        r.user_agent,
        r.ip_hash,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  // UTF-8 BOM so Excel opens Korean correctly.
  const body = "﻿" + lines.join("\n");
  const filename = `clicks-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
