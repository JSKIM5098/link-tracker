import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

// Always run on Node so node:crypto + service-role key are available.
export const runtime = "nodejs";
// Never cache redirects.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  const supabase = supabaseServer();

  const { data: link, error } = await supabase
    .from("links")
    .select("id, original_url")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !link) {
    return new NextResponse("Link not found", { status: 404 });
  }

  const url = new URL(req.url);
  const ipHash = hashIp(getClientIp(req.headers));

  // Fire-and-await the click insert so it lands before the user leaves.
  // (Supabase write is fast; this still returns ~tens of ms.)
  await supabase.from("clicks").insert({
    link_id: link.id,
    user_agent: req.headers.get("user-agent"),
    referrer: req.headers.get("referer"),
    ip_hash: ipHash,
    utm_source: url.searchParams.get("utm_source"),
    utm_medium: url.searchParams.get("utm_medium"),
    utm_campaign: url.searchParams.get("utm_campaign"),
  });

  // Forward any UTM params the visitor brought along to the destination,
  // unless the destination already specifies them.
  const target = new URL(link.original_url);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = url.searchParams.get(k);
    if (v && !target.searchParams.has(k)) target.searchParams.set(k, v);
  }

  return NextResponse.redirect(target.toString(), 302);
}
