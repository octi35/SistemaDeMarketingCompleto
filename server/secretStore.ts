// Encrypted at-rest storage for OAuth/page tokens so scheduled posts never
// persist credentials in plain text inside .data/store.json.
//
// Secrets are AES-256-GCM encrypted with a key derived from APP_SECRET (env).
// If APP_SECRET is not set, a random key is generated once and kept in
// .data/secret.key (gitignored) so tokens survive restarts on a single host.
import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const KEY_FILE = path.join(DATA_DIR, "secret.key");
const SECRETS_FILE = path.join(DATA_DIR, "secrets.json");

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const appSecret = process.env.APP_SECRET;
  if (appSecret && appSecret.trim().length >= 8) {
    cachedKey = crypto.createHash("sha256").update(appSecret.trim()).digest();
    return cachedKey;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(KEY_FILE)) {
    cachedKey = Buffer.from(fs.readFileSync(KEY_FILE, "utf-8").trim(), "hex");
  } else {
    cachedKey = crypto.randomBytes(32);
    fs.writeFileSync(KEY_FILE, cachedKey.toString("hex"));
  }
  return cachedKey;
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${enc.toString("hex")}`;
}

function decrypt(blob: string): string | null {
  try {
    const [ivHex, tagHex, dataHex] = blob.split(".");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf-8");
  } catch {
    return null;
  }
}

interface SecretsFile {
  [ref: string]: { blob: string; createdAt: string };
}

function readSecrets(): SecretsFile {
  try {
    if (!fs.existsSync(SECRETS_FILE)) return {};
    return JSON.parse(fs.readFileSync(SECRETS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeSecrets(all: SecretsFile): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(all, null, 2));
}

export function isSecretRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("secret_");
}

/** Stores a secret and returns an opaque reference (idempotent per value). */
export function storeSecret(value: string): string {
  const all = readSecrets();
  const blobById = new Map(Object.entries(all));
  // Reuse an existing ref if this exact value is already stored.
  for (const [ref, entry] of blobById) {
    const existing = decrypt(entry.blob);
    if (existing === value) return ref;
  }
  const ref = `secret_${crypto.randomBytes(12).toString("hex")}`;
  all[ref] = { blob: encrypt(value), createdAt: new Date().toISOString() };
  writeSecrets(all);
  return ref;
}

/** Resolves a reference back to the secret; returns the input if not a ref. */
export function resolveSecret(refOrValue: string | undefined | null): string | undefined {
  if (!refOrValue) return undefined;
  if (!isSecretRef(refOrValue)) return refOrValue;
  const entry = readSecrets()[refOrValue];
  if (!entry) return undefined;
  return decrypt(entry.blob) ?? undefined;
}

export function deleteSecret(ref: string): void {
  const all = readSecrets();
  if (all[ref]) {
    delete all[ref];
    writeSecrets(all);
  }
}

const TOKEN_FIELDS = ["token", "pageToken", "accessToken", "access_token", "pass"] as const;

/** Replaces token-ish fields of a payload with encrypted secret refs. */
export function sealPayloadTokens<T extends Record<string, any>>(payload: T): T {
  const out: Record<string, any> = { ...payload };
  for (const field of TOKEN_FIELDS) {
    const v = out[field];
    if (typeof v === "string" && v.length > 0 && !isSecretRef(v)) {
      out[field] = storeSecret(v);
    }
  }
  return out as T;
}

/** Resolves any secret refs of a payload back to their plain values. */
export function unsealPayloadTokens<T extends Record<string, any>>(payload: T): T {
  const out: Record<string, any> = { ...payload };
  for (const field of TOKEN_FIELDS) {
    if (isSecretRef(out[field])) {
      out[field] = resolveSecret(out[field]);
    }
  }
  return out as T;
}
