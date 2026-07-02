import React, { useEffect, useState } from "react";
import {
  Send, CalendarClock, HeartHandshake, Rocket, PenLine, CalendarDays, ClipboardList,
  ArrowUpRight, RefreshCw, Instagram, Facebook, Linkedin,
} from "lucide-react";
import {
  StatCard, Card, SectionTitle, MiniCalendar, QuickAction, Progress, Badge, Button,
} from "./ui";
import { TeamSpotlight } from "./TeamSpotlight";
import { apiGet } from "../lib/api";

interface DashboardOverviewProps {
  onNavigate: (tabId: string) => void;
}

interface PublishedPost {
  id: string;
  network: "instagram" | "facebook" | "linkedin";
  postId: string;
  caption?: string;
  permalink?: string;
  createdAt: string;
}

interface ScheduledItem {
  id: string;
  network: "instagram" | "facebook" | "linkedin";
  publishAt: string;
  status: "pending" | "published" | "failed" | "canceled";
  label?: string;
  createdAt: string;
}

interface MetricsSummary {
  totalPosts: number;
  totalEngagement: number;
  totalLikes: number;
  totalComments: number;
  byNetwork: Record<string, { posts: number; engagement: number }>;
  latestPerPost: { postId: string; network: string; engagement: number; ts: string }[];
}

