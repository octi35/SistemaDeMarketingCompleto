import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend,
} from "recharts";
import { TrendingUp, Skull, RotateCcw, Mail, RefreshCw, FlaskConical, Trophy } from "lucide-react";
import { RealMetricsPanel } from "./RealMetricsPanel";
import { Card, SectionTitle, Badge, Button, Select } from "./ui";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "../lib/toast";

interface MetricSnapshot {
  postId: string;
  network: "instagram" | "facebook" | "linkedin";
  ts: string;
  likes: number;
  comments: number;
  engagement: number;
}

interface MetricsSummary {
  totalPosts: number;
  totalEngagement: number;
  totalLikes: number;
  totalComments: number;
  byNetwork: Record<string, { posts: number; engagement: number }>;
  latestPerPost: MetricSnapshot[];
  series: MetricSnapshot[];
}

interface PublishedPost {
  id: string;
  network: "instagram" | "facebook" | "linkedin";
  postId: string;
  caption?: string;
  permalink?: string;
  createdAt: string;
}

const NETWORK_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

interface Experiment {
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
}

// Sample series shown (clearly labeled) until real snapshots exist.
const DEMO_SERIES = [
  { name: "Día 01", Instagram: 12, Facebook: 8, LinkedIn: 5 },
  { name: "Día 05", Instagram: 18, Facebook: 11, LinkedIn: 7 },
  { name: "Día 10", Instagram: 25, Facebook: 13, LinkedIn: 9 },
  { name: "Día 15", Instagram: 31, Facebook: 18, LinkedIn: 12 },
  { name: "Día 20", Instagram: 38, Facebook: 22, LinkedIn: 15 },
  { name: "Día 25", Instagram: 47, Facebook: 25, LinkedIn: 17 },
  { name: "Día 30", Instagram: 55, Facebook: 31, LinkedIn: 21 },
];

