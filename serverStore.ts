// Lightweight file-based persistence so saved carousels survive restarts
// without requiring an external database. Data lives in ./.data/store.json
// (gitignored). For multi-user / production, swap this for Supabase/Postgres.
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

export interface CarouselProject {
  id: string;
  name: string;
  platform: string;
  topic?: string;
  slides: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarPlan {
  items: any[];
  meta?: any;
  updatedAt: string;
}

export interface PublishedPost {
  id: string;
  network: "instagram" | "facebook" | "linkedin";
  postId: string;
  caption?: string;
  permalink?: string;
  createdAt: string;
}

export interface ScheduledPost {
  id: string;
  network: "instagram" | "facebook" | "linkedin";
  payload: any; // body to POST to the network endpoint (includes token)
  publishAt: string; // ISO datetime
  status: "pending" | "published" | "failed" | "canceled";
  label?: string;
  error?: string;
  resultId?: string;
  createdAt: string;
}

export interface MetricSnapshot {
  postId: string;
  network: "instagram" | "facebook" | "linkedin";
  ts: string; // ISO timestamp of the snapshot
  likes: number;
  comments: number;
  engagement: number;
}

// Server-side credentials (secret refs, never plaintext) captured on publish
// so the background metrics job can query the Graph API on its own.
export interface MetricsAuth {
  instagram?: { tokenRef: string; igUserId: string; updatedAt: string };
  facebook?: { tokenRef: string; pageId: string; updatedAt: string };
}

export interface PipelineCard {
  id: string;
  title: string;
  desc?: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  [key: string]: any;
}

export interface BrandKit {
  businessName?: string;
  description?: string;
  audience?: string;
  tone?: string;
  website?: string;
  palette?: string;
  hashtags?: string;
  updatedAt?: string;
}

/** An AI-generated (or uploaded) brand image stored in /uploads. */
export interface BrandAsset {
  id: string;
  /** Filename inside the uploads dir; served as /uploads/<file>. */
  file: string;
  prompt?: string;
  concept?: string;
  tags?: string[];
  createdAt: string;
}

export interface Experiment {
  id: string;
  name: string;
  postIdA: string;
  postIdB: string;
  decideAfterDays: number;
  status: "running" | "decided";
  winner?: "A" | "B" | "tie";
  engagementA?: number;
  engagementB?: number;
  createdAt: string;
  decidedAt?: string;
}

export interface ReportConfig {
  enabled: boolean;
  to?: string;
  /** Encrypted secret refs — never plaintext. */
  smtp?: { host?: string; port?: string; user?: string; passRef?: string };
  lastSentAt?: string;
  updatedAt?: string;
}

interface Store {
  projects: CarouselProject[];
  calendar?: CalendarPlan;
  posts?: PublishedPost[];
  scheduled?: ScheduledPost[];
  metrics?: MetricSnapshot[];
  metricsAuth?: MetricsAuth;
  pipeline?: { cards: PipelineCard[]; updatedAt: string };
  brand?: BrandKit;
  assets?: BrandAsset[];
  experiments?: Experiment[];
  reportConfig?: ReportConfig;
}

function readStore(): Store {
  try {
    if (!fs.existsSync(STORE_FILE)) return { projects: [] };
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      calendar: parsed.calendar,
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : [],
      metrics: Array.isArray(parsed.metrics) ? parsed.metrics : [],
      metricsAuth: parsed.metricsAuth,
      pipeline: parsed.pipeline,
      brand: parsed.brand,
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      experiments: Array.isArray(parsed.experiments) ? parsed.experiments : [],
      reportConfig: parsed.reportConfig,
    };
  } catch (err) {
    console.error("[store] Failed to read store, starting empty:", err);
    return { projects: [] };
  }
}

function writeStore(store: Store): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error("[store] Failed to persist store:", err);
  }
}

