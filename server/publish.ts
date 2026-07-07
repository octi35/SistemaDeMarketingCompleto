// Core social publishing functions, shared by the HTTP routes and the
// scheduler (which calls them directly instead of POSTing to itself).
import { savePost, setMetricsAuth } from "../serverStore";
import { storeSecret } from "./secretStore";
import { fireWebhook } from "./webhooks";

// Registers the published post and notifies webhook subscribers.
function recordPublished(network: "instagram" | "facebook" | "linkedin", postId: string, caption?: string): void {
  try {
    savePost({ network, postId, caption });
  } catch {
    /* non-fatal */
  }
  fireWebhook("post.published", { network, postId, caption });
}

// Remembers (encrypted) the last working credentials per network so the
// background metrics collector can query the Graph API on its own.
function rememberMetricsAuth(network: "instagram" | "facebook", accountId: string, token: string): void {
  try {
    setMetricsAuth({
      [network]: { tokenRef: storeSecret(token), [network === "instagram" ? "igUserId" : "pageId"]: accountId, updatedAt: new Date().toISOString() },
    } as any);
  } catch {
    /* non-fatal */
  }
}

const GRAPH = "https://graph.facebook.com/v18.0";

export interface PublishResult {
  ok: boolean;
  status: number;
  data: any;
  /** Network post id when the publish succeeded. */
  postId?: string;
}

async function graphJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return { raw: await res.text().catch(() => "") };
  }
}

// Posts a first comment on a just-published IG media (best-effort): the
// common "hashtags in the first comment" growth practice.
async function postFirstComment(mediaId: string, message: string, token: string): Promise<void> {
  try {
    await fetch(`${GRAPH}/${mediaId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: token }),
    });
  } catch (err) {
    console.warn("[publish] No se pudo publicar el primer comentario:", err);
  }
}

// ---- Instagram ----
export async function publishInstagramPost(args: {
  igAccountId: string;
  imageUrl: string;
  caption?: string;
  /** Posted as the first comment right after publishing (e.g. hashtags). */
  firstComment?: string;
  token: string;
}): Promise<PublishResult> {
  const { igAccountId, imageUrl, caption, token } = args;

  const containerRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, caption: caption || "", access_token: token }),
  });
  const containerData = await graphJson(containerRes);
  if (!containerRes.ok) {
    return { ok: false, status: containerRes.status, data: { step: "create_container", error: containerData } };
  }

  const publishRes = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
  });
  const publishData = await graphJson(publishRes);
  if (!publishRes.ok) {
    return { ok: false, status: publishRes.status, data: { step: "publish", error: publishData } };
  }

  recordPublished("instagram", publishData.id, caption);
  if (args.firstComment) await postFirstComment(publishData.id, args.firstComment, token);
  rememberMetricsAuth("instagram", igAccountId, token);
  return { ok: true, status: 200, data: { success: true, result: publishData }, postId: publishData.id };
}

export async function publishInstagramCarousel(args: {
  igAccountId: string;
  imageUrls: string[];
  caption?: string;
  /** Posted as the first comment right after publishing (e.g. hashtags). */
  firstComment?: string;
  token: string;
}): Promise<PublishResult> {
  const { igAccountId, imageUrls, caption, token } = args;
  const slice = imageUrls.slice(0, 10);

  const childIds: string[] = [];
  for (const url of slice) {
    const r = await fetch(`${GRAPH}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token }),
    });
    const d = await graphJson(r);
    if (!r.ok) return { ok: false, status: r.status, data: { step: "child_container", error: d } };
    childIds.push(d.id);
  }

  const carouselRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: caption || "",
      access_token: token,
    }),
  });
  const carouselData = await graphJson(carouselRes);
  if (!carouselRes.ok) {
    return { ok: false, status: carouselRes.status, data: { step: "carousel_container", error: carouselData } };
  }

  const publishRes = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: token }),
  });
  const publishData = await graphJson(publishRes);
  if (!publishRes.ok) {
    return { ok: false, status: publishRes.status, data: { step: "publish", error: publishData } };
  }

  recordPublished("instagram", publishData.id, caption);
  if (args.firstComment) await postFirstComment(publishData.id, args.firstComment, token);
  rememberMetricsAuth("instagram", igAccountId, token);
  return {
    ok: true,
    status: 200,
    data: { success: true, result: publishData, postId: publishData.id },
    postId: publishData.id,
  };
}

