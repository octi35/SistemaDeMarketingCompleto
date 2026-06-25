// Self-hosted public image storage. Carousel slides are rendered in the browser
// to PNG, uploaded here, written to disk and served from /uploads/<name> so that
// external APIs (e.g. the Instagram Graph API, which requires a PUBLIC image_url)
// can fetch them. In production the server must be reachable over HTTPS.
import fs from "fs";
import path from "path";

export const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

export function ensureUploadsDir(): string {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

// Persists a data URL (data:image/png;base64,...) to disk and returns the filename.
export function saveDataUrlImage(dataUrl: string): string {
  ensureUploadsDir();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Formato de imagen inválido (se espera un data URL base64).");
  const ext = (match[1].split("/")[1] || "png").replace(/[^a-z0-9]/gi, "") || "png";
  const buffer = Buffer.from(match[2], "base64");
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), buffer);
  return name;
}
