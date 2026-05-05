import { NewCampaignForm } from "@/components/NewCampaignForm";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function NewCampaignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          새 캠페인 만들기
        </h1>
        <p className="text-sm text-slate-500">
          캠페인 정보와 함께 첫 추적 링크와 QR 코드를 생성합니다.
        </p>
      </div>
      <NewCampaignForm siteUrl={siteUrl()} />
    </div>
  );
}