// ---- Instagram Reels (video) ----
// Reels need server-side processing: create the container, poll status_code
// until FINISHED, then publish. Typically ready in 15-60s.
export async function publishInstagramReel(args: {
  igAccountId: string;
  videoUrl: string;
  caption?: string;
  firstComment?: string;
  token: string;
}): Promise<PublishResult> {
  const { igAccountId, videoUrl, caption, token } = args;

  const containerRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption: caption || "",
      share_to_feed: true,
      access_token: token,
    }),
  });
  const containerData = await graphJson(containerRes);
  if (!containerRes.ok) {
    return { ok: false, status: containerRes.status, data: { step: "create_reel_container", error: containerData } };
  }

  // Poll processing status (max ~4 min).
  const deadline = Date.now() + 4 * 60 * 1000;
  let status = "IN_PROGRESS";
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await fetch(`${GRAPH}/${containerData.id}?fields=status_code&access_token=${token}`);
    const stData = await graphJson(st);
    status = stData.status_code || status;
    if (status === "FINISHED") break;
    if (status === "ERROR" || status === "EXPIRED") {
      return { ok: false, status: 502, data: { step: "processing", error: stData } };
    }
  }
  if (status !== "FINISHED") {
    return {
      ok: false,
      status: 504,
      data: { step: "processing", error: "El video sigue procesándose; Instagram tardó más de 4 minutos. Reintenta." },
    };
  }

  const publishRes = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerData.id, access_token: token }),
  });
  const publishData = await graphJson(publishRes);
  if (!publishRes.ok) {
    return { ok: false, status: publishRes.status, data: { step: "publish", error: publishData } };
  }

  recordPublished("instagram", publishData.id, caption);
  if (args.firstComment) await postFirstComment(publishData.id, args.firstComment, token);
  rememberMetricsAuth("instagram", igAccountId, token);
  return { ok: true, status: 200, data: { success: true, result: publishData }, postId: publishData.id };
}

