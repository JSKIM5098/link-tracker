"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

export function CampaignBudgetEditor({
  campaignId,
  initialSpend,
  initialRevenue,
  currency = "KRW",
}: {
  campaignId: string;
  initialSpend: number | null;
  initialRevenue: number | null;
  currency?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [spend, setSpend] = useState(
    initialSpend !== null ? String(initialSpend) : ""
  );
  const [revenue, setRevenue] = useState(
    initialRevenue !== null ? String(initialRevenue) : ""
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function parseAmount(v: string): number | null | "invalid" {
    if (!v.trim()) return null;
    const n = Number(v.replace(/,/g, ""));
    if (Number.isNaN(n) || n < 0) return "invalid";
    return n;
  }

  async function save() {
    setErr(null);
    const s = parseAmount(spend);
    const r = parseAmount(revenue);
    if (s === "invalid") return setErr("사용 금액이 올바르지 않습니다.");
    if (r === "invalid") return setErr("매출 금액이 올바르지 않습니다.");

    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spend_amount: s, revenue_amount: r }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "저장 실패");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="grid grid-cols-2 gap-6">
          <Stat label="사용 금액" value={formatMoney(initialSpend, currency)} />
          <Stat label="매출 (선택)" value={formatMoney(initialRevenue, currency)} />
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          금액 수정
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            사용 금액 ({currency})
          </span>
          <input
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
            placeholder="500000"
            inputMode="numeric"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            매출 ({currency}, 선택)
          </span>
          <input
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            placeholder="(ROI 계산용)"
            inputMode="numeric"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </div>
      {err ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
          {err}
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setErr(null);
            setSpend(initialSpend !== null ? String(initialSpend) : "");
            setRevenue(initialRevenue !== null ? String(initialRevenue) : "");
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}
