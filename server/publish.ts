// Core social publishing functions, shared by the HTTP routes and the
// scheduler (which calls them directly instead of POSTing to itself).
import { savePost, setMetricsAuth } from "../serverStore";
import { storeSecret } from "./secretStore";

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

// ---- Instagram ----
export async function publishInstagramPost(args: {
  igAccountId: string;
  imageUrl: string;
  caption?: string;
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

  try {
    savePost({ network: "instagram", postId: publishData.id, caption });
  } catch {
    /* non-fatal */
  }
  rememberMetricsAuth("instagram", igAccountId, token);
  return { ok: true, status: 200, data: { success: true, result: publishData }, postId: publishData.id };
}

export async function publishInstagramCarousel(args: {
  igAccountId: string;
  imageUrls: string[];
  caption?: string;
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

  try {
    savePost({ network: "instagram", postId: publishData.id, caption });
  } catch {
    /* non-fatal */
  }
  rememberMetricsAuth("instagram", igAccountId, token);
  return {
    ok: true,
    status: 200,
    data: { success: true, result: publishData, postId: publishData.id },
    postId: publishData.id,
  };
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
  try {
    savePost({ network: "facebook", postId, caption: message });
  } catch {
    /* non-fatal */
  }
  rememberMetricsAuth("facebook", pageId, token);
  return { ok: true, status: 200, data: { success: true, result }, postId };
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
  try {
    savePost({ network: "linkedin", postId: resData.id || "", caption: text });
  } catch {
    /* non-fatal */
  }
  return { ok: true, status: 200, data: { success: true, result: resData }, postId: resData.id };
}