// ---- Facebook Page video ----
export async function publishFacebookVideo(args: {
  pageId: string;
  videoUrl: string;
  description?: string;
  token: string;
}): Promise<PublishResult> {
  const { pageId, videoUrl, description, token } = args;
  const r = await fetch(`${GRAPH}/${pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_url: videoUrl, description: description || "", access_token: token }),
  });
  const result = await graphJson(r);
  if (!r.ok) return { ok: false, status: r.status, data: { step: "upload_video", error: result } };

  recordPublished("facebook", result.id || "", description);
  rememberMetricsAuth("facebook", pageId, token);
  return { ok: true, status: 200, data: { success: true, result }, postId: result.id };
}

// ---- Facebook Page ----
export async function publishFacebookPost(args: {
  pageId: string;
  message?: string;
  imageUrls?: string[];
  token: string;
}): Promise<PublishResult> {
  const { pageId, message, token } = args;
  const images: string[] = Array.isArray(args.imageUrls) ? args.imageUrls.filter(Boolean) : [];

  let result: any;

  if (images.length === 1) {
    const r = await fetch(`${GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: images[0], caption: message || "", access_token: token }),
    });
    result = await graphJson(r);
    if (!r.ok) return { ok: false, status: r.status, data: { error: result } };
  } else if (images.length > 1) {
    const mediaFbids: { media_fbid: string }[] = [];
    for (const url of images.slice(0, 10)) {
      const up = await fetch(`${GRAPH}/${pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, published: false, access_token: token }),
      });
      const upData = await graphJson(up);
      if (!up.ok) return { ok: false, status: up.status, data: { step: "upload_photo", error: upData } };
      mediaFbids.push({ media_fbid: upData.id });
    }
    const r = await fetch(`${GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message || "", attached_media: mediaFbids, access_token: token }),
    });
    result = await graphJson(r);
    if (!r.ok) return { ok: false, status: r.status, data: { step: "feed_with_media", error: result } };
  } else {
    const r = await fetch(`${GRAPH}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message || "", access_token: token }),
    });
    result = await graphJson(r);
    if (!r.ok) return { ok: false, status: r.status, data: { error: result } };
  }

  const postId = result.id || result.post_id || "";
  recordPublished("facebook", postId, message);
  rememberMetricsAuth("facebook", pageId, token);
  return { ok: true, status: 200, data: { success: true, result }, postId };
}

// ---- Multi-network orchestrator (one click -> Instagram + Facebook + LinkedIn) ----
export type NetworkName = "instagram" | "facebook" | "linkedin";

export interface MultiPublishTargets {
  instagram?: { igAccountId: string; token: string; firstComment?: string };
  facebook?: { pageId: string; token: string };
  linkedin?: { authorUrn?: string; token: string };
}

export interface NetworkOutcome {
  ok: boolean;
  postId?: string;
  /** Human-readable error when the publish failed. */
  error?: string;
  /** True when the network was not attempted (no credentials / no image for IG). */
  skipped?: boolean;
}

/**
 * Publishes the same content to every network with credentials, in parallel.
 * Each network fails independently: one bad token never blocks the others.
 * With videoUrl set, Instagram gets a Reel and Facebook a page video
 * (LinkedIn video isn't supported yet and is skipped).
 */
export async function publishToAllNetworks(args: {
  caption?: string;
  captions?: Partial<Record<NetworkName, string>>;
  imageUrls?: string[];
  videoUrl?: string;
  targets: MultiPublishTargets;
}): Promise<{ ok: boolean; results: Record<NetworkName, NetworkOutcome> }> {
  const images = (args.imageUrls || []).filter(Boolean);
  const videoUrl = args.videoUrl || "";
  const captionFor = (n: NetworkName) => args.captions?.[n] ?? args.caption ?? "";
  const { targets } = args;

  const toOutcome = (r: PublishResult): NetworkOutcome =>
    r.ok
      ? { ok: true, postId: r.postId }
      : { ok: false, error: JSON.stringify(r.data?.error ?? r.data ?? {}).slice(0, 500) };

  const run = async (fn: () => Promise<PublishResult>): Promise<NetworkOutcome> => {
    try {
      return toOutcome(await fn());
    } catch (err: any) {
      return { ok: false, error: err?.message || String(err) };
    }
  };

  const skip = (reason: string): Promise<NetworkOutcome> =>
    Promise.resolve({ ok: false, skipped: true, error: reason });

  const [instagram, facebook, linkedin] = await Promise.all([
    !targets.instagram
      ? skip("Sin credenciales de Instagram.")
      : videoUrl
        ? run(() =>
            publishInstagramReel({
              igAccountId: targets.instagram!.igAccountId,
              videoUrl,
              caption: captionFor("instagram"),
              firstComment: targets.instagram!.firstComment,
              token: targets.instagram!.token,
            })
          )
        : images.length === 0
          ? skip("Instagram requiere al menos una imagen o un video.")
          : run(() =>
              images.length >= 2
                ? publishInstagramCarousel({
                    igAccountId: targets.instagram!.igAccountId,
                    imageUrls: images,
                    caption: captionFor("instagram"),
                    firstComment: targets.instagram!.firstComment,
                    token: targets.instagram!.token,
                  })
                : publishInstagramPost({
                    igAccountId: targets.instagram!.igAccountId,
                    imageUrl: images[0],
                    caption: captionFor("instagram"),
                    firstComment: targets.instagram!.firstComment,
                    token: targets.instagram!.token,
                  })
            ),
    !targets.facebook
      ? skip("Sin credenciales de Facebook.")
      : run(() =>
          videoUrl
            ? publishFacebookVideo({
                pageId: targets.facebook!.pageId,
                videoUrl,
                description: captionFor("facebook"),
                token: targets.facebook!.token,
              })
            : publishFacebookPost({
                pageId: targets.facebook!.pageId,
                message: captionFor("facebook"),
                imageUrls: images,
                token: targets.facebook!.token,
              })
        ),
    !targets.linkedin
      ? skip("Sin credenciales de LinkedIn.")
      : videoUrl
        ? skip("Video en LinkedIn aún no soportado; publícalo manualmente allí.")
        : run(() =>
            publishLinkedInPost({
              text: captionFor("linkedin"),
              authorUrn: targets.linkedin!.authorUrn,
              imageUrls: images,
              token: targets.linkedin!.token,
            })
          ),
  ]);

  const results = { instagram, facebook, linkedin };
  const attempted = Object.values(results).filter((r) => !r.skipped);
  return { ok: attempted.length > 0 && attempted.every((r) => r.ok), results };
}

// ---- LinkedIn ----
export async function publishLinkedInPost(args: {
  text?: string;
  authorUrn?: string;
  imageUrls?: string[];
  token: string;
}): Promise<PublishResult> {
  const { text, token } = args;

  let urn = args.authorUrn;
  if (!urn) {
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (profileRes.ok) {
      const userinfo = (await profileRes.json()) as any;
      urn = `urn:li:person:${userinfo.sub}`;
    } else {
      const meRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = (await meRes.json()) as any;
      if (!meRes.ok) {
        return { ok: false, status: meRes.status, data: { error: "Unable to retrieve member URN", details: meData } };
      }
      urn = `urn:li:person:${meData.id}`;
    }
  }

  // Optional images: register asset -> upload bytes -> attach.
  const images: string[] = Array.isArray(args.imageUrls) ? args.imageUrls.filter(Boolean) : [];
  const mediaEntries: any[] = [];
  for (const url of images.slice(0, 9)) {
    const reg = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: urn,
          serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
        },
      }),
    });
    const regData = (await reg.json()) as any;
    if (!reg.ok) return { ok: false, status: reg.status, data: { step: "register_upload", error: regData } };
    const asset = regData.value?.asset;
    const uploadUrl =
      regData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    if (!asset || !uploadUrl) return { ok: false, status: 500, data: { step: "register_upload", error: regData } };

    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      return { ok: false, status: 502, data: { step: "fetch_image", error: `No se pudo leer la imagen ${url}` } };
    }
    const bytes = Buffer.from(await imgRes.arrayBuffer());
    const upRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: bytes,
    });
    if (!upRes.ok) {
      return { ok: false, status: upRes.status, data: { step: "upload_image", error: await upRes.text() } };
    }
    mediaEntries.push({ status: "READY", media: asset, title: { text: "AdTeam AI" } });
  }

  const shareContent: any = {
    shareCommentary: { text: text || "Publicación automática desde AdTeam AI Marketing Assistant" },
    shareMediaCategory: mediaEntries.length > 0 ? "IMAGE" : "NONE",
  };
  if (mediaEntries.length > 0) shareContent.media = mediaEntries;

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: urn,
      lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });

  const resData = (await response.json()) as any;
  if (!response.ok) {
    console.error("LinkedIn ugcPosts post failed:", resData);
    return { ok: false, status: response.status, data: { success: false, error: resData } };
  }
  recordPublished("linkedin", resData.id || "", text);
  return { ok: true, status: 200, data: { success: true, result: resData }, postId: resData.id };
}
