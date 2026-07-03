// Auto-publishing worker. Publishes due scheduled posts by calling the
// publish functions directly (no HTTP round-trip to our own server) and
// resolves encrypted token refs just-in-time.
import { getDuePending, markScheduled, ScheduledPost } from "../serverStore";
import { unsealPayloadTokens } from "./secretStore";
import {
  publishInstagramPost,
  publishInstagramCarousel,
  publishFacebookPost,
  publishLinkedInPost,
  PublishResult,
} from "./publish";
import { collectMetricsOnce } from "./metricsHistory";
import { maybeSendWeeklyReport } from "./weeklyReport";
import { fireWebhook } from "./webhooks";

export function publishScheduled(post: Pick<ScheduledPost, "network" | "payload">): Promise<PublishResult> {
  const payload = unsealPayloadTokens(post.payload || {});
  const token = payload.token || payload.pageToken || payload.accessToken;
  if (!token) {
    return Promise.resolve({ ok: false, status: 401, data: { error: "El post programado no tiene token guardado." } });
  }

  if (post.network === "instagram") {
    if (Array.isArray(payload.imageUrls) && payload.imageUrls.length >= 2) {
      return publishInstagramCarousel({
        igAccountId: payload.igAccountId,
        imageUrls: payload.imageUrls,
        caption: payload.caption,
        token,
      });
    }
    return publishInstagramPost({
      igAccountId: payload.igAccountId,
      imageUrl: payload.imageUrl || payload.imageUrls?.[0],
      caption: payload.caption,
      token,
    });
  }
  if (post.network === "facebook") {
    return publishFacebookPost({
      pageId: payload.pageId,
      message: payload.message ?? payload.caption,
      imageUrls: payload.imageUrls,
      token,
    });
  }
  return publishLinkedInPost({
    text: payload.text ?? payload.caption,
    authorUrn: payload.authorUrn,
    imageUrls: payload.imageUrls,
    token,
  });
}

let schedulerRunning = false;

export async function processScheduledPosts(): Promise<void> {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    const due = getDuePending(new Date().toISOString());
    for (const post of due) {
      try {
        const result = await publishScheduled(post);
        if (result.ok) {
          markScheduled(post.id, { status: "published", resultId: result.postId });
          console.log(`[Scheduler] Published scheduled post ${post.id} (${post.network}).`);
        } else {
          markScheduled(post.id, { status: "failed", error: JSON.stringify(result.data).slice(0, 500) });
          console.warn(`[Scheduler] Failed scheduled post ${post.id}:`, result.data?.error || result.data);
          fireWebhook("post.failed", { scheduledId: post.id, network: post.network, label: post.label, error: result.data?.error || result.data });
        }
      } catch (err: any) {
        markScheduled(post.id, { status: "failed", error: err.message || String(err) });
        fireWebhook("post.failed", { scheduledId: post.id, network: post.network, label: post.label, error: err.message || String(err) });
      }
    }
  } finally {
    schedulerRunning = false;
  }
}

const jobs: NodeJS.Timeout[] = [];

export function startScheduler(): void {
  // Check for due scheduled posts every 30s.
  jobs.push(setInterval(processScheduledPosts, 30_000));
  console.log("Scheduler activo: revisando publicaciones programadas cada 30s.");

  // Snapshot post metrics every 6h (first run shortly after boot).
  jobs.push(setTimeout(() => collectMetricsOnce().catch(() => {}), 90_000));
  jobs.push(setInterval(() => collectMetricsOnce().catch(() => {}), 6 * 60 * 60 * 1000));
  console.log("Metrics job activo: snapshot de métricas cada 6h.");

  // Weekly email report: hourly check, fires Mondays ~09:00 when enabled.
  jobs.push(setInterval(() => maybeSendWeeklyReport().catch(() => {}), 60 * 60 * 1000));
  console.log("Informe semanal activo: se envía los lunes a las 9:00 si está habilitado.");
}

export function stopScheduler(): void {
  for (const j of jobs) clearInterval(j);
  jobs.length = 0;
}
