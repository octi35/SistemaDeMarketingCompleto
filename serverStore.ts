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

interface Store {
  projects: CarouselProject[];
  calendar?: CalendarPlan;
  posts?: PublishedPost[];
  scheduled?: ScheduledPost[];
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
