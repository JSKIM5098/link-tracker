import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 진짜 "슬러그 없음(404)" 과 "DB 일시 응답 실패(503)" 을 구분한다.
// 일시 실패 시 짧게 재시도해서, Supabase 무료 플랜이 깨어나는 동안에도
// 사용자가 보는 화면이 영구 깨진 것처럼 안 보이게 한다.
async function fetchLink(slug: string) {
  const supabase = supabaseServer();
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("links")
      .select("id, original_url")
      .eq("slug", slug)
      .maybeSingle();
    if (!error) return { link: data, error: null as null };
    lastErr = error;
    // 250ms, 500ms 짧게 백오프 (Supabase wake-up 대응)
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  return { link: null, error: lastErr };
}

const NOT_FOUND_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"/><title>링크를 찾을 수 없음</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;background:#f7f8fb;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px 24px;max-width:380px;text-align:center;box-shadow:0 1px 3px rgba(15,23,42,.06)}
h1{font-size:18px;margin:0 0 6px}p{font-size:14px;color:#64748b;margin:0 0 4px}</style></head>
<body><div class="card"><h1>링크를 찾을 수 없습니다</h1>
<p>주소가 정확한지 다시 한 번 확인해 주세요.</p></div></body></html>`;

const UNAVAILABLE_HTML = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"/><title>잠시 후 다시 시도</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="refresh" content="3"/>
<style>body{font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;background:#f7f8fb;color:#0f172a;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px 24px;max-width:380px;text-align:center;box-shadow:0 1px 3px rgba(15,23,42,.06)}
h1{font-size:18px;margin:0 0 6px}p{font-size:14px;color:#64748b;margin:0 0 4px}
.spinner{width:24px;height:24px;border:3px solid #e2e8f0;border-top-color:#3b6cf6;border-radius:50%;animation:spin .8s linear infinite;margin:14px auto 18px}
@keyframes spin{to{transform:rotate(360deg)}}</style></head>
<body><div class="card"><div class="spinner"></div>
<h1>잠시 후 다시 시도하고 있어요</h1>
<p>3초 뒤 자동으로 다시 연결합니다.</p></div></body></html>`;

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  const { link, error } = await fetchLink(slug);

  // DB 일시 실패 — 자동 새로고침 페이지로 503 응답
  if (error) {
    console.error("[/r/[slug]] supabase error:", error);
    return new NextResponse(UNAVAILABLE_HTML, {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "3",
        "cache-control": "no-store",
      },
    });
  }

  // 진짜 슬러그 없음 — 친절한 404
  if (!link) {
    return new NextResponse(NOT_FOUND_HTML, {
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const url = new URL(req.url);
  const ipHash = hashIp(getClientIp(req.headers));
  const supabase = supabaseServer();

  // 클릭 기록은 best-effort — 실패해도 리다이렉트는 진행
  try {
    await supabase.from("clicks").insert({
      link_id: link.id,
      user_agent: req.headers.get("user-agent"),
      referrer: req.headers.get("referer"),
      ip_hash: ipHash,
      utm_source: url.searchParams.get("utm_source"),
      utm_medium: url.searchParams.get("utm_medium"),
      utm_campaign: url.searchParams.get("utm_campaign"),
    });
  } catch (e) {
    console.error("[/r/[slug]] click insert failed (continuing):", e);
  }

  // UTM 전달
  const target = new URL(link.original_url);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = url.searchParams.get(k);
    if (v && !target.searchParams.has(k)) target.searchParams.set(k, v);
  }

  return NextResponse.redirect(target.toString(), 302);
}
