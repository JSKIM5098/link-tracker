# Link Tracker

Next.js 14 (App Router) + Supabase + Tailwind CSS 기반의 캠페인 추적 링크 / QR 코드 생성기.

- 관리자가 캠페인별 추적 링크를 생성합니다.
- 모든 추적 링크에는 QR 코드가 자동으로 만들어집니다 (PNG 다운로드 지원).
- 사용자가 `/r/[slug]` 또는 QR 코드로 접속하면 클릭 데이터를 저장한 뒤 원본 URL로 302 리다이렉트합니다.
- 관리자 대시보드에서 KPI / 캠페인별 / 링크별 클릭 수, 30일 추이 그래프, 최근 클릭 로그, CSV 다운로드를 제공합니다.

---

## 1. 파일 구조

```
Link-tracker/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.local.example
├── .gitignore
├── README.md
├── supabase/
│   └── schema.sql                  # campaigns / links / clicks 테이블 생성
└── src/
    ├── app/
    │   ├── layout.tsx              # 루트 레이아웃
    │   ├── globals.css             # Tailwind 진입점
    │   ├── page.tsx                # / -> /dashboard 리다이렉트
    │   ├── dashboard/
    │   │   ├── layout.tsx          # 헤더/네비게이션
    │   │   ├── page.tsx            # 대시보드 (KPI/리스트/차트/최근 클릭)
    │   │   └── new/page.tsx        # 캠페인+링크 생성 폼
    │   ├── r/[slug]/route.ts       # 클릭 기록 후 원본 URL로 리다이렉트
    │   └── api/
    │       ├── campaigns/route.ts  # POST: 캠페인+링크 생성
    │       └── clicks.csv/route.ts # GET: CSV 다운로드
    ├── components/
    │   ├── Card.tsx
    │   ├── KpiCard.tsx
    │   ├── CopyButton.tsx
    │   ├── ClicksByDayChart.tsx    # recharts (client component)
    │   ├── NewCampaignForm.tsx     # 폼 + QR 미리보기 (client)
    │   └── QRPreview.tsx           # qrcode.react + PNG 다운로드 (client)
    └── lib/
        ├── supabase/server.ts      # service-role 서버 클라이언트
        ├── types.ts
        ├── slug.ts                 # 랜덤 slug + 검증
        ├── ip.ts                   # IP 해시 (개인정보 보호)
        ├── site.ts                 # 사이트 URL / tracking URL 빌더
        └── format.ts               # 날짜·숫자 포맷, 30일 버킷
```

---

## 2. 사전 준비물

- Node.js 18.18 이상
- Supabase 프로젝트 (무료 플랜 OK)
- Vercel 계정 (배포 시)

---

## 3. Supabase 설정

