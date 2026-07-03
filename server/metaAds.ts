// Full Meta Ads draft creation: campaign → ad set → (optional image) →
// creative → ad. Everything is created in PAUSED status so a human reviews
// and activates it from Meta Ads Manager.
const GRAPH = "https://graph.facebook.com/v18.0";

export interface MetaAdsDraftInput {
  adAccountId: string; // "act_..."
  token: string;
  pageId: string;
  campaignName: string;
  objective?: string; // OUTCOME_TRAFFIC | OUTCOME_ENGAGEMENT | ...
  dailyBudgetUsd: number;
  countries: string[]; // e.g. ["AR", "MX"]
  ageMin?: number;
  ageMax?: number;
  message: string; // primary text
  headline?: string;
  link: string; // destination URL
  imageUrl?: string; // public image URL (optional)
}

export interface MetaAdsDraftResult {
  ok: boolean;
  status: number;
  steps: { step: string; id?: string; error?: any }[];
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
  adId?: string;
}

async function graphPost(path: string, body: Record<string, any>, token: string): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  let data: any;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text().catch(() => "") };
  }
  return { ok: res.ok, status: res.status, data };
}

export async function createMetaAdsDraft(input: MetaAdsDraftInput): Promise<MetaAdsDraftResult> {
  const steps: MetaAdsDraftResult["steps"] = [];
  const acc = input.adAccountId.startsWith("act_") ? input.adAccountId : `act_${input.adAccountId}`;

  // 1. Campaign (PAUSED)
  const campaign = await graphPost(
    `${acc}/campaigns`,
    {
      name: input.campaignName,
      objective: input.objective || "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: [],
    },
    input.token
  );
  steps.push({ step: "campaign", id: campaign.data?.id, error: campaign.ok ? undefined : campaign.data });
  if (!campaign.ok) return { ok: false, status: campaign.status, steps };
  const campaignId = campaign.data.id;

  // 2. Ad set (PAUSED, daily budget in cents)
  const adSet = await graphPost(
    `${acc}/adsets`,
    {
      name: `${input.campaignName} — Ad Set`,
      campaign_id: campaignId,
      daily_budget: Math.max(100, Math.round(input.dailyBudgetUsd * 100)),
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      targeting: {
        geo_locations: { countries: input.countries.length ? input.countries : ["AR"] },
        age_min: input.ageMin ?? 18,
        age_max: input.ageMax ?? 65,
      },
      status: "PAUSED",
    },
    input.token
  );
  steps.push({ step: "adset", id: adSet.data?.id, error: adSet.ok ? undefined : adSet.data });
  if (!adSet.ok) return { ok: false, status: adSet.status, steps, campaignId };
  const adSetId = adSet.data.id;

  // 3. Optional image upload → hash
  let imageHash: string | undefined;
  if (input.imageUrl) {
    const img = await graphPost(`${acc}/adimages`, { url: input.imageUrl }, input.token);
    const images = img.data?.images || {};
    const first: any = Object.values(images)[0];
    imageHash = first?.hash;
    steps.push({ step: "adimage", id: imageHash, error: img.ok ? undefined : img.data });
    // A failed image is non-fatal: the creative falls back to link-only.
  }

  // 4. Creative
  const linkData: Record<string, any> = {
    message: input.message,
    link: input.link,
  };
  if (input.headline) linkData.name = input.headline;
  if (imageHash) linkData.image_hash = imageHash;

  const creative = await graphPost(
    `${acc}/adcreatives`,
    {
      name: `${input.campaignName} — Creative`,
      object_story_spec: { page_id: input.pageId, link_data: linkData },
    },
    input.token
  );
  steps.push({ step: "creative", id: creative.data?.id, error: creative.ok ? undefined : creative.data });
  if (!creative.ok) return { ok: false, status: creative.status, steps, campaignId, adSetId };
  const creativeId = creative.data.id;

  // 5. Ad (PAUSED)
  const ad = await graphPost(
    `${acc}/ads`,
    {
      name: `${input.campaignName} — Ad 1`,
      adset_id: adSetId,
      creative: { creative_id: creativeId },
      status: "PAUSED",
    },
    input.token
  );
  steps.push({ step: "ad", id: ad.data?.id, error: ad.ok ? undefined : ad.data });
  if (!ad.ok) return { ok: false, status: ad.status, steps, campaignId, adSetId, creativeId };

  return { ok: true, status: 200, steps, campaignId, adSetId, creativeId, adId: ad.data.id };
}
