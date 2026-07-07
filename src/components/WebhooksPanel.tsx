import React, { useEffect, useState } from "react";
import { Webhook, Plus, Trash2, Zap, RefreshCw } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { toast } from "../lib/toast";

interface Hook {
  id: string;
  url: string;
  events?: string[];
  hasSecret?: boolean;
  createdAt: string;
}

const EVENT_OPTIONS = [
  { id: "post.published", label: "Post publicado" },
  { id: "post.failed", label: "Publicación fallida" },
  { id: "asset.created", label: "Imagen de marca creada" },
];

/**
 * Outgoing webhooks manager: connect AdTeam to another system (CRM, funnel,
 * Zapier/Make/n8n). Every publish/failure/asset event POSTs JSON to the URLs
 * registered here (HMAC-signed when a secret is set).
 */
export const WebhooksPanel: React.FC = () => {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = () => {
    apiGet<{ webhooks: Hook[] }>("/api/webhooks")
      .then((r) => setHooks(r.webhooks || []))
      .catch(() => {});
  };

  useEffect(load, []);

  const addHook = async () => {
    if (!url.startsWith("http")) {
      toast.error("Ingresa una URL válida (https://...).");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/webhooks", {
        url,
        secret: secret || undefined,
        events: events.length ? events : undefined,
      });
      setUrl("");
      setSecret("");
      setEvents([]);
      load();
      toast.success("Webhook registrado: ese sistema recibirá los eventos.");
    } catch (err: any) {
      toast.error(err.message || "No se pudo registrar el webhook.");
    } finally {
      setSaving(false);
    }
  };

  const removeHook = async (id: string) => {
    try {
      await apiDelete(`/api/webhooks/${id}`);
      load();
    } catch (err: any) {
      toast.error(err.message || "No se pudo eliminar.");
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await apiPost<{ sent: number }>("/api/webhooks/test", {});
      toast.success(`Evento de prueba enviado a ${r.sent} webhook(s).`);
    } catch (err: any) {
      toast.error(err.message || "No se pudo enviar la prueba.");
    } finally {
      setTesting(false);
    }
  };

  const toggleEvent = (id: string) =>
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 space-y-4" id="webhooks-panel">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
            <Webhook className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">Webhooks — vincular otro sistema</h3>
            <p className="text-[10px] text-muted">
              Notifica a tu CRM, funnel o Zapier/Make cuando se publica un post, falla una programación o se crea una imagen.
            </p>
          </div>
        </div>
        {hooks.length > 0 && (
          <button
            onClick={sendTest}
            disabled={testing}
            className="bg-sink hover:bg-[#ECECEC] border border-line text-muted text-[10px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 transition disabled:opacity-50"
          >
            {testing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            <span>Enviar prueba</span>
          </button>
        )}
      </div>

      {/* New webhook form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tu-sistema.com/webhooks/adteam"
          className="w-full bg-sink border border-line rounded-input px-3 py-2 text-xs text-ink placeholder-[#9CA3AF] outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 font-mono"
        />
        <input
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Secreto opcional (firma HMAC-SHA256)"
          className="w-full bg-sink border border-line rounded-input px-3 py-2 text-xs text-ink placeholder-[#9CA3AF] outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 font-mono"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-faint uppercase font-mono">Eventos:</span>
        {EVENT_OPTIONS.map((ev) => (
          <button
            key={ev.id}
            onClick={() => toggleEvent(ev.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition border ${
              events.includes(ev.id) ? "bg-black text-white border-black" : "bg-sink text-muted border-line hover:text-ink"
            }`}
          >
            {ev.label}
          </button>
        ))}
        <span className="text-[10px] text-faint">(ninguno = todos)</span>
        <button
          onClick={addHook}
          disabled={saving || !url}
          className="ml-auto bg-black hover:bg-sidebar text-white font-bold text-[11px] px-3 py-2 rounded-lg transition uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Registrar
        </button>
      </div>

      {/* Registered hooks */}
      {hooks.length > 0 && (
        <div className="space-y-1.5">
          {hooks.map((h) => (
            <div key={h.id} className="flex items-center gap-2 text-[11px] bg-sink border border-line rounded-lg px-3 py-2">
              <span className="flex-1 font-mono text-ink truncate">{h.url}</span>
              <span className="text-faint font-mono text-[9px] shrink-0">
                {h.events?.length ? h.events.join(", ") : "todos los eventos"}
                {h.hasSecret ? " · firmado" : ""}
              </span>
              <button onClick={() => removeHook(h.id)} className="text-zinc-500 hover:text-red-400 shrink-0" aria-label="Eliminar webhook">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-faint leading-relaxed">
        ¿Necesitas que otro sistema publique o lea datos de AdTeam? Activa la <strong>API externa</strong> definiendo{" "}
        <code className="bg-sink px-1 rounded">EXTERNAL_API_KEYS</code> en el servidor y consulta <strong>API.md</strong> (endpoints{" "}
        <code className="bg-sink px-1 rounded">/api/ext/*</code>).
      </p>
    </div>
  );
};