const NETWORK_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: "Instagram", icon: Instagram },
  facebook: { label: "Facebook", icon: Facebook },
  linkedin: { label: "LinkedIn", icon: Linkedin },
};

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [calendarDays, setCalendarDays] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Each source is optional — the dashboard renders whatever is available.
    const [postsRes, schedRes, metricsRes, calRes] = await Promise.allSettled([
      apiGet<{ posts: PublishedPost[] }>("/api/posts"),
      apiGet<{ scheduled: ScheduledItem[] }>("/api/scheduled"),
      apiGet<MetricsSummary>("/api/metrics/history"),
      apiGet<{ calendar: { items: any[] } | null }>("/api/calendar"),
    ]);
    if (postsRes.status === "fulfilled") setPosts(postsRes.value.posts || []);
    if (schedRes.status === "fulfilled") setScheduled(schedRes.value.scheduled || []);
    if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
    if (calRes.status === "fulfilled") setCalendarDays(calRes.value.calendar?.items?.length || 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Snapshot "now" once so date math stays stable across re-renders.
  const [now] = useState(() => new Date());
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = now.getDate();

  // Mark calendar days that have scheduled posts this month.
  const events: Record<number, "accent" | "yellow" | "sky" | "dark"> = {};
  for (const s of scheduled) {
    const d = new Date(s.publishAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      events[d.getDate()] = s.status === "pending" ? "accent" : s.status === "published" ? "sky" : "yellow";
    }
  }

  const pending = scheduled.filter((s) => s.status === "pending");
  const nowMs = now.getTime();
  const published30d = posts.filter((p) => nowMs - Date.parse(p.createdAt) < 30 * 24 * 3600 * 1000);
  const failed = scheduled.filter((s) => s.status === "failed").length;
  const publishedSched = scheduled.filter((s) => s.status === "published").length;
  const schedulerTotal = failed + publishedSched;
  const successRate = schedulerTotal > 0 ? Math.round((publishedSched / schedulerTotal) * 100) : null;

  const statusBreakdown = [
    { label: "Programados pendientes", value: pending.length, tone: "accent" as const },
    { label: "Publicados por el scheduler", value: publishedSched, tone: "sky" as const },
    { label: "Fallidos", value: failed, tone: "yellow" as const },
    { label: "Cancelados", value: scheduled.filter((s) => s.status === "canceled").length, tone: "dark" as const },
  ];
  const statusMax = Math.max(1, ...statusBreakdown.map((s) => s.value));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* ================= MAIN COLUMN ================= */}
      <div className="xl:col-span-2 flex flex-col gap-5">
        {/* KPI row — real data from the local store */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Posts publicados (30 días)"
            value={loading ? "…" : String(published30d.length)}
            delta={posts.length ? `${posts.length} en total` : undefined}
            icon={Send}
            tone="accent"
          />
          <StatCard
            label="Programados pendientes"
            value={loading ? "…" : String(pending.length)}
            delta={pending[0] ? new Date(pending[0].publishAt).toLocaleDateString() : undefined}
            icon={CalendarClock}
            tone="sky"
          />
          <StatCard
            label="Engagement total"
            value={loading ? "…" : String(metrics?.totalEngagement ?? 0)}
            delta={metrics?.totalPosts ? `${metrics.totalPosts} posts medidos` : undefined}
            icon={HeartHandshake}
            tone="yellow"
          />
          <StatCard
            label="Días planificados"
            value={loading ? "…" : String(calendarDays)}
            delta={successRate !== null ? `${successRate}% éxito scheduler` : undefined}
            trend={successRate !== null && successRate < 80 ? "down" : "up"}
            icon={Rocket}
            tone="dark"
          />
        </div>

        {/* Published posts history */}
        <Card>
          <SectionTitle
            title="Publicaciones recientes"
            subtitle="Lo que realmente se publicó en tus redes desde AdTeam"
            action={
              <Button variant="secondary" size="sm" iconRight={ArrowUpRight} onClick={() => onNavigate("social-publisher")}>
                Publicar
              </Button>
            }
          />
          {posts.length === 0 ? (
            <div className="mt-5 bg-sink rounded-input p-6 text-center">
              <p className="text-[13px] text-muted">
                Todavía no hay publicaciones registradas. Publica desde el{" "}
                <button className="text-accent font-medium hover:underline" onClick={() => onNavigate("social-publisher")}>
                  Gestor de Contenido
                </button>{" "}
                o programa contenido y aparecerá aquí con sus métricas.
              </p>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-line">
              {posts.slice(0, 6).map((p) => {
                const meta = NETWORK_META[p.network] || NETWORK_META.instagram;
                const Icon = meta.icon;
                const engagement = metrics?.latestPerPost.find((m) => m.postId === p.postId)?.engagement;
                return (
                  <div key={p.id} className="py-3 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-sink text-ink flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink truncate">{p.caption || "(sin texto)"}</p>
                      <p className="text-[11px] text-faint mt-0.5">
                        {meta.label} · {new Date(p.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {engagement !== undefined && <Badge tone="green">{engagement} interacciones</Badge>}
                    {p.permalink && (
                      <a
                        href={p.permalink}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Abrir publicación"
                        className="text-faint hover:text-ink transition"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Agenda + Scheduler status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <SectionTitle
              title="Agenda de contenido"
              icon={CalendarDays}
              action={<Badge tone="accent" dot>{pending.length} pendientes</Badge>}
            />
            <div className="mt-5">
              <MiniCalendar
                monthLabel={`${monthNames[month]} ${year}`}
                daysInMonth={daysInMonth}
                firstDayOffset={firstDayOffset}
                events={events}
                today={today}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle title="Auto-publicación" subtitle="Estado del contenido programado" />
            <div className="mt-3 mb-6">
              <span className="text-[28px] font-semibold tracking-tight text-ink">{scheduled.length}</span>
              <span className="text-[13px] text-muted ml-2">programaciones totales</span>
            </div>
            <div className="space-y-5">
              {statusBreakdown.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-muted">{s.label}</span>
                    <span className="text-[13px] font-semibold text-ink">{s.value}</span>
                  </div>
                  <Progress value={(s.value / statusMax) * 100} tone={s.tone} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="flex flex-col gap-5">
        <TeamSpotlight onNavigate={onNavigate} />

        {/* Engagement by network (real metrics) */}
        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle title="Rendimiento" subtitle="Engagement medido por red" />
            <button
              aria-label="Actualizar métricas"
              onClick={load}
              className="w-8 h-8 rounded-full bg-sink text-muted hover:bg-[#eaedf6] flex items-center justify-center transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl bg-canvas p-4">
              <div className="text-[22px] font-semibold text-ink">{metrics?.totalLikes ?? 0}</div>
              <div className="text-[12px] text-faint mt-1">Me gusta acumulados</div>
            </div>
            <div className="rounded-2xl bg-canvas p-4">
              <div className="text-[22px] font-semibold text-ink">{metrics?.totalComments ?? 0}</div>
              <div className="text-[12px] text-faint mt-1">Comentarios</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(metrics?.byNetwork || {}).map(([network, data]) => {
              const meta = NETWORK_META[network];
              return (
                <div key={network} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">{meta?.label || network}</span>
                  <span className="font-semibold text-ink">
                    {data.engagement} interacciones · {data.posts} posts
                  </span>
                </div>
              );
            })}
            {(!metrics || metrics.totalPosts === 0) && (
              <p className="text-[12px] text-faint">
                Aún no hay métricas: se recolectan automáticamente cada 6 h después de publicar en Instagram o Facebook.
              </p>
            )}
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <SectionTitle title="Acciones rápidas" />
          <div className="mt-3 space-y-1">
            <QuickAction label="Nueva campaña" description="Piloto automático de ads" icon={Rocket} tone="accent" onClick={() => onNavigate("autopilot")} />
            <QuickAction label="Generar copys" description="Redacción persuasiva AIDA/PAS" icon={PenLine} tone="yellow" onClick={() => onNavigate("strategist")} />
            <QuickAction label="Programar contenido" description="Calendario de 30 días" icon={CalendarDays} tone="sky" onClick={() => onNavigate("calendar")} />
            <QuickAction label="Ver pipeline" description="Tablero de control unificado" icon={ClipboardList} tone="dark" onClick={() => onNavigate("pipeline")} />
          </div>
        </Card>
      </div>
    </div>
  );
};
