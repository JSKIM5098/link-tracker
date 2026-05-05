"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

export function NewCampaignForm({ siteUrl }: { siteUrl: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [slug, setSlug] = useState("");
  const [spend, setSpend] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSlug = slug.trim() || "your-slug";
  const previewUrl = useMemo(
    () => `${siteUrl}/r/${previewSlug}`,
    [siteUrl, previewSlug]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("캠페인명을 입력해주세요.");
    if (!originalUrl.trim()) return setError("원본 URL을 입력해주세요.");
    try {
      new URL(originalUrl);
    } catch {
      return setError("원본 URL 형식이 올바르지 않습니다.");
    }

    let spendNum: number | null = null;
    if (spend.trim()) {
      const cleaned = Number(spend.replace(/,/g, ""));
      if (Number.isNaN(cleaned) || cleaned < 0)
        return setError("사용 금액은 0 이상의 숫자만 입력 가능합니다.");
      spendNum = cleaned;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          original_url: originalUrl.trim(),
          channel: channel.trim() || null,
          slug: slug.trim() || undefined,
          spend_amount: spendNum,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "생성에 실패했습니다.");
      router.push(`/dashboard/campaigns/${json.campaign_id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-card"
      >
        <Field label="캠페인명 *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 2025 봄 프로모션"
            className={inputCls}
            required
          />
        </Field>

        <Field label="설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="이 캠페인에 대한 메모"
            rows={3}
            className={`${inputCls} resize-y`}
          />
        </Field>

        <Field label="원본 URL *" hint="QR 또는 추적 링크 클릭 시 이동할 도착 URL.">
          <input
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            placeholder="https://example.com/promotion"
            type="url"
            className={inputCls}
            required
          />
        </Field>

        <Field
          label="첫 채널 (선택)"
          hint="예: Instagram / 네이버 카페 / 매장 팜플렛. 캠페인 생성 후 같은 URL의 다른 채널 QR을 추가로 만들 수 있습니다."
        >
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="Instagram"
            className={inputCls}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Slug (선택)"
            hint="비워두면 자동 생성. 영문/숫자/하이픈만, 2~64자."
          >
            <div className="flex items-stretch overflow-hidden rounded-md border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
              <span className="bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {siteUrl}/r/
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="(자동 생성)"
                className="flex-1 px-3 py-2 text-sm outline-none"
              />
            </div>
          </Field>

          <Field label="사용 금액 (원, 선택)" hint="나중에 캠페인 상세에서 수정할 수 있습니다.">
            <input
              value={spend}
              onChange={(e) => setSpend(e.target.value)}
              placeholder="500000"
              inputMode="numeric"
              className={inputCls}
            />
          </Field>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "생성 중..." : "캠페인 생성"}
          </button>
        </div>
      </form>

      <aside className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          QR 코드 미리보기
        </h3>
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <QRCodeCanvas value={previewUrl} size={220} level="M" />
          </div>
          <div className="break-all text-center text-xs text-slate-500">
            {previewUrl}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          저장 후 동일한 추적 URL의 QR 코드가 캠페인 상세 페이지에서 다운로드됩니다.
        </p>
      </aside>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