// Returns lightweight metadata (without the heavy slide payloads).
export function listProjects() {
  return readStore()
    .projects.map((p) => ({
      id: p.id,
      name: p.name,
      platform: p.platform,
      topic: p.topic,
      slideCount: p.slides?.length || 0,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function getProject(id: string): CarouselProject | null {
  return readStore().projects.find((p) => p.id === id) || null;
}

export function saveProject(input: Partial<CarouselProject>): CarouselProject {
  const store = readStore();
  const now = new Date().toISOString();
  const existingIndex = input.id ? store.projects.findIndex((p) => p.id === input.id) : -1;

  if (existingIndex >= 0) {
    const updated: CarouselProject = {
      ...store.projects[existingIndex],
      name: input.name ?? store.projects[existingIndex].name,
      platform: input.platform ?? store.projects[existingIndex].platform,
      topic: input.topic ?? store.projects[existingIndex].topic,
      slides: input.slides ?? store.projects[existingIndex].slides,
      updatedAt: now,
    };
    store.projects[existingIndex] = updated;
    writeStore(store);
    return updated;
  }

  const created: CarouselProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: input.name || "Carrusel sin título",
    platform: input.platform || "Instagram",
    topic: input.topic,
    slides: input.slides || [],
    createdAt: now,
    updatedAt: now,
  };
  store.projects.unshift(created);
  writeStore(store);
  return created;
}

export function deleteProject(id: string): boolean {
  const store = readStore();
  const before = store.projects.length;
  store.projects = store.projects.filter((p) => p.id !== id);
  if (store.projects.length === before) return false;
  writeStore(store);
  return true;
}

// ---- Calendar plan (single current plan) ----
export function getCalendar(): CalendarPlan | null {
  return readStore().calendar || null;
}

export function saveCalendar(items: any[], meta?: any): CalendarPlan {
  const store = readStore();
  store.calendar = { items: items || [], meta, updatedAt: new Date().toISOString() };
  writeStore(store);
  return store.calendar;
}

// ---- Published posts (to link metrics to what we published) ----
export function listPosts(): PublishedPost[] {
  return (readStore().posts || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function savePost(input: Omit<PublishedPost, "id" | "createdAt"> & { createdAt?: string }): PublishedPost {
  const store = readStore();
  const post: PublishedPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    network: input.network,
    postId: input.postId,
    caption: input.caption,
    permalink: input.permalink,
    createdAt: input.createdAt || new Date().toISOString(),
  };
  store.posts = [post, ...(store.posts || [])].slice(0, 200);
  writeStore(store);
  return post;
}

// ---- Scheduled posts (auto-publishing) ----
// Returns scheduled posts WITHOUT exposing stored tokens.
export function listScheduled(): Omit<ScheduledPost, "payload">[] & any[] {
  return (readStore().scheduled || [])
    .map(({ payload, ...rest }) => ({ ...rest, network: rest.network, hasMedia: !!(payload?.imageUrls?.length || payload?.imageUrl) }))
    .sort((a, b) => (a.publishAt < b.publishAt ? -1 : 1));
}

export function addScheduled(input: { network: ScheduledPost["network"]; payload: any; publishAt: string; label?: string }): ScheduledPost {
  const store = readStore();
  const post: ScheduledPost = {
    id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    network: input.network,
    payload: input.payload,
    publishAt: input.publishAt,
    status: "pending",
    label: input.label,
    createdAt: new Date().toISOString(),
  };
  store.scheduled = [post, ...(store.scheduled || [])];
  writeStore(store);
  return post;
}

export function cancelScheduled(id: string): boolean {
  const store = readStore();
  const item = (store.scheduled || []).find((s) => s.id === id);
  if (!item || item.status !== "pending") return false;
  item.status = "canceled";
  writeStore(store);
  return true;
}

export function getDuePending(nowIso: string): ScheduledPost[] {
  return (readStore().scheduled || []).filter((s) => s.status === "pending" && s.publishAt <= nowIso);
}

export function markScheduled(id: string, patch: Partial<ScheduledPost>): void {
  const store = readStore();
  const item = (store.scheduled || []).find((s) => s.id === id);
  if (!item) return;
  Object.assign(item, patch);
  writeStore(store);
}

// ---- Metric snapshots (time series per published post) ----
const METRICS_CAP = 5000;
const SNAPSHOT_MIN_INTERVAL_MS = 3 * 60 * 60 * 1000; // skip re-snapshot within 3h

export function saveMetricSnapshots(snaps: MetricSnapshot[]): number {
  if (!snaps.length) return 0;
  const store = readStore();
  const existing = store.metrics || [];
  const now = Date.now();
  const fresh = snaps.filter((s) => {
    const last = existing
      .filter((e) => e.postId === s.postId)
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))[0];
    return !last || now - Date.parse(last.ts) >= SNAPSHOT_MIN_INTERVAL_MS;
  });
  if (!fresh.length) return 0;
  store.metrics = [...existing, ...fresh].slice(-METRICS_CAP);
  writeStore(store);
  return fresh.length;
}

export function listMetrics(): MetricSnapshot[] {
  return readStore().metrics || [];
}

// ---- Metrics auth (secret refs captured on publish) ----
export function setMetricsAuth(patch: Partial<MetricsAuth>): void {
  const store = readStore();
  store.metricsAuth = { ...(store.metricsAuth || {}), ...patch };
  writeStore(store);
}

export function getMetricsAuth(): MetricsAuth {
  return readStore().metricsAuth || {};
}

// ---- Brand kit (injected into every AI prompt) ----
export function getBrand(): BrandKit | null {
  return readStore().brand || null;
}

export function saveBrand(patch: BrandKit): BrandKit {
  const store = readStore();
  store.brand = { ...(store.brand || {}), ...patch, updatedAt: new Date().toISOString() };
  writeStore(store);
  return store.brand;
}

// ---- Brand assets (AI-generated image library) ----
export function listAssets(): BrandAsset[] {
  return (readStore().assets || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addAsset(input: Omit<BrandAsset, "id" | "createdAt">): BrandAsset {
  const store = readStore();
  const asset: BrandAsset = {
    id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    file: input.file,
    prompt: input.prompt,
    concept: input.concept,
    tags: input.tags,
    createdAt: new Date().toISOString(),
  };
  store.assets = [asset, ...(store.assets || [])].slice(0, 1000);
  writeStore(store);
  return asset;
}

export function deleteAsset(id: string): BrandAsset | null {
  const store = readStore();
  const asset = (store.assets || []).find((a) => a.id === id) || null;
  if (!asset) return null;
  store.assets = (store.assets || []).filter((a) => a.id !== id);
  writeStore(store);
  return asset;
}

// ---- A/B experiments ----
export function listExperiments(): Experiment[] {
  return (readStore().experiments || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addExperiment(input: {
  name: string;
  postIdA: string;
  postIdB: string;
  decideAfterDays?: number;
}): Experiment {
  const store = readStore();
  const exp: Experiment = {
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    postIdA: input.postIdA,
    postIdB: input.postIdB,
    decideAfterDays: input.decideAfterDays ?? 3,
    status: "running",
    createdAt: new Date().toISOString(),
  };
  store.experiments = [exp, ...(store.experiments || [])];
  writeStore(store);
  return exp;
}

export function updateExperiment(id: string, patch: Partial<Experiment>): void {
  const store = readStore();
  const exp = (store.experiments || []).find((e) => e.id === id);
  if (!exp) return;
  Object.assign(exp, patch);
  writeStore(store);
}

// ---- Weekly report configuration ----
export function getReportConfig(): ReportConfig | null {
  return readStore().reportConfig || null;
}

export function saveReportConfig(patch: Partial<ReportConfig>): ReportConfig {
  const store = readStore();
  store.reportConfig = {
    enabled: false,
    ...(store.reportConfig || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return store.reportConfig;
}

// ---- Pipeline board persistence ----
export function getPipeline(): { cards: PipelineCard[]; updatedAt: string } | null {
  return readStore().pipeline || null;
}

export function savePipeline(cards: PipelineCard[]): { cards: PipelineCard[]; updatedAt: string } {
  const store = readStore();
  store.pipeline = { cards: cards || [], updatedAt: new Date().toISOString() };
  writeStore(store);
  return store.pipeline;
}
