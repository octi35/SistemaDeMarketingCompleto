// Shared implementation of "publish to every network" used by the internal
// route (/api/publish-all) and the external API (/api/ext/publish-all).
import { z } from "zod";
import { publishToAllNetworks, NetworkName } from "./publish";
import { addScheduled } from "../serverStore";
import { sealPayloadTokens } from "./secretStore";
import type { publishAllSchema } from "./validate";

export type PublishAllBody = z.infer<typeof publishAllSchema>;

export interface PublishAllResponse {
  status: number;
  body: any;
}

export async function runPublishAll(body: PublishAllBody): Promise<PublishAllResponse> {
  const { networks, caption, captions, imageUrls, videoUrl, publishAt, label } = body;

  if (!networks.instagram && !networks.facebook && !networks.linkedin) {
    return { status: 400, body: { error: "Incluye credenciales de al menos una red en 'networks'." } };
  }

  // ---- Scheduled mode: create one encrypted scheduled post per network ----
  if (publishAt) {
    if (Date.parse(publishAt) <= Date.now()) {
      return { status: 400, body: { error: "publishAt debe ser una fecha futura." } };
    }
    const images = (imageUrls || []).filter(Boolean);
    const scheduled: { network: NetworkName; id: string }[] = [];
    const skipped: { network: NetworkName; reason: string }[] = [];

    if (networks.instagram) {
      if (images.length === 0 && !videoUrl) {
        skipped.push({ network: "instagram", reason: "Instagram requiere al menos una imagen o un video." });
      } else {
        const post = addScheduled({
          network: "instagram",
          payload: sealPayloadTokens({
            igAccountId: networks.instagram.igAccountId,
            token: networks.instagram.token,
            imageUrls: images,
            videoUrl,
            firstComment: networks.instagram.firstComment,
            caption: captions?.instagram ?? caption,
          }),
          publishAt,
          label,
        });
        scheduled.push({ network: "instagram", id: post.id });
      }
    }
    if (networks.facebook) {
      const post = addScheduled({
        network: "facebook",
        payload: sealPayloadTokens({
          pageId: networks.facebook.pageId,
          token: networks.facebook.token,
          imageUrls: images,
          videoUrl,
          message: captions?.facebook ?? caption,
        }),
        publishAt,
        label,
      });
      scheduled.push({ network: "facebook", id: post.id });
    }
    if (networks.linkedin) {
      if (videoUrl) {
        skipped.push({ network: "linkedin", reason: "Video en LinkedIn aún no soportado." });
      } else {
        const post = addScheduled({
          network: "linkedin",
          payload: sealPayloadTokens({
            token: networks.linkedin.token,
            authorUrn: networks.linkedin.authorUrn,
            imageUrls: images,
            text: captions?.linkedin ?? caption,
          }),
          publishAt,
          label,
        });
        scheduled.push({ network: "linkedin", id: post.id });
      }
    }
    return { status: 200, body: { ok: scheduled.length > 0, mode: "scheduled", publishAt, scheduled, skipped } };
  }

  // ---- Immediate mode: publish to every network in parallel ----
  const outcome = await publishToAllNetworks({ caption, captions, imageUrls, videoUrl, targets: networks });
  return { status: outcome.ok ? 200 : 207, body: { mode: "published", ...outcome } };
}
