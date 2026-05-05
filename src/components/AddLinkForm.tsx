"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddLinkForm({
  campaignId,
  defaultOriginalUrl,
}: {
  campaignId: string;
  defaultOriginalUrl: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("");
  const [slug, setSlug] = useState("");
  const [originalUrl, setOriginalUrl] = useState(defaultOriginalUrl);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/links`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel: channel.trim() || null,
          slug: slug.trim() || undefined,
          original_url: originalUrl.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "추가 실패");
      setOpen(false);
      setChannel("");
      setSlug("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
      >
        + 채널 QR 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            채널 *
          </span>
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            placeholder="예: Instagram"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            required
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            Slug (선택)
          </span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="(자동 생성)"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-slate-600">
            도착 URL
          </span>
          <input
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            type="url"
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
            setOpen(false);
            setErr(null);
          }}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "추가 중..." : "링크 + QR 생성"}
        </button>
      </div>
    </form>
  );
}
