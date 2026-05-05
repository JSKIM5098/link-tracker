import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { lastNDays, formatDate, formatNumber, ymd } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/Card";
import { ClicksByDayChart, type DayPoint } from "@/components/ClicksByDayChart";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CampaignRow = {
  id: string;
  name: string;
  hotel_name: string | null;
  channel: string | null;
  created_at: string;
};

type LinkRow = {
  id: string;
  slug: string;
  original_url: string;
  tracking_url: string;
  created_at: string;
  campaign_id: string;
  campaigns: { name: string; hotel_name: string | null; channel: string | null } | null;
};

type ClickRow = {
  id: string;
  clicked_at: string;
  link_id: string;
  user_agent: string | null;
  referrer: string | null;
  utm_source: string | null;
};

export default async function DashboardPage() {
  const supabase = supabaseServer();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 29);
  since30.setHours(0, 0, 0, 0);

  const [
    campaignsRes,
    linksRes,
    totalClicksRes,
    todayClicksRes,
    recentClicksRes,
    rangeClicksRes,
  ] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, hotel_name, channel, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("links")
      .select(
        "id, slug, original_url, tracking_url, created_at, campaign_id, campaigns(name, hotel_name, channel)"
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("clicks").select("*", { count: "exact", head: true }),
    supabase
      .from("clicks")
      .select("*", { count: "exact", head: true })
      .gte("clicked_at", startOfToday.toISOString()),
    supabase
      .from("clicks")
      .select("id, clicked_at, link_id, user_agent, referrer, utm_source")
      .order("clicked_at", { ascending: false })
      .limit(20),
    supabase
      .from("clicks")
      .select("clicked_at, link_id")
      .gte("clicked_at", since30.toISOString()),
  ]);

  const campaigns = (campaignsRes.data ?? []) as CampaignRow[];
  const links = (linksRes.data ?? []) as unknown as LinkRow[];
  const totalClicks = totalClicksRes.count ?? 0;
  const todayClicks = todayClicksRes.count ?? 0;
  const recentClicks = (recentClicksRes.data ?? []) as ClickRow[];
  const rangeClicks =
    (rangeClicksRes.data ?? []) as { clicked_at: string; link_id: string }[];

  // Build per-day series for the last 30 days
  const dayBuckets = new Map<string, number>();
  for (const d of lastNDays(30)) dayBuckets.set(d, 0);
  for (const c of rangeClicks) {
    const key = ymd(new Date(c.clicked_at));
    if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const series: DayPoint[] = Array.from(dayBuckets, ([date, clicks]) => ({
    date,
    clicks,
  }));

  // Per-link click counts (last 30d) — for the link list
  const perLinkCounts = new Map<string, number>();
  for (const c of rangeClicks) {
    perLinkCounts.set(c.link_id, (perLinkCounts.get(c.link_id) ?? 0) + 1);
  }

  // Per-campaign click counts (last 30d) — derived from links
  const linkToCampaign = new Map(links.map((l) => [l.id, l.campaign_id]));
  const perCampaignCounts = new Map<string, number>();
  for (const c of rangeClicks) {
    const cid = linkToCampaign.get(c.link_id);
    if (cid) {
      perCampaignCounts.set(cid, (perCampaignCounts.get(cid) ?? 0) + 1);
    }
  }

  // Map link_id -> tracking + campaign label for the recent clicks table
  const linkLabel = new Map(
    links.map((l) => [
      l.id,
      {
        slug: l.slug,
        campaignName: l.campaigns?.name ?? "—",
      },
    ])
  );

  const activeCampaigns = campaigns.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            대시보드
          </h1>
          <p className="text-sm text-slate-500">
            캠페인별 추적 링크 성과를 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/clicks.csv"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            CSV 다운로드
          </a>
          <Link
            href="/dashboard/new"
            className="rounded-md bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            + 새 캠페인
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="전체 클릭" value={formatNumber(totalClicks)} />
        <KpiCard label="오늘 클릭" value={formatNumber(todayClicks)} />
        <KpiCard label="활성 캠페인" value={formatNumber(activeCampaigns)} />
        <KpiCard label="활성 링크" value={formatNumber(links.length)} />
      </div>

      <Card title="최근 30일 클릭 추이">
        {rangeClicks.length === 0 ? (
          <EmptyState message="아직 기록된 클릭이 없습니다." />
        ) : (
          <ClicksByDayChart data={series} />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="캠페인">
          {campaigns.length === 0 ? (
            <EmptyState message="첫 번째 캠페인을 만들어보세요." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {campaigns.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {c.name}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[c.hotel_name, c.channel].filter(Boolean).join(" · ") ||
                        "—"}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3 text-right">
                    <div className="text-sm font-semibold text-slate-900">
                      {formatNumber(perCampaignCounts.get(c.id) ?? 0)}
                    </div>
                    <div className="text-[11px] text-slate-400">최근 30일</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="링크">
          {links.length === 0 ? (
            <EmptyState message="캠페인을 만들면 추적 링크가 표시됩니다." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {links.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {l.campaigns?.name ?? "—"}{" "}
                      <span className="text-slate-400">/</span>{" "}
                      <span className="font-mono text-brand-600">
                        /r/{l.slug}
                      </span>
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      → {l.original_url}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatNumber(perLinkCounts.get(l.id) ?? 0)}
                    </span>
                    <CopyButton value={l.tracking_url} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="최근 클릭">
        {recentClicks.length === 0 ? (
          <EmptyState message="클릭이 발생하면 여기에 표시됩니다." />
        ) : (
          <div className="-mx-5 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2 font-medium sm:px-0">시각</th>
                  <th className="px-5 py-2 font-medium sm:px-0">캠페인</th>
                  <th className="px-5 py-2 font-medium sm:px-0">링크</th>
                  <th className="hidden px-5 py-2 font-medium md:table-cell">
                    유입
                  </th>
                  <th className="hidden px-5 py-2 font-medium md:table-cell">
                    User Agent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentClicks.map((c) => {
                  const meta = linkLabel.get(c.link_id);
                  return (
                    <tr key={c.id} className="text-slate-700">
                      <td className="whitespace-nowrap px-5 py-2 sm:px-0">
                        {formatDate(c.clicked_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 sm:px-0">
                        {meta?.campaignName ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 font-mono text-brand-600 sm:px-0">
                        /r/{meta?.slug ?? "?"}
                      </td>
                      <td className="hidden max-w-[200px] truncate px-5 py-2 md:table-cell">
                        {c.utm_source || c.referrer || "direct"}
                      </td>
                      <td className="hidden max-w-[280px] truncate px-5 py-2 text-slate-500 md:table-cell">
                        {c.user_agent || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-slate-200 px-4 py-10 text-sm text-slate-500">
      {message}
    </div>
  );
}
