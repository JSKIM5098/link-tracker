export type Campaign = {
  id: string;
  name: string;
  hotel_name: string | null;          // legacy, no longer written
  channel: string | null;             // legacy, no longer written (moved to links)
  description: string | null;
  spend_amount: number | null;
  revenue_amount: number | null;
  currency: string | null;
  created_at: string;
};

export type Link = {
  id: string;
  campaign_id: string;
  slug: string;
  channel: string | null;
  original_url: string;
  tracking_url: string;
  created_at: string;
};

export type Click = {
  id: string;
  link_id: string;
  clicked_at: string;
  user_agent: string | null;
  referrer: string | null;
  ip_hash: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

export type RangeKey = "7d" | "30d" | "90d" | "all";
