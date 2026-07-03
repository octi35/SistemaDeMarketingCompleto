import React, { useState, useEffect } from "react";
import { apiPost, apiGet } from "../lib/api";
import { toast } from "../lib/toast";
import { STORAGE_KEYS, getStored } from "../lib/storageKeys";
import { BarChart3, RefreshCw, Heart, MessageCircle, Sparkles, TrendingUp, TrendingDown, Wrench, ExternalLink, Send } from "lucide-react";

interface MediaMetric {
  id: string;
  caption: string;
  type: string;
  permalink?: string;
  timestamp?: string;
  likes: number;
  comments: number;
  engagement: number;
}

interface Recommendation {
  action: "repeat" | "kill" | "tweak";
  title: string;
  reason: string;
  priority: "alta" | "media" | "baja";
}

const ACTION_STYLE: Record<Recommendation["action"], { label: string; cls: string; icon: React.ReactNode }> = {
  repeat: { label: "Repetir", cls: "text-black border-black/30 bg-black/5", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  kill: { label: "Matar", cls: "text-red-400 border-red-500/30 bg-red-500/5", icon: <TrendingDown className="w-3.5 h-3.5" /> },
  tweak: { label: "Ajustar", cls: "text-amber-400 border-amber-500/30 bg-amber-500/5", icon: <Wrench className="w-3.5 h-3.5" /> },
};

export const RealMetricsPanel: React.FC = () => {
  const [media, setMedia] = useState<MediaMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [isMockReco, setIsMockReco] = useState(false);
  const [publishedPosts, setPublishedPosts] = useState<any[]>([]);

  // Posts published through AdTeam (so metrics can be linked to them).
  useEffect(() => {
    apiGet<{ posts: any[] }>("/api/posts")
      .then((d) => setPublishedPosts(d.posts || []))
      .catch(() => {});
  }, []);

  const [network, setNetwork] = useState<"instagram" | "facebook">("instagram");

  const igId = getStored(STORAGE_KEYS.metaIgAccountId);
  const pageId = getStored(STORAGE_KEYS.metaPageId);
  const token = getStored(STORAGE_KEYS.metaAccessToken);
  const connected = network === "instagram" ? !!(igId && token) : !!(pageId && token);

  const loadMetrics = async () => {
    if (!connected) {
      toast.error(
        network === "instagram"
          ? "Conecta tu Instagram en 'Gestor de Contenido' → 'Cargar mis páginas' para ver métricas reales."
          : "Conecta tu página de Facebook en 'Gestor de Contenido' → 'Cargar mis páginas' primero."
      );
      return;
    }
    setLoading(true);
    try {
      const data =
        network === "instagram"
          ? await apiPost<{ media: MediaMetric[] }>("/api/metrics/instagram", { igUserId: igId, token })
          : await apiPost<{ media: MediaMetric[] }>("/api/metrics/facebook", { pageId, token });
      setMedia(data.media || []);
      if ((data.media || []).length === 0) toast.info("La cuenta no tiene publicaciones todavía.");
      else toast.success(`${data.media.length} publicaciones cargadas.`);
    } catch (err: any) {
      toast.error(`No se pudieron cargar métricas: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const data = await apiPost<{ recommendations: Recommendation[]; isMock?: boolean }>(
        "/api/recommendations",
        { metrics: media }
      );
      setRecommendations(data.recommendations || []);
      setIsMockReco(!!data.isMock);
    } catch (err: any) {
      toast.error(`No se pudo analizar: ${err.message || err}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded bg-black/10 border border-black/20">
            <BarChart3 className="w-4 h-4 text-black" />
          </span>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">Métricas reales</h3>
            <p className="text-[10px] text-muted">
              {connected ? "Cuenta conectada — datos en vivo vía Graph API." : "Conecta tu cuenta para ver datos reales."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-sink border border-line rounded-lg p-0.5">
            {(["instagram", "facebook"] as const).map((n) => (
              <button
                key={n}
                onClick={() => {
                  setNetwork(n);
                  setMedia([]);
                  setRecommendations([]);
                }}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${
                  network === n ? "bg-black text-white" : "text-muted hover:text-ink"
                }`}
              >
                {n === "instagram" ? "IG" : "FB"}
              </button>
            ))}
          </div>
          <button
            onClick={loadMetrics}
            disabled={loading}
            className="bg-sink hover:text-ink text-muted text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Cargar métricas</span>
          </button>
          <button
            onClick={analyze}
            disabled={analyzing || media.length === 0}
            className="bg-black hover:bg-sidebar disabled:opacity-50 text-white font-bold text-[11px] px-3 py-2 rounded-lg flex items-center gap-2 transition"
          >
            {analyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>¿Qué mejorar? (IA)</span>
          </button>
        </div>
      </div>

      {publishedPosts.length > 0 && (
        <div className="bg-sink border border-line rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-3.5 h-3.5 text-black" />
            <span className="text-[10px] uppercase tracking-wider text-faint font-mono">
              Publicado desde AdTeam ({publishedPosts.length})
            </span>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
            {publishedPosts.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[11px] text-muted">
                <span className="uppercase font-mono text-[9px] text-black w-16 shrink-0">{p.network}</span>
                <span className="truncate flex-1 px-2">{p.caption || p.postId}</span>
                <span className="text-[9px] text-faint shrink-0">{(p.createdAt || "").slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {media.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {media.map((m) => (
            <div key={m.id} className="bg-sink border border-line rounded-lg p-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink line-clamp-2 flex-1">{m.caption || "(sin texto)"}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted shrink-0">
                <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{m.likes}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-blue-400" />{m.comments}</span>
                {m.permalink && (
                  <a href={m.permalink} target="_blank" rel="noreferrer" className="text-faint hover:text-black">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-faint font-mono">Recomendaciones de Mateo (IA)</span>
            {isMockReco && <span className="text-[9px] text-black font-mono">(demo)</span>}
          </div>
          {recommendations.map((r, i) => (
            <div key={i} className={`border rounded-lg p-3 ${ACTION_STYLE[r.action]?.cls || ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase">
                  {ACTION_STYLE[r.action]?.icon} {ACTION_STYLE[r.action]?.label || r.action}
                </span>
                <span className="text-[9px] text-muted font-mono">· prioridad {r.priority}</span>
              </div>
              <p className="text-xs font-semibold text-ink">{r.title}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{r.reason}</p>
            </div>
          ))}
        </div>
      )}

      {!connected && media.length === 0 && (
        <p className="text-[11px] text-muted leading-relaxed">
          Aún no hay datos reales. Conecta tu cuenta de Instagram Business en la pestaña "Gestor de Contenido" y vuelve aquí.
          También puedes pedir recomendaciones de la IA con datos de ejemplo pulsando "¿Qué mejorar?".
        </p>
      )}
    </div>
  );
};
