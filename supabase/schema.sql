-- Link Tracker schema
-- Run this in Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

create table if not exists campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  hotel_name  text,
  channel     text,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists links (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  slug         text not null unique,
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

-- Recommended: enable RLS and rely on the service-role key for server-side
-- access only. The Next.js app uses the service-role key in server code, so
-- locking down the public anon role is safe.
alter table campaigns enable row level security;
alter table links     enable row level security;
alter table clicks    enable row level security;

-- (No policies on purpose: service-role bypasses RLS, public role gets nothing.)
