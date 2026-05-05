import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PatchBody = {
  name?: string;
  description?: string | null;
  spend_amount?: number | null;
  revenue_amount?: number | null;
  currency?: string | null;
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (!v) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    patch.name = v;
  }
  if ("description" in body) patch.description = body.description ?? null;
  if ("spend_amount" in body) {
    if (body.spend_amount === null) patch.spend_amount = null;
    else if (typeof body.spend_amount === "number" && body.spend_amount >= 0)
      patch.spend_amount = body.spend_amount;
    else return NextResponse.json({ error: "spend_amount must be >= 0" }, { status: 400 });
  }
  if ("revenue_amount" in body) {
    if (body.revenue_amount === null) patch.revenue_amount = null;
    else if (typeof body.revenue_amount === "number" && body.revenue_amount >= 0)
      patch.revenue_amount = body.revenue_amount;
    else return NextResponse.json({ error: "revenue_amount must be >= 0" }, { status: 400 });
  }
  if (typeof body.currency === "string") {
    const v = body.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(v))
      return NextResponse.json({ error: "currency must be a 3-letter code" }, { status: 400 });
    patch.currency = v;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });

  const supabase = supabaseServer();
  const { error } = await supabase.from("campaigns").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!UUID_RE.test(params.id))
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const supabase = supabaseServer();
  // Cascades delete links + clicks per FK on delete cascade.
  const { error } = await supabase.from("campaigns").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
