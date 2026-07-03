// Optional Supabase persistence: mirrors the local .data/store.json snapshot
// into Postgres so data survives redeploys/ephemeral disks, and prepares the
// ground for the multi-user phase. Uses plain fetch against the Supabase REST
// API (PostgREST) — no extra dependencies.
//
// Enable it with:
//   SUPABASE_URL="https://<ref>.supabase.co"
//   SUPABASE_SERVICE_KEY="<service_role key>"   (Dashboard → Settings → API)
// and run the SQL in supabase/migration.sql once. Without these vars the app
// keeps working exactly as before (local file only).

const SNAPSHOT_KEY = "snapshot";
const PUSH_DEBOUNCE_MS = 3000;

function cfg(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  if (!url || !key) return null;
  return { url, key };
}

export function isCloudConfigured(): boolean {
  return cfg() !== null;
}

function headers(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

/** Reads the latest store snapshot from Postgres (null if none/unconfigured). */
export async function loadCloudSnapshot(): Promise<any | null> {
  const c = cfg();
  if (!c) return null;
  const res = await fetch(`${c.url}/rest/v1/adteam_store?select=value&key=eq.${SNAPSHOT_KEY}`, {
    headers: headers(c.key),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Supabase read failed (${res.status}): ${await res.text().catch(() => "")}`);
  const rows = (await res.json()) as any[];
  return rows?.[0]?.value ?? null;
}

async function pushSnapshot(store: any): Promise<void> {
  const c = cfg();
  if (!c) return;
  const res = await fetch(`${c.url}/rest/v1/adteam_store`, {
    method: "POST",
    headers: { ...headers(c.key), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([{ key: SNAPSHOT_KEY, value: store, updated_at: new Date().toISOString() }]),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Supabase write failed (${res.status}): ${await res.text().catch(() => "")}`);
}

let pushTimer: NodeJS.Timeout | null = null;
let pendingStore: any = null;

/** Debounced background push — called on every local store write. */
export function queueCloudPush(store: any): void {
  if (!isCloudConfigured()) return;
  pendingStore = store;
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const snapshot = pendingStore;
    pendingStore = null;
    pushSnapshot(snapshot).catch((err) => console.warn("[cloudStore] Push a Supabase falló:", err?.message || err));
  }, PUSH_DEBOUNCE_MS);
}

/**
 * Boot-time sync: on a fresh container the cloud snapshot wins (restores your
 * data); if the cloud is empty, the current local store is uploaded as seed.
 */
export async function initCloudStore(deps: {
  readLocal: () => any;
  hasLocalData: () => boolean;
  replaceLocal: (store: any) => void;
}): Promise<void> {
  if (!isCloudConfigured()) return;
  try {
    const cloud = await loadCloudSnapshot();
    if (cloud) {
      deps.replaceLocal(cloud);
      console.log("[cloudStore] Datos restaurados desde Supabase (la nube es la fuente de verdad al arrancar).");
    } else if (deps.hasLocalData()) {
      await pushSnapshot(deps.readLocal());
      console.log("[cloudStore] Store local subido a Supabase como snapshot inicial.");
    } else {
      console.log("[cloudStore] Supabase conectado (sin datos previos).");
    }
  } catch (err: any) {
    console.warn("[cloudStore] No se pudo sincronizar con Supabase al arrancar:", err?.message || err);
  }
}