export const RealTimeAnalytics: React.FC = () => {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [posts, setPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Predictive ROI planner state (an honest calculator, no fake data)
  const [budget, setBudget] = useState(1500);
  const [cpc, setCpc] = useState(0.4);
  const [ctr, setCtr] = useState(5.4);
  const [convRate, setConvRate] = useState(2.5);
  const [aov, setAov] = useState(45);

  // A/B experiments
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [expName, setExpName] = useState("");
  const [expPostA, setExpPostA] = useState("");
  const [expPostB, setExpPostB] = useState("");
  const [creatingExp, setCreatingExp] = useState(false);

  const load = async () => {
    setLoading(true);
    const [metricsRes, postsRes, expRes] = await Promise.allSettled([
      apiGet<MetricsSummary>("/api/metrics/history"),
      apiGet<{ posts: PublishedPost[] }>("/api/posts"),
      apiGet<{ experiments: Experiment[] }>("/api/experiments"),
    ]);
    if (metricsRes.status === "fulfilled") setSummary(metricsRes.value);
    if (postsRes.status === "fulfilled") setPosts(postsRes.value.posts || []);
    if (expRes.status === "fulfilled") setExperiments(expRes.value.experiments || []);
    setLoading(false);
  };

  const createExperiment = async () => {
    if (!expPostA || !expPostB) {
      toast.error("Elige las dos publicaciones a comparar.");
      return;
    }
    setCreatingExp(true);
    try {
      await apiPost("/api/experiments", {
        name: expName || `A/B ${new Date().toLocaleDateString()}`,
        postIdA: expPostA,
        postIdB: expPostB,
        decideAfterDays: 3,
      });
      toast.success("Experimento creado: en 3 días el sistema declarará el ganador según engagement real.");
      setExpName("");
      setExpPostA("");
      setExpPostB("");
      await load();
    } catch (err: any) {
      toast.error(err.message || "No se pudo crear el experimento.");
    } finally {
      setCreatingExp(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const hasRealData = (summary?.totalPosts ?? 0) > 0;

  // Build a daily engagement series per network from the snapshots.
  const realSeries = useMemo(() => {
    if (!summary?.series?.length) return [];
    const byDay = new Map<string, Record<string, number>>();
    for (const s of summary.series) {
      const day = s.ts.slice(0, 10);
      const row = byDay.get(day) || {};
      const label = NETWORK_LABEL[s.network] || s.network;
      row[label] = (row[label] || 0) + s.engagement;
      byDay.set(day, row);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, row]) => ({ name: day.slice(5), ...row }));
  }, [summary]);

  const chartData = hasRealData && realSeries.length > 0 ? realSeries : DEMO_SERIES;

  // Engagement by network for the bar chart.
  const networkBars = useMemo(() => {
    const src = summary?.byNetwork || {};
    return Object.entries(src).map(([network, data]) => ({
      network: NETWORK_LABEL[network] || network,
      engagement: data.engagement,
      posts: data.posts,
    }));
  }, [summary]);

  // Hook Vault from real posts + their latest metrics: above-median engagement
  // → repeat, below → kill.
  const hookVault = useMemo(() => {
    if (!summary || !posts.length) return [];
    const withMetrics = posts
      .map((p) => {
        const m = summary.latestPerPost.find((s) => s.postId === p.postId);
        return m ? { post: p, engagement: m.engagement, likes: m.likes, comments: m.comments } : null;
      })
      .filter(Boolean) as { post: PublishedPost; engagement: number; likes: number; comments: number }[];
    if (!withMetrics.length) return [];
    const sorted = [...withMetrics].sort((a, b) => b.engagement - a.engagement);
    const median = sorted[Math.floor(sorted.length / 2)].engagement;
    return sorted.map((m) => ({
      id: m.post.id,
      hook: (m.post.caption || "(sin texto)").slice(0, 120),
      platform: NETWORK_LABEL[m.post.network] || m.post.network,
      engagement: m.engagement,
      likes: m.likes,
      comments: m.comments,
      status: m.engagement >= Math.max(median, 1) ? "REPETIR" : "MATAR",
      reason:
        m.engagement >= Math.max(median, 1)
          ? `Engagement por encima de la mediana (${median}). Repite este ángulo o escálalo a más formatos.`
          : `Engagement por debajo de la mediana (${median}). Cambia el gancho o pausa este ángulo.`,
    }));
  }, [summary, posts]);

  const filteredHooks = hookVault.filter(
    (h) => platformFilter === "all" || h.platform.toLowerCase().includes(platformFilter.toLowerCase())
  );

  // ROI planner math
  const estimatedClicks = budget / cpc;
  const estimatedSales = estimatedClicks * (convRate / 100);
  const revenue = estimatedSales * aov;
  const roas = budget > 0 ? revenue / budget : 0;
  const cac = estimatedSales > 0 ? budget / estimatedSales : 0;

  let roasAdvice = "";
  if (roas < 1.0) {
    roasAdvice = "⚠️ Margen negativo detectado. La tasa de conversión o el valor de ticket es muy bajo para el costo por clic actual. Lauti necesita redactar copies agresivos de venta directa y Facu debe auditar la velocidad de carga de la web.";
  } else if (roas < 2.0) {
    roasAdvice = "⚡ ROAS de subsistencia. Estás cubriendo inversión publicitaria pero tus márgenes netos están ajustados. Santi sugiere probar nuevos ángulos creativos (pruébalos en Meta Ads 50x) para elevar el CTR y reducir el CPC real.";
  } else if (roas < 3.5) {
    roasAdvice = "🔥 ¡Negocio Saludable! Retorno robusto. Cami y Lauti tienen una base de copys validada. Santi aconseja automatizar la captación vía DMs para maximizar cada centavo de tráfico invertido.";
  } else {
    roasAdvice = "💎 ¡Fórmula de Escalamiento Dorado! El Retorno sobre Gasto Publicitario es altísimo. Santi aconseja duplicar el presupuesto diario de inmediato y expandir tus campañas a audiencias Lookalike para dominar el mercado.";
  }

  const collectNow = async () => {
    setCollecting(true);
    try {
      const r = await apiPost<{ collected: number; postsChecked: number; hasInstagramAuth: boolean; hasFacebookAuth: boolean }>(
        "/api/metrics/collect",
        {}
      );
      if (!r.hasInstagramAuth && !r.hasFacebookAuth) {
        toast.info("Aún no hay credenciales guardadas: publica algo en Instagram o Facebook primero y el sistema las recordará.");
      } else {
        toast.success(`Métricas actualizadas: ${r.collected} snapshots nuevos de ${r.postsChecked} posts.`);
      }
      await load();
    } catch (err: any) {
      toast.error(err.message || "No se pudieron recolectar métricas.");
    } finally {
      setCollecting(false);
    }
  };

  const handleSendEmailReport = async () => {
    setSendingEmail(true);
    try {
      const lines = [
        `Informe AdTeam AI — ${new Date().toLocaleDateString()}`,
        ``,
        `Posts publicados: ${posts.length}`,
        `Posts con métricas: ${summary?.totalPosts ?? 0}`,
        `Engagement total: ${summary?.totalEngagement ?? 0} (${summary?.totalLikes ?? 0} me gusta, ${summary?.totalComments ?? 0} comentarios)`,
        ``,
        ...Object.entries(summary?.byNetwork || {}).map(
          ([n, d]) => `- ${NETWORK_LABEL[n] || n}: ${d.engagement} interacciones en ${d.posts} posts`
        ),
      ];
      const smtp = {
        host: localStorage.getItem("smtp_host") || undefined,
        port: localStorage.getItem("smtp_port") || undefined,
        user: localStorage.getItem("smtp_user") || undefined,
        pass: localStorage.getItem("smtp_pass") || undefined,
      };
      const r = await apiPost<{ success: boolean; simulated?: boolean; error?: string }>("/api/mail/send", {
        ...smtp,
        subject: "Informe de métricas — AdTeam AI",
        text: lines.join("\n"),
      });
      if (r.success) {
        toast.success("Informe enviado por email.");
      } else if (r.simulated) {
        toast.info("Configura SMTP en Integración Nube para enviar informes reales por email.");
      } else {
        toast.error(r.error || "No se pudo enviar el informe.");
      }
    } catch (err: any) {
      toast.error(err.message || "No se pudo enviar el informe.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-5" id="realtime-analytics-root">
      {/* Real Instagram metrics + AI recommendations (live when connected) */}
      <RealMetricsPanel />

      {/* KPI summary — real local metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Engagement total medido", value: summary?.totalEngagement ?? 0, hint: `${summary?.totalPosts ?? 0} posts con métricas` },
          { label: "Me gusta acumulados", value: summary?.totalLikes ?? 0, hint: "Última medición por post" },
          { label: "Comentarios acumulados", value: summary?.totalComments ?? 0, hint: "Última medición por post" },
          { label: "Snapshots del histórico", value: summary?.series?.length ?? 0, hint: "Se recolectan cada 6 h" },
        ].map((kpi) => (
          <Card key={kpi.label} padded={false} className="p-4">
            <span className="text-[10px] text-faint font-mono uppercase tracking-wider block">{kpi.label}</span>
            <span className="text-2xl font-bold text-ink mt-1 block">{loading ? "…" : kpi.value}</span>
            <span className="text-[10px] text-faint mt-0.5 block">{kpi.hint}</span>
          </Card>
        ))}
      </div>

      {/* ROI planner (honest calculator) */}
      <Card id="predictive-roas-calculator">
        <SectionTitle
          title="Simulador Financiero: ROAS & Presupuesto Predictivo"
          subtitle="Calcula el retorno de tu inversión publicitaria estimando el impacto financiero de tus creativos."
          action={<Badge tone="dark">Planificación</Badge>}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
          {/* Sliders panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Inversión Publicitaria Mensual", value: `$${budget.toLocaleString()} USD`, min: 100, max: 10000, step: 100, state: budget, set: setBudget },
                { label: "CPC Promedio Estimado", value: `$${cpc.toFixed(2)} USD`, min: 0.1, max: 5, step: 0.05, state: cpc, set: setCpc },
                { label: "CTR de Creativos", value: `${ctr.toFixed(2)}%`, min: 0.5, max: 12, step: 0.1, state: ctr, set: setCtr },
                { label: "Tasa de Conversión Web", value: `${convRate.toFixed(2)}%`, min: 0.1, max: 10, step: 0.1, state: convRate, set: setConvRate },
              ].map((s) => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">{s.label}:</span>
                    <span className="text-black font-mono font-bold">{s.value}</span>
                  </div>
                  <input
                    type="range"
                    aria-label={s.label}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.state}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="w-full accent-[#4f6ef7]"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Valor Promedio del Ticket (AOV):</span>
                <span className="text-black font-mono font-bold">${aov.toLocaleString()} USD</span>
              </div>
              <input
                type="range"
                aria-label="Valor promedio del ticket"
                min={5}
                max={500}
                step={5}
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="w-full accent-[#4f6ef7]"
              />
            </div>
          </div>

          {/* Results breakdown panel */}
          <div className="lg:col-span-5 bg-sink rounded-input p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-line">
                <span className="text-muted">Tráfico Estimado (Clics):</span>
                <span className="font-mono text-ink font-bold">{Math.floor(estimatedClicks).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-line">
                <span className="text-muted">Ventas Totales:</span>
                <span className="font-mono text-ink font-bold">{Math.floor(estimatedSales).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-line">
                <span className="text-muted">Costo Adquisición (CAC):</span>
                <span className="font-mono text-ink font-bold">${cac.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-muted">Facturación Estimada:</span>
                <span className="font-mono text-black font-bold text-lg">${Math.floor(revenue).toLocaleString()} USD</span>
              </div>
            </div>

            <div className="bg-surface p-3 rounded-input space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-faint uppercase font-mono tracking-wider">RETORNO ESTIMADO (ROAS):</span>
                <span
                  className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                    roas >= 3.0 ? "bg-[#e6f7e6] text-[#3f9a3f]" : roas >= 1.5 ? "bg-[#fff6d6] text-[#a8791b]" : "bg-[#fdeaea] text-[#d5514f]"
                  }`}
                >
                  {roas.toFixed(2)}x
                </span>
              </div>
              <div className="text-[11px] leading-relaxed text-muted">
                <strong className="text-ink">Consejo de Santi:</strong> {roasAdvice}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Chart 1: Engagement over time */}
        <Card className="lg:col-span-8">
          <SectionTitle
            icon={TrendingUp}
            title="Engagement por red a lo largo del tiempo"
            subtitle={
              hasRealData && realSeries.length > 0
                ? "Serie construida con los snapshots reales del histórico de métricas."
                : "Datos de ejemplo — publica en tus redes y el histórico real reemplazará esta gráfica."
            }
            action={
              <div className="flex items-center gap-2">
                {!(hasRealData && realSeries.length > 0) && <Badge tone="yellow">Ejemplo</Badge>}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={collectNow}
                  disabled={collecting}
                >
                  {collecting ? "Midiendo..." : "Medir ahora"}
                </Button>
                <Button variant="secondary" size="sm" icon={Mail} onClick={handleSendEmailReport} disabled={sendingEmail} id="btn-analytics-email-report">
                  {sendingEmail ? "Enviando..." : "Enviar informe"}
                </Button>
              </div>
            }
          />

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8fd4f8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8fd4f8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#101010" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#101010" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" />
                <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: 10, fontFamily: "monospace" }} />
                <Tooltip contentStyle={{ backgroundColor: "#F3F5FB", borderColor: "#ECECEC", borderRadius: 8, color: "#111111" }} />
                <Legend />
                <Area type="monotone" dataKey="Instagram" stroke="#4f6ef7" fillOpacity={1} fill="url(#colorIG)" strokeWidth={2} />
                <Area type="monotone" dataKey="Facebook" stroke="#8fd4f8" fillOpacity={1} fill="url(#colorFB)" strokeWidth={2} />
                <Area type="monotone" dataKey="LinkedIn" stroke="#101010" fillOpacity={1} fill="url(#colorLI)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Engagement by network */}
        <Card className="lg:col-span-4">
          <SectionTitle
            title="Engagement por red"
            subtitle="Total de interacciones medidas en cada plataforma."
            action={!networkBars.length ? <Badge tone="yellow">Sin datos</Badge> : undefined}
          />
          {networkBars.length > 0 ? (
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={networkBars} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" />
                  <XAxis type="number" stroke="#9CA3AF" hide />
                  <YAxis dataKey="network" type="category" stroke="#9CA3AF" style={{ fontSize: 10, fontWeight: "500" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#F3F5FB", borderColor: "#ECECEC", color: "#111111" }} />
                  <Bar dataKey="engagement" radius={[0, 6, 6, 0]} fill="#4f6ef7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 bg-sink rounded-input p-5 text-center">
              <p className="text-[12px] text-muted leading-relaxed">
                Cuando publiques en Instagram o Facebook, el sistema medirá automáticamente likes y comentarios de cada
                post y verás aquí la comparativa real entre redes.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Hook Vault: repeat/kill from real metrics */}
      <Card>
        <SectionTitle
          title="🔒 Hook Vault: repetir o matar"
          subtitle={
            hookVault.length
              ? "Basado en el engagement real medido de tus publicaciones: repite lo ganador, pausa lo perdedor."
              : "Cuando existan métricas reales, cada publicación se clasificará automáticamente en repetir o matar."
          }
          action={
            <Select
              aria-label="Filtrar por plataforma"
              value={platformFilter}
              onChange={setPlatformFilter}
              options={[
                { value: "all", label: "Todas las plataformas" },
                { value: "instagram", label: "Instagram" },
                { value: "facebook", label: "Facebook" },
                { value: "linkedin", label: "LinkedIn" },
              ]}
              className="w-52"
            />
          }
        />

        {filteredHooks.length === 0 ? (
          <div className="mt-4 bg-sink rounded-input p-6 text-center">
            <p className="text-[13px] text-muted">
              Sin datos suficientes todavía. Publica contenido y pulsa <strong>Medir ahora</strong> en la gráfica para
              alimentar el vault con resultados reales.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar mt-4">
            {filteredHooks.map((h) => {
              const isRepeat = h.status === "REPETIR";
              return (
                <div key={h.id} className="bg-sink rounded-xl p-3.5 flex gap-3 relative overflow-hidden">
                  <div className={`w-1 absolute left-0 top-0 h-full ${isRepeat ? "bg-green" : "bg-[#d5514f]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-faint font-mono uppercase">{h.platform}</span>
                      <Badge tone={isRepeat ? "green" : "red"} icon={isRepeat ? RotateCcw : Skull}>
                        {isRepeat ? "REPETIR / ESCALAR" : "MATAR / PAUSAR"}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-ink mt-2">"{h.hook}"</p>
                    <p className="text-[11px] text-muted mt-1.5 leading-relaxed">
                      <span className="text-black font-mono font-bold">Mateo:</span> {h.reason}
                    </p>
                  </div>
                  <div className="flex flex-col justify-center items-end text-right shrink-0 font-mono border-l border-line pl-3">
                    <span className="text-[10px] text-faint uppercase font-semibold">Engagement</span>
                    <span className={`text-sm font-bold ${isRepeat ? "text-[#3f9a3f]" : "text-[#d5514f]"}`}>{h.engagement}</span>
                    <span className="text-[10px] text-muted mt-0.5">
                      {h.likes} ❤ · {h.comments} 💬
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* A/B testing: compare two published posts, decided by real metrics */}
      <Card>
        <SectionTitle
          icon={FlaskConical}
          title="Experimentos A/B"
          subtitle="Compara dos publicaciones: a los 3 días el job de métricas declara el ganador según engagement real."
        />

        {/* Creation form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
          <div className="md:col-span-1">
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              placeholder="Nombre del experimento"
              aria-label="Nombre del experimento"
              className="w-full h-[46px] rounded-input bg-sink text-sm text-ink placeholder:text-faint px-4 outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <Select
            aria-label="Variante A"
            value={expPostA}
            onChange={setExpPostA}
            options={[
              { value: "", label: "Variante A (elige post)" },
              ...posts.map((p) => ({ value: p.postId, label: `[${NETWORK_LABEL[p.network]}] ${(p.caption || p.postId).slice(0, 40)}` })),
            ]}
          />
          <Select
            aria-label="Variante B"
            value={expPostB}
            onChange={setExpPostB}
            options={[
              { value: "", label: "Variante B (elige post)" },
              ...posts.map((p) => ({ value: p.postId, label: `[${NETWORK_LABEL[p.network]}] ${(p.caption || p.postId).slice(0, 40)}` })),
            ]}
          />
          <Button onClick={createExperiment} disabled={creatingExp || posts.length < 2} icon={FlaskConical}>
            {creatingExp ? "Creando..." : "Crear experimento"}
          </Button>
        </div>
        {posts.length < 2 && (
          <p className="text-[12px] text-faint mt-2">
            Necesitas al menos 2 publicaciones registradas para comparar variantes.
          </p>
        )}

        {/* Experiment list */}
        {experiments.length > 0 && (
          <div className="mt-5 space-y-3">
            {experiments.map((e) => {
              const postA = posts.find((p) => p.postId === e.postIdA);
              const postB = posts.find((p) => p.postId === e.postIdB);
              return (
                <div key={e.id} className="bg-sink rounded-input p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">{e.name}</span>
                    {e.status === "decided" ? (
                      <Badge tone={e.winner === "tie" ? "neutral" : "green"} icon={Trophy}>
                        {e.winner === "tie" ? "Empate" : `Ganó la variante ${e.winner}`}
                      </Badge>
                    ) : (
                      <Badge tone="accent" dot>En curso · decide en {e.decideAfterDays} días</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-[12px] text-muted">
                    <div className={`p-2.5 rounded-lg bg-surface ${e.winner === "A" ? "ring-1 ring-[#7dd87d]" : ""}`}>
                      <strong className="text-ink">A:</strong> {(postA?.caption || e.postIdA).slice(0, 70)}
                      {e.engagementA !== undefined && <span className="block text-faint mt-1">{e.engagementA} interacciones</span>}
                    </div>
                    <div className={`p-2.5 rounded-lg bg-surface ${e.winner === "B" ? "ring-1 ring-[#7dd87d]" : ""}`}>
                      <strong className="text-ink">B:</strong> {(postB?.caption || e.postIdB).slice(0, 70)}
                      {e.engagementB !== undefined && <span className="block text-faint mt-1">{e.engagementB} interacciones</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
