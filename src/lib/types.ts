export type Campaign = {
  id: string;
  name: string;
  hotel_name: string | null;
  channel: string | null;
  description: string | null;
  created_at: string;
};

export type Link = {
  id: string;
  campaign_id: string;
  slug: string;
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

export type LinkWithCampaign = Link & {
  campaign: Pick<Campaign, "id" | "name" | "hotel_name" | "channel"> | null;
  click_count: number;
};
