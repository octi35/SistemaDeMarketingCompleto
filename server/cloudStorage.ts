// Optional Supabase Storage backend for uploaded/generated images. When
// configured, images get a stable public URL served by Supabase's CDN —
// required for reliable Instagram publishing on hosts with ephemeral disks.
// Falls back to the local /uploads folder when unconfigured.
import { saveDataUrlImage } from "../imageStore";
import { isCloudConfigured } from "./cloudStore";

const BUCKET = "adteam-uploads";

function cfg(): { url: string; key: string } {
  return { url: (process.env.SUPABASE_URL || "").replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_KEY || "" };
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Formato de imagen inválido (se espera un data URL base64).");
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

/**
 * Persists a data-URL image and returns { file, url }:
 * - Supabase configured → uploads to the public bucket (CDN URL).
 * - Otherwise → local .data/uploads file served from /uploads.
 */
export async function storeImagePublic(
  dataUrl: string,
  localBaseUrl: string
): Promise<{ file: string; url: string }> {
  if (!isCloudConfigured()) {
    const file = saveDataUrlImage(dataUrl);
    return { file, url: `${localBaseUrl}/uploads/${file}` };
  }

  const { url, key } = cfg();
  const { mimeType, buffer } = parseDataUrl(dataUrl);
  const ext = (mimeType.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
  const file = `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${file}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": mimeType },
    body: buffer,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new Error(`Supabase Storage upload failed (${res.status}): ${await res.text().catch(() => "")}`);
  }
  return { file, url: `${url}/storage/v1/object/public/${BUCKET}/${file}` };
}

/** Best-effort delete of a cloud-stored image (no-op when unconfigured). */
export async function deleteCloudImage(file: string): Promise<void> {
  if (!isCloudConfigured()) return;
  const { url, key } = cfg();
  await fetch(`${url}/storage/v1/object/${BUCKET}/${file}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}