1. [Supabase Dashboard](https://supabase.com/dashboard) 에서 새 프로젝트를 만든다.
2. 좌측 **SQL Editor** → **New query** 에 `supabase/schema.sql` 내용을 붙여넣고 **Run**.
   - `campaigns`, `links`, `clicks` 테이블과 인덱스, RLS가 생성된다.
   - 앱은 service-role 키로만 접근하므로 public 권한은 닫혀 있어도 안전하다.
3. **Settings → API** 에서 다음 값을 확인한다.
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (절대 클라이언트에 노출 금지)

---

## 4. 로컬 실행

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 파일 생성
cp .env.local.example .env.local
# 그 후 .env.local 에 Supabase URL/Key, 사이트 URL, IP_HASH_SALT 입력

# 3) 개발 서버 실행
npm run dev
# http://localhost:3000  → 자동으로 /dashboard 로 이동
```

테스트 흐름:

1. `/dashboard/new` 에서 캠페인 + 첫 추적 링크를 만든다.
2. 우측 패널에서 QR 미리보기와 PNG 다운로드를 확인한다.
3. 생성된 `/r/<slug>` 를 새 탭에서 연다 → 원본 URL로 리다이렉트.
4. `/dashboard` 로 돌아오면 KPI · 차트 · 최근 클릭에 반영된 결과가 보인다.
5. 우상단 **CSV 다운로드** 로 원본 클릭 로그 CSV 를 받을 수 있다.

---

## 5. 환경변수

| 변수 | 설명 | 예시 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | `https://abcd.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 공개 키 (현재는 미사용이지만 향후 client 확장용으로 보관) | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 키. 절대 노출 금지 | `eyJhbGci...` |
| `NEXT_PUBLIC_SITE_URL` | 추적 URL/QR 코드의 도메인 | `https://your-app.vercel.app` |
| `IP_HASH_SALT` | 방문자 IP 해시용 솔트 (긴 랜덤 문자열) | `s7-...` |

> 로컬에서는 `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, 프로덕션에서는 실제 도메인을 넣어야 QR 코드가 올바른 URL을 가리킨다.

---

## 6. Vercel 배포

1. 이 폴더를 GitHub 리포지토리에 푸시한다.
2. Vercel → **Add New Project** → 해당 리포지토리 선택. 프레임워크는 자동으로 **Next.js** 로 인식된다.
3. **Environment Variables** 에 `.env.local.example` 의 모든 값을 추가한다.
   - `NEXT_PUBLIC_SITE_URL` 은 배포 도메인(예: `https://link-tracker.vercel.app`)으로 설정.
4. **Deploy**. 배포 완료 후 같은 대시보드가 동작한다.
5. (선택) 커스텀 도메인을 연결한 뒤 `NEXT_PUBLIC_SITE_URL` 을 갱신하고 재배포하면, 이후 생성되는 추적 링크/QR이 새 도메인으로 발급된다. 기존 링크의 `tracking_url` 을 일괄 갱신하려면 Supabase SQL Editor에서:

```sql
update links
set tracking_url = 'https://your-domain.com/r/' || slug;
```

---

## 7. 데이터베이스 스키마 요약

```text
campaigns (id, name, hotel_name, channel, description, created_at)
links     (id, campaign_id → campaigns, slug UNIQUE, original_url, tracking_url, created_at)
clicks    (id, link_id → links, clicked_at, user_agent, referrer, ip_hash,
           utm_source, utm_medium, utm_campaign)
```

- `links.slug` 는 unique. 사용자가 직접 입력하면 충돌 시 409 응답, 자동 생성 시 최대 5회 재시도.
- `clicks.ip_hash` 는 `sha256(IP_HASH_SALT + ip)` 의 앞 32자만 저장 (원본 IP는 저장하지 않음).
- 클릭 시 방문자가 가져온 `utm_*` 파라미터는 클릭 로그에 저장되며, 원본 URL에 동일 키가 없을 경우 그대로 전달된다.

---

## 8. 사용한 라이브러리

- `next@14`, `react@18` — App Router, 서버 컴포넌트
- `@supabase/supabase-js` — Postgres 접근
- `qrcode.react` — 클라이언트 QR 캔버스 + PNG 다운로드
- `recharts` — 30일 클릭 추이 영역 차트
- `tailwindcss@3` — 유틸리티 스타일

---

## 9. 다음에 추가하면 좋은 기능 (TODO)

- 관리자 인증 (Supabase Auth + middleware)
- 캠페인당 추적 링크 추가/삭제 UI
- 캠페인 상세 페이지 (`/dashboard/campaigns/[id]`)
- 디바이스/국가별 분석 (User-Agent 파싱, IP geo)
- A/B 테스트 슬라이서

문제 발생 시:
- `Missing NEXT_PUBLIC_SUPABASE_URL ...` → `.env.local` 누락. dev 서버 재시작 필요.
- 리다이렉트 시 404 → slug 가 DB에 없는 경우. `/dashboard` 에서 정확한 slug 확인.
- QR이 `localhost` 를 가리킴 → 프로덕션에서는 `NEXT_PUBLIC_SITE_URL` 을 도메인으로 바꾸고 재배포.
