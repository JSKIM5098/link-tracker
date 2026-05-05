import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate, formatMoney, formatNumber, lastNDays, ymd } from "@/lib/format";
import { parseRange, rangeStart, rangeDays, RANGE_LABEL } from "@/lib/range";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/Card";
import { ClicksByDayChart, type DayPoint } from "@/components/ClicksByDayChart";
import { CopyButton } from "@/components/CopyButton";
import { QRModal } from "@/components/QRModal";
import { CampaignBudgetEditor } from "@/components/CampaignBudgetEditor";
import { DeleteCampaignButton } from "@/components/DeleteCampaignButton";
import { AddLinkForm } from "@/components/AddLinkForm";
import { DateRangeTabs } from "@/components/DateRangeTabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CampaignRow = {
  id: string;
  name: string;
  description: string | null;
  spend_amount: number | null;
  revenue_amount: number | null;
  currency: string | null;
  created_at: string;
};

type LinkRow = {
  id: string;
  slug: string;
  channel: string | null;
  original_url: string;
  tracking_url: string;
  created_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { range?: string };
}) {
  if (!UUID_RE.test(params.id)) notFound();

  const range = parseRange(searchParams?.range);
  const supabase = supabaseServer();

  const [campaignRes, linksRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "id, name, description, spend_amount, revenue_amount, currency, created_at"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("links")
      .select("id, slug, channel, original_url, tracking_url, created_at")
      .eq("campaign_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  if (campaignRes.error || !campaignRes.data) notFound();

  const campaign = campaignRes.data as CampaignRow;
  const links = (linksRes.data ?? []) as LinkRow[];
  const linkIds = links.map((l) => l.id);
  const currency = campaign.currency || "KRW";

  // Total clicks (all time) for this campaign
  const totalRes =
    linkIds.length === 0
      ? { count: 0 }
      : await supabase
          .from("clicks")
          .select("*", { count: "exact", head: true })
          .in("link_id", linkIds);
  const totalClicks = totalRes.count ?? 0;

  // Range clicks for this campaign
  const start = rangeStart(range);
  let rangeQuery =
    linkIds.length === 0
      ? null
      : supabase
          .from("clicks")
          .select("clicked_at, link_id")
          .in("link_id", linkIds);
  if (rangeQuery && start) {
    rangeQuery = rangeQuery.gte("clicked_at", start.toISOString());
  }
  const rangeRes = rangeQuery ? await rangeQuery : { data: [] as never[] };
  const rangeClicks =
    (rangeRes.data ?? []) as { clicked_at: string; link_id: string }[];
  const rangeClickCount = rangeClicks.length;

  // Series for chart (only meaningful when range is bounded)
  let series: DayPoint[] = [];
  if (range !== "all") {
    const days = rangeDays(range);
    const buckets = new Map<string, number>();
    for (const d of lastNDays(days)) buckets.set(d, 0);
    for (const c of rangeClicks) {
      const key = ymd(new Date(c.clicked_at));
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    series = Array.from(buckets, ([date, clicks]) => ({ date, clicks }));
  } else {
    // For "all": bucket by day from earliest click to today (cap 180 days for sanity)
    const buckets = new Map<string, number>();
    for (const c of rangeClicks) {
      const key = ymd(new Date(c.clicked_at));
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    series = Array.from(buckets, ([date, clicks]) => ({ date, clicks })).sort(
      (a, b) => a.date.localeCompare(b.date)
    );
  }

  // Per-link breakdown for the selected range
  const perLinkRange = new Map<string, number>();
  for (const c of rangeClicks)
    perLinkRange.set(c.link_id, (perLinkRange.get(c.link_id) ?? 0) + 1);

  // Per-link all-time
  const perLinkTotalRes =
    linkIds.length === 0
      ? { data: [] as { link_id: string }[] }
      : await supabase.from("clicks").select("link_id").in("link_id", linkIds);
  const perLinkTotal = new Map<string, number>();
  for (const c of (perLinkTotalRes.data ?? []) as { link_id: string }[]) {
    perLinkTotal.set(c.link_id, (perLinkTotal.get(c.link_id) ?? 0) + 1);
  }

  // KPIs
  const blendedCpc =
    campaign.spend_amount && totalClicks > 0
      ? campaign.spend_amount / totalClicks
      : null;
  const rangeCpc =
    campaign.spend_amount && rangeClickCount > 0 && range !== "all"
      ? // best-effort: spend share allocated by clicks share
        (campaign.spend_amount * (rangeClickCount / totalClicks)) /
        rangeClickCount
      : blendedCpc;
  const roi =
    campaign.spend_amount && campaign.spend_amount > 0
      ? campaign.revenue_amount !== null
        ? ((campaign.revenue_amount - campaign.spend_amount) /
            campaign.spend_amount) *
          100
        : null
      : null;

  const defaultOriginalUrl = links[0]?.original_url ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← 대시보드
        </Link>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {campaign.name}
            </h1>
            {campaign.description ? (
              <p className="mt-1 text-sm text-slate-500">{campaign.description}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              생성: {formatDate(campaign.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeTabs basePath={`/dashboard/campaigns/${campaign.id}`} current={range} />
            <DeleteCampaignButton
              campaignId={campaign.id}
              campaignName={campaign.name}
            />
          </div>
        </div>
      </div>

      {/* Budget editor */}
      <Card title="비용 / 매출">
        <CampaignBudgetEditor
          campaignId={campaign.id}
          initialSpend={campaign.spend_amount}
          initialRevenue={campaign.revenue_amount}
          currency={currency}
        />
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="전체 클릭" value={formatNumber(totalClicks)} />
        <KpiCard
          label={`${RANGE_LABEL[range]} 클릭`}
          value={formatNumber(rangeClickCount)}
        />
        <KpiCard
          label="CPC (블렌디드)"
          value={blendedCpc !== null ? formatMoney(blendedCpc, currency) : "—"}
          hint={
            campaign.spend_amount === null
              ? "사용 금액 입력 필요"
              : totalClicks === 0
                ? "클릭 0"
                : "총 사용액 / 총 클릭"
          }
        />
        <KpiCard
          label="ROI"
          value={roi !== null ? `${roi.toFixed(1)}%` : "—"}
          hint={
            campaign.revenue_amount === null
              ? "매출 입력 시 계산"
              : "(매출 - 비용) / 비용"
          }
        />
      </div>

      {/* Range chart */}
      <Card
        title={`${RANGE_LABEL[range]} 클릭 추이`}
        action={
          rangeCpc !== null ? (
            <span className="text-xs text-slate-500">
              {RANGE_LABEL[range]} CPC: {formatMoney(rangeCpc, currency)}
            </span>
          ) : null
        }
      >
        {rangeClickCount === 0 ? (
          <EmptyState message="이 기간에 발생한 클릭이 없습니다." />
        ) : (
          <ClicksByDayChart data={series} />
        )}
      </Card>

      {/* Channel / link breakdown */}
      <Card
        title="채널별 링크 / QR"
        action={
          <AddLinkForm
            campaignId={campaign.id}
            defaultOriginalUrl={defaultOriginalUrl}
          />
        }
      >
        {links.length === 0 ? (
          <EmptyState message="이 캠페인에 등록된 링크가 없습니다." />
        ) : (
          <div className="-mx-5 overflow-x-auto sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2 font-medium sm:px-0">채널</th>
                  <th className="px-5 py-2 font-medium sm:px-0">추적 URL</th>
                  <th className="px-5 py-2 font-medium sm:px-0">{RANGE_LABEL[range]}</th>
                  <th className="px-5 py-2 font-medium sm:px-0">전체</th>
                  <th className="px-5 py-2 font-medium sm:px-0">비중</th>
                  <th className="px-5 py-2 font-medium sm:px-0"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {links.map((l) => {
                  const rangeCount = perLinkRange.get(l.id) ?? 0;
                  const totalCount = perLinkTotal.get(l.id) ?? 0;
                  const share =
                    totalClicks > 0 ? (totalCount / totalClicks) * 100 : 0;
                  return (
                    <tr key={l.id} className="text-slate-700">
                      <td className="whitespace-nowrap px-5 py-2 sm:px-0">
                        {l.channel ? (
                          <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                            {l.channel}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 font-mono text-xs text-brand-600 sm:px-0">
                        /r/{l.slug}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 sm:px-0">
                        {formatNumber(rangeCount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 sm:px-0">
                        {formatNumber(totalCount)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 text-xs text-slate-500 sm:px-0">
                        {share.toFixed(1)}%
                      </td>
                      <td className="whitespace-nowrap px-5 py-2 sm:px-0">
                        <div className="flex items-center justify-end gap-2">
                          <CopyButton value={l.tracking_url} />
                          <QRModal
                            url={l.tracking_url}
                            filename={l.slug}
                            label={`${campaign.name}${
                              l.channel ? ` · ${l.channel}` : ""
                            }`}
                          />
                        </div>
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
