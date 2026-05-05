import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isValidSlug, normalizeSlug, randomSlug } from "@/lib/slug";
import { trackingUrlFor } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  channel?: string | null;
  original_url?: string;
  slug?: string;
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id))
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Look up the campaign + its existing primary link to inherit original_url.
  const { data: existing, error: existingErr } = await supabase
    .from("campaigns")
    .select("id, links(original_url, created_at)")
    .eq("id", params.id)
    .maybeSingle();

  if (existingErr || !existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Pick a default destination URL: explicit body wins, else the oldest existing link.
  let originalUrl = body.original_url?.trim();
  if (!originalUrl) {
    const links =
      (existing as { links?: { original_url: string; created_at: string }[] }).links ?? [];
    const sorted = [...links].sort((a, b) =>
      a.created_at.localeCompare(b.created_at)
    );
    originalUrl = sorted[0]?.original_url;
  }
  if (!originalUrl)
    return NextResponse.json(
      { error: "original_url is required for the first link" },
      { status: 400 }
    );

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

  const channel = body.channel?.trim() || null;
  const maxAttempts = requestedSlug ? 1 : 5;
  let lastError: string | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const slug = requestedSlug || randomSlug();
    const tracking = trackingUrlFor(slug);
    const { data: link, error: linkErr } = await supabase
      .from("links")
      .insert({
        campaign_id: params.id,
        slug,
        channel,
        original_url: originalUrl,
        tracking_url: tracking,
      })
      .select("id, slug, channel, tracking_url, original_url")
      .single();

    if (!linkErr && link) {
      return NextResponse.json({ link }, { status: 201 });
    }

    const isUnique =
      (linkErr as { code?: string } | null)?.code === "23505" ||
      (linkErr?.message ?? "").includes("duplicate");
    lastError = linkErr?.message ?? "unknown";
    if (!isUnique) break;
    if (requestedSlug) {
      return NextResponse.json(
        { error: "이미 사용 중인 slug 입니다." },
        { status: 409 }
      );
    }
  }
  return NextResponse.json(
    { error: lastError ?? "Failed to create link" },
    { status: 500 }
  );
}
