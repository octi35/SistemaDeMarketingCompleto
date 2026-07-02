// Background metrics collector: closes the publish → measure loop.
// Uses the credentials captured at publish time (secret refs) to snapshot
// likes/comments for every registered post and build a local time series.
import { listPosts, saveMetricSnapshots, getMetricsAuth, listMetrics, MetricSnapshot } from "../serverStore";
import { resolveSecret } from "./secretStore";

const GRAPH = "https://graph.facebook.com/v18.0";

async function fetchInstagramSnapshot(postId: string, token: string): Promise<MetricSnapshot | null> {
  try {
    const r = await fetch(`${GRAPH}/${postId}?fields=like_count,comments_count&access_token=${token}`);
    if (!r.ok) return null;
    const d = (await r.json()) as any;
    const likes = d.like_count || 0;
    const comments = d.comments_count || 0;
    return { postId, network: "instagram", ts: new Date().toISOString(), likes, comments, engagement: likes + comments };
  } catch {
    return null;
  }
}

async function fetchFacebookSnapshot(postId: string, token: string): Promise<MetricSnapshot | null> {
  try {
    const r = await fetch(
      `${GRAPH}/${postId}?fields=likes.summary(true),comments.summary(true)&access_token=${token}`
    );
    if (!r.ok) return null;
    const d = (await r.json()) as any;
    const likes = d.likes?.summary?.total_count || 0;
    const comments = d.comments?.summary?.total_count || 0;
    return { postId, network: "facebook", ts: new Date().toISOString(), likes, comments, engagement: likes + comments };
  } catch {
    return null;
  }
}

export interface CollectResult {
  collected: number;
  postsChecked: number;
  hasInstagramAuth: boolean;
  hasFacebookAuth: boolean;
}

/** Snapshots metrics for every registered post with available credentials. */
export async function collectMetricsOnce(): Promise<CollectResult> {
  const auth = getMetricsAuth();
  const igToken = auth.instagram ? resolveSecret(auth.instagram.tokenRef) : undefined;
  const fbToken = auth.facebook ? resolveSecret(auth.facebook.tokenRef) : undefined;

  const posts = listPosts().filter((p) => p.postId);
  const snaps: MetricSnapshot[] = [];
  let checked = 0;

  for (const post of posts) {
    if (post.network === "instagram" && igToken) {
      checked++;
      const s = await fetchInstagramSnapshot(post.postId, igToken);
      if (s) snaps.push(s);
    } else if (post.network === "facebook" && fbToken) {
      checked++;
      const s = await fetchFacebookSnapshot(post.postId, fbToken);
      if (s) snaps.push(s);
    }
    // LinkedIn engagement stats require extra API permissions; skipped for now.
  }

  const collected = saveMetricSnapshots(snaps);
  if (collected > 0) {
    console.log(`[Metrics] Guardados ${collected} snapshots de métricas (${checked} posts consultados).`);
  }
  return {
    collected,
    postsChecked: checked,
    hasInstagramAuth: !!igToken,
    hasFacebookAuth: !!fbToken,
  };
}

export interface MetricsSummary {
  totalPosts: number;
  totalEngagement: number;
  totalLikes: number;
  totalComments: number;
  byNetwork: Record<string, { posts: number; engagement: number }>;
  /** Latest snapshot per post, newest first. */
  latestPerPost: MetricSnapshot[];
  /** Full time series (for charts). */
  series: MetricSnapshot[];
}

export function buildMetricsSummary(): MetricsSummary {
  const series = listMetrics();
  const latest = new Map<string, MetricSnapshot>();
  for (const s of series) {
    const prev = latest.get(s.postId);
    if (!prev || prev.ts < s.ts) latest.set(s.postId, s);
  }
  const latestPerPost = [...latest.values()].sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const byNetwork: Record<string, { posts: number; engagement: number }> = {};
  let totalEngagement = 0;
  let totalLikes = 0;
  let totalComments = 0;
  for (const s of latestPerPost) {
    totalEngagement += s.engagement;
    totalLikes += s.likes;
    totalComments += s.comments;
    byNetwork[s.network] = byNetwork[s.network] || { posts: 0, engagement: 0 };
    byNetwork[s.network].posts++;
    byNetwork[s.network].engagement += s.engagement;
  }
  return {
    totalPosts: latestPerPost.length,
    totalEngagement,
    totalLikes,
    totalComments,
    byNetwork,
    latestPerPost,
    series,
  };
}
