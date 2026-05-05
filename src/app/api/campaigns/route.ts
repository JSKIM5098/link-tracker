import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isValidSlug, normalizeSlug, randomSlug } from "@/lib/slug";
import { trackingUrlFor } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  hotel_name?: string | null;
  channel?: string | null;
  description?: string | null;
  original_url?: string;
  slug?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const originalUrl = body.original_url?.trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!originalUrl)
    return NextResponse.json({ error: "original_url is required" }, { status: 400 });

  try {
    const u = new URL(originalUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
  } catch {
    return NextResponse.json({ error: "Invalid original_url" }, { status: 400 });
  }

  const requestedSlug = body.slug ? normalizeSlug(body.slug) : "";
  if (requestedSlug && !isValidSlug(requestedSlug)) {
    return NextResponse.json(
      { error: "Slug must be 2-64 chars of [a-z0-9_-]" },
      { status: 400 }
    );
  }

  const supabase = supabaseServer();

  // 1) Insert campaign
  const { data: campaign, error: campaignErr } = await supabase
    .from("campaigns")
    .insert({
      name,
      hotel_name: body.hotel_name ?? null,
      channel: body.channel ?? null,
      description: body.description ?? null,
    })
    .select("id")
    .single();

  if (campaignErr || !campaign) {
    return NextResponse.json(
      { error: campaignErr?.message ?? "Failed to create campaign" },
      { status: 500 }
    );
  }

  // 2) Insert link with retry on slug collision
  const maxAttempts = requestedSlug ? 1 : 5;
  let lastError: string | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const slug = requestedSlug || randomSlug();
    const tracking = trackingUrlFor(slug);
    const { data: link, error: linkErr } = await supabase
      .from("links")
      .insert({
        campaign_id: campaign.id,
        slug,
        original_url: originalUrl,
        tracking_url: tracking,
      })
      .select("id, slug, tracking_url")
      .single();

    if (!linkErr && link) {
      return NextResponse.json(
        { campaign_id: campaign.id, link },
        { status: 201 }
      );
    }

    // 23505 = unique_violation
    const isUnique =
      (linkErr as { code?: string } | null)?.code === "23505" ||
      (linkErr?.message ?? "").includes("duplicate");
    lastError = linkErr?.message ?? "unknown";
    if (!isUnique) break;
    if (requestedSlug) {
      // Roll back the campaign so the user can pick a different slug.
      await supabase.from("campaigns").delete().eq("id", campaign.id);
      return NextResponse.json(
        { error: "이미 사용 중인 slug 입니다." },
        { status: 409 }
      );
    }
  }

  await supabase.from("campaigns").delete().eq("id", campaign.id);
  return NextResponse.json(
    { error: lastError ?? "Failed to create link" },
    { status: 500 }
  );
}
