-- Link Tracker schema (fresh-install version)
-- For existing databases, see supabase/migrations/ for incremental upgrades.

create extension if not exists "pgcrypto";

create table if not exists campaigns (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  spend_amount   numeric,            -- 캠페인 사용 금액
  revenue_amount numeric,            -- 캠페인 매출 (선택, ROI 계산용)
  currency       text default 'KRW',
  hotel_name     text,               -- legacy, kept for backward compat (unused)
  channel        text,               -- legacy, channel moved to links table
  created_at     timestamptz not null default now()
);

create table if not exists links (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  slug         text not null unique,
  channel      text,                 -- 채널 라벨 (예: Instagram, 네이버 카페)
  original_url text not null,
  tracking_url text not null,
  created_at   timestamptz not null default now()
);

create index if not exists links_campaign_idx on links(campaign_id);

create table if not exists clicks (
  id           uuid primary key default gen_random_uuid(),
  link_id      uuid not null references links(id) on delete cascade,
  clicked_at   timestamptz not null default now(),
  user_agent   text,
  referrer     text,
  ip_hash      text,
  utm_source   text,
  utm_medium   text,
  utm_campaign text
);

create index if not exists clicks_link_idx        on clicks(link_id);
create index if not exists clicks_clicked_at_idx  on clicks(clicked_at desc);

-- The Next.js app uses the service-role key in server code, so locking the
-- public anon role down to nothing is safe.
alter table campaigns enable row level security;
alter table links     enable row level security;
alter table clicks    enable row level security;
-- (No policies on purpose: service-role bypasses RLS, public role gets nothing.)
