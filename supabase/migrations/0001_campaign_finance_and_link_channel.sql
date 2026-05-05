-- Migration: campaign finance fields + per-link channel
-- Idempotent. Safe to run multiple times.

-- 1) Money tracking on campaigns
alter table campaigns
  add column if not exists spend_amount   numeric,
  add column if not exists revenue_amount numeric,
  add column if not exists currency       text default 'KRW';

-- 2) Channel moves to the link level (one campaign -> many channel-tagged QR codes)
alter table links
  add column if not exists channel text;

-- 3) Backfill: if existing campaigns had a channel set on the campaign,
--    copy it down to their links so we don't lose the label.
update links l
set channel = c.channel
from campaigns c
where l.campaign_id = c.id
  and l.channel is null
  and c.channel is not null
  and c.channel <> '';

-- Note: campaigns.hotel_name and campaigns.channel columns are kept for
-- backward compatibility but are no longer written by the app.
