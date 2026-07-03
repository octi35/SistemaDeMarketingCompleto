import React, { useState, useEffect } from "react";
import { CalendarItem } from "../types";
import { apiPost, apiGet } from "../lib/api";
import { toast } from "../lib/toast";
import { Sparkles, Calendar, Plus, RefreshCw, Check, Clock, Trash2, Edit3, Share2, AlertCircle, Save, CalendarClock } from "lucide-react";
import { PixelAvatar } from "./AgentProfiles";
import { STORAGE_KEYS, getStored } from "../lib/storageKeys";

export const CalendarManager: React.FC = () => {
  const [niche, setNiche] = useState("Marketing de Afiliados y Cursos Online");
  const [topic, setTopic] = useState("Ventas en Piloto Automático");
  const [loading, setLoading] = useState(false);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [activeItem, setActiveItem] = useState<CalendarItem | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  // Form for adding/editing items
  const [editingTitle, setEditingTitle] = useState("");
  const [editingCopy, setEditingCopy] = useState("");
  const [editingPlatform, setEditingPlatform] = useState("");
  const [editingTime, setEditingTime] = useState("");
  const [editingStatus, setEditingStatus] = useState<"Publicado" | "Programado" | "Borrador">("Borrador");

  const generateCalendar = async () => {
    setLoading(true);
    setCalendar([]);
    setActiveItem(null);
    setSynced(false);
    try {
      const data = await apiPost("/api/generate-calendar", { niche, topic });
      if (data.calendar) {
        setCalendar(data.calendar);
        setActiveItem(data.calendar[0]);
        setIsDemo(!!data.isMock);
      }
    } catch (err: any) {
      toast.error(err.message || "No se pudo generar el calendario.");
    } finally {
      setLoading(false);
    }
  };

  const [savingPlan, setSavingPlan] = useState(false);

  // On mount: load the saved plan if any; otherwise generate a fresh one.
  useEffect(() => {
    (async () => {
      try {
        const data = await apiGet<{ calendar: { items: CalendarItem[]; meta?: any } | null }>("/api/calendar");
        if (data.calendar && Array.isArray(data.calendar.items) && data.calendar.items.length > 0) {
          setCalendar(data.calendar.items);
          setActiveItem(data.calendar.items[0]);
          if (data.calendar.meta?.niche) setNiche(data.calendar.meta.niche);
          if (data.calendar.meta?.topic) setTopic(data.calendar.meta.topic);
          setIsDemo(false);
          return;
        }
      } catch {
        /* no saved plan; fall through to generate */
      }
      generateCalendar();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the current plan so it survives restarts.
  const saveCalendarPlan = async () => {
    if (calendar.length === 0) return;
    setSavingPlan(true);
    try {
      await apiPost("/api/calendar", { items: calendar, meta: { niche, topic } });
      toast.success("Plan de calendario guardado ✓");
    } catch (err: any) {
      toast.error(`No se pudo guardar el plan: ${err.message || err}`);
    } finally {
      setSavingPlan(false);
    }
  };

  // Sync edit form with active item selection
  useEffect(() => {
    if (activeItem) {
      setEditingTitle(activeItem.title);
      setEditingCopy(activeItem.copy);
      setEditingPlatform(activeItem.platform);
      setEditingTime(activeItem.time);
      setEditingStatus(activeItem.status);
    }
  }, [activeItem]);

  // Update calendar item
  const handleSaveItemEdit = () => {
    if (!activeItem) return;
    setCalendar((prev) =>
      prev.map((item) =>
        item.day === activeItem.day
          ? {
              ...item,
              title: editingTitle,
              copy: editingCopy,
              platform: editingPlatform,
              time: editingTime,
              status: editingStatus,
            }
          : item
      )
    );
    // update active selection
    setActiveItem({
      ...activeItem,
      title: editingTitle,
      copy: editingCopy,
      platform: editingPlatform,
      time: editingTime,
      status: editingStatus,
    });
  };

  // Sync with Google Calendar API simulation
  const handleGoogleCalendarSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
    }, 2000);
  };

  // ---- Real 1-click scheduling: calendar item -> auto-publish queue ----
  const [schedulingDay, setSchedulingDay] = useState<number | null>(null);
  const [schedulingAll, setSchedulingAll] = useState(false);

  // Text-only publishing is supported on Facebook Pages and LinkedIn.
  // Instagram requires an image (use the Gestor de Contenido for that).
  const platformToNetwork = (platform: string): "facebook" | "linkedin" | null => {
    if (platform.includes("LinkedIn")) return "linkedin";
    if (platform.includes("Ads") || platform.includes("Facebook")) return "facebook";
    return null;
  };

  // Day 1 of the plan = tomorrow, at the item's configured time.
  const publishAtFor = (item: CalendarItem): string => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(1, item.day));
    const [hh, mm] = (item.time || "10:00").split(":").map((n) => parseInt(n, 10));
    d.setHours(isNaN(hh) ? 10 : hh, isNaN(mm) ? 0 : mm, 0, 0);
    return d.toISOString();
  };

  const buildSchedulePayload = (item: CalendarItem, network: "facebook" | "linkedin") => {
    const text = `${item.title}\n\n${item.copy}`;
    if (network === "linkedin") {
      return { text, token: getStored(STORAGE_KEYS.linkedinAccessToken) };
    }
    return {
      pageId: getStored(STORAGE_KEYS.metaPageId) || "sandbox_page_id",
      message: text,
      token: getStored(STORAGE_KEYS.metaAccessToken),
    };
  };

  const scheduleItem = async (item: CalendarItem, silent = false): Promise<boolean> => {
    const network = platformToNetwork(item.platform);
    if (!network) {
      if (!silent) {
        toast.info(
          item.platform.includes("Instagram") || item.platform.includes("Carousel")
            ? "Instagram necesita imagen: usa el Gestor de Contenido o Carruseles para programarlo con su creatividad."
            : `${item.platform} aún no soporta auto-publicación; se mantiene como recordatorio en el plan.`
        );
      }
      return false;
    }
    const payload = buildSchedulePayload(item, network);
    if (!payload.token) {
      if (!silent) toast.error(`Conecta tu cuenta de ${network === "linkedin" ? "LinkedIn" : "Meta"} en Integración Nube primero.`);
      return false;
    }
    try {
      await apiPost("/api/schedule", {
        network,
        payload,
        publishAt: publishAtFor(item),
        label: `Calendario día ${item.day}: ${item.title.slice(0, 60)}`,
      });
      setCalendar((prev) => prev.map((c) => (c.day === item.day ? { ...c, status: "Programado" } : c)));
      if (activeItem?.day === item.day) setEditingStatus("Programado");
      if (!silent) toast.success(`Día ${item.day} programado para ${new Date(publishAtFor(item)).toLocaleString()}.`);
      return true;
    } catch (err: any) {
      if (!silent) toast.error(`No se pudo programar: ${err.message || err}`);
      return false;
    }
  };

  const handleScheduleActive = async () => {
    if (!activeItem) return;
    setSchedulingDay(activeItem.day);
    await scheduleItem({ ...activeItem, title: editingTitle, copy: editingCopy, platform: editingPlatform, time: editingTime });
    setSchedulingDay(null);
  };

  const handleScheduleAll = async () => {
    setSchedulingAll(true);
    let ok = 0;
    let skipped = 0;
    for (const item of calendar) {
      if (item.status !== "Borrador") continue;
      const network = platformToNetwork(item.platform);
      if (!network) {
        skipped++;
        continue;
      }
      if (await scheduleItem(item, true)) {
        ok++;
      } else {
        skipped++;
      }
    }
    setSchedulingAll(false);
    toast.success(`Plan programado: ${ok} publicaciones en cola de auto-publicación${skipped ? `, ${skipped} omitidas (plataforma sin soporte o sin token)` : ""}.`);
  };

  return (
    <div className="space-y-6" id="calendar-manager-root">
      {/* Search and control section */}
      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-black/10 text-black border border-black/20">
              📅
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Planificador de Calendarios Mensuales Personalizados
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Cami idea los ángulos del contenido y Facu lo agenda y programa en las plataformas correspondientes.
              </p>
            </div>
          </div>
          {isDemo && (
            <span className="bg-sink text-black text-[11px] px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5 shrink-0 self-start md:self-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Modo Demostración Activo (Sin Llave)
            </span>
          )}
        </div>

        {/* Input variables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1.5 col-span-1">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Nicho o Modelo de Negocio</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-sink rounded-input p-3 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
              placeholder="Ej: Fitness Coaching, SaaS, Agencia..."
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Temas Principales a Tratar en el Contenido</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-sink rounded-input p-3 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
              placeholder="Ej: Estrategia de embudos de ventas, hacks de productividad..."
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={generateCalendar}
            disabled={loading}
            className="bg-black hover:bg-sidebar active:bg-sidebar disabled:opacity-50 text-white font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
            id="btn-generate-calendar"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Cami y Facu están estructurando tu mes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Generar Plan de Publicación de 30 Días</span>
              </>
            )}
          </button>
          <button
            onClick={saveCalendarPlan}
            disabled={calendar.length === 0 || savingPlan}
            className="bg-sink hover:border-black/50 text-muted hover:text-ink font-bold px-5 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {savingPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-black" />}
            <span>Guardar plan</span>
          </button>
          <button
            onClick={handleScheduleAll}
            disabled={calendar.length === 0 || schedulingAll}
            className="bg-accent hover:brightness-110 text-white font-bold px-5 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider disabled:opacity-50"
            id="btn-schedule-all-plan"
          >
            {schedulingAll ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
            <span>Programar plan (auto-publicación)</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {calendar.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: 30 Day calendar grid (takes 7 cols) */}
          <div className="lg:col-span-7 bg-surface border border-line rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
                Calendario de Contenido: Vista Mensual
              </h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-black bg-black/10 px-2 py-0.5 rounded font-mono font-semibold">
                  <span>●</span> 30 Días
                </span>
              </div>
            </div>

            {/* Calendar Grid 7 columns */}
            <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2">
              {calendar.map((item) => {
                const isActive = activeItem?.day === item.day;
                
                // Color mapping based on platform
                let platColor = "bg-sink border-line text-muted hover:border-line";
                if (item.platform.includes("Carousel")) {
                  platColor = "bg-rose-950/20 border-rose-500/20 text-rose-300 hover:border-rose-500/40";
                } else if (item.platform.includes("Ads")) {
                  platColor = "bg-amber-950/20 border-amber-500/20 text-amber-300 hover:border-amber-500/40";
                } else if (item.platform.includes("LinkedIn")) {
                  platColor = "bg-blue-950/20 border-blue-500/20 text-blue-300 hover:border-blue-500/40";
                } else if (item.platform.includes("TikTok") || item.platform.includes("Short")) {
                  platColor = "bg-teal-950/20 border-teal-500/20 text-teal-300 hover:border-teal-500/40";
                }

                return (
                  <button
                    key={item.day}
                    onClick={() => setActiveItem(item)}
                    className={`p-2 rounded-lg border text-left flex flex-col justify-between h-20 transition relative group ${
                      isActive ? "ring-2 ring-[#101010] border-transparent bg-sink" : platColor
                    }`}
                    id={`btn-calendar-day-${item.day}`}
                  >
                    <span className="text-xs font-mono font-semibold">{item.day}</span>
                    
                    {/* Platform tiny acronym */}
                    <span className="text-[9px] font-mono font-semibold truncate w-full mt-1">
                      {item.platform.split(" ")[0]}
                    </span>

                    {/* Status dot in bottom right */}
                    <span className={`w-1.5 h-1.5 rounded-full absolute bottom-2 right-2 ${
                      item.status === "Publicado" ? "bg-emerald-400" : item.status === "Programado" ? "bg-blue-400" : "bg-slate-600"
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Helper legend */}
            <div className="flex items-center gap-4 text-[10px] font-mono text-faint border-t border-line pt-3 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Publicado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Programado / Cola</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" /> Borrador</span>
            </div>
          </div>

          {/* RIGHT: Detailed Day inspector / Edit panel (takes 5 cols) */}
          <div className="lg:col-span-5">
            {activeItem ? (
              <div className="bg-surface border border-line rounded-2xl p-6 shadow-lg space-y-5">
                
                {/* Header title */}
                <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <span className="text-xs font-semibold text-black font-mono">INSPECCIÓN: DÍA {activeItem.day}</span>
                    <h3 className="text-sm font-semibold text-ink mt-1">{activeItem.title}</h3>
                  </div>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    editingStatus === "Publicado" ? "bg-emerald-500/15 text-emerald-400" : editingStatus === "Programado" ? "bg-blue-500/15 text-blue-400" : "bg-sink text-slate-500"
                  }`}>
                    {editingStatus}
                  </span>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-faint font-mono uppercase">Título de la publicación</label>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full bg-sink rounded-input p-2 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-faint font-mono uppercase">Plataforma</label>
                      <select
                        value={editingPlatform}
                        onChange={(e) => setEditingPlatform(e.target.value)}
                        className="w-full bg-sink rounded-input p-2 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                      >
                        <option value="Instagram Carousel">Instagram Carousel</option>
                        <option value="Meta Ads Banner">Meta Ads Banner</option>
                        <option value="LinkedIn Post">LinkedIn Post</option>
                        <option value="TikTok Reel">TikTok Reel</option>
                        <option value="YouTube Short">YouTube Short</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-faint font-mono uppercase">Hora Programada</label>
                      <div className="flex items-center gap-1.5 bg-sink rounded px-2.5 py-1 text-xs text-muted">
                        <Clock className="w-3.5 h-3.5 text-faint" />
                        <input
                          type="text"
                          value={editingTime}
                          onChange={(e) => setEditingTime(e.target.value)}
                          className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-ink font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-faint font-mono uppercase">Estado de la Publicación</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Borrador", "Programado", "Publicado"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setEditingStatus(st as any)}
                          className={`py-1.5 px-2 text-xs rounded border transition font-semibold ${
                            editingStatus === st
                              ? "bg-sink border-black text-black"
                              : "bg-sink border-line text-faint hover:text-ink"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-faint font-mono uppercase">Guión / Copy Final</label>
                    <textarea
                      value={editingCopy}
                      onChange={(e) => setEditingCopy(e.target.value)}
                      className="w-full h-32 bg-sink rounded-input p-2.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Save and sync buttons */}
                <div className="pt-3 border-t border-line space-y-2">
                  <button
                    onClick={handleSaveItemEdit}
                    className="w-full bg-sink hover:bg-[#eaedf6] text-ink font-semibold text-xs px-4 py-2.5 rounded flex items-center justify-center gap-2 transition"
                    id="btn-calendar-save-edit"
                  >
                    <span>Guardar Cambios Locales</span>
                  </button>

                  <button
                    onClick={handleScheduleActive}
                    disabled={schedulingDay === activeItem.day}
                    className="w-full bg-accent hover:brightness-110 text-white font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition disabled:opacity-50"
                    id="btn-calendar-schedule-item"
                  >
                    {schedulingDay === activeItem.day ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CalendarClock className="w-4 h-4" />
                    )}
                    <span>Programar publicación real (día {activeItem.day})</span>
                  </button>

                  <button
                    onClick={handleGoogleCalendarSync}
                    disabled={syncing || synced}
                    className={`w-full font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition border ${
                      synced
                        ? "bg-black/10 border-black/30 text-black"
                        : "bg-black hover:bg-sidebar text-white border-black"
                    }`}
                    id="btn-google-calendar-sync"
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Sincronizando con Google Calendar API...</span>
                      </>
                    ) : synced ? (
                      <>
                        <Check className="w-4 h-4 text-black" />
                        <span>Sincronizado con Google Calendar</span>
                      </>
                    ) : (
                      <>
                        <span>Sincronizar Calendario Completo</span>
                      </>
                    )}
                  </button>
                </div>

                {/* API Sync Request Code Logs */}
                {synced && (
                  <div className="bg-sink rounded p-2 border border-line font-mono text-[9px] text-muted space-y-0.5">
                    <div>POST /calendar/v3/calendars/primary/events/quickAdd HTTP/1.1</div>
                    <div className="text-green-400">HTTP/1.1 200 OK {"{"} "id": "gcal_event_38402", "status": "confirmed" {"}"}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface border border-line rounded-2xl p-12 text-center text-muted text-xs">
                Selecciona un día del calendario a la izquierda para editar o inspeccionar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
