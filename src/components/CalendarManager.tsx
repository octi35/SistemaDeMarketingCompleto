import React, { useState, useEffect } from "react";
import { CalendarItem } from "../types";
import { apiPost, apiGet } from "../lib/api";
import { toast } from "../lib/toast";
import { Sparkles, Calendar, Plus, RefreshCw, Check, Clock, Trash2, Edit3, Share2, AlertCircle, Save } from "lucide-react";
import { PixelAvatar } from "./AgentProfiles";

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
      const response = await fetch("/api/generate-calendar", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-Key": localStorage.getItem("custom_gemini_api_key") || ""
        },
        body: JSON.stringify({ niche, topic }),
      });
      const data = await response.json();
      if (data.calendar) {
        setCalendar(data.calendar);
        setActiveItem(data.calendar[0]);
        setIsDemo(!!data.isMock);
      }
    } catch (err) {
      console.error("Error generating calendar:", err);
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

  return (
    <div className="space-y-6" id="calendar-manager-root">
      {/* Search and control section */}
      <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26]/20">
              📅
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Planificador de Calendarios Mensuales Personalizados
              </h2>
              <p className="text-xs text-[#88888E] mt-0.5">
                Cami idea los ángulos del contenido y Facu lo agenda y programa en las plataformas correspondientes.
              </p>
            </div>
          </div>
          {isDemo && (
            <span className="bg-[#1A1A1C] text-[#D1FF26] text-[11px] px-3 py-1.5 rounded-lg border border-[#2A2A2C] font-mono flex items-center gap-1.5 shrink-0 self-start md:self-center">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Modo Demostración Activo (Sin Llave)
            </span>
          )}
        </div>

        {/* Input variables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1.5 col-span-1">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Nicho o Modelo de Negocio</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: Fitness Coaching, SaaS, Agencia..."
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Temas Principales a Tratar en el Contenido</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: Estrategia de embudos de ventas, hacks de productividad..."
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={generateCalendar}
            disabled={loading}
            className="bg-[#D1FF26] hover:bg-[#c2ed1c] active:bg-[#b3db18] disabled:opacity-50 text-black font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
            id="btn-generate-calendar"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Cami y Facu están estructurando tu mes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-black" />
                <span>Generar Plan de Publicación de 30 Días</span>
              </>
            )}
          </button>
          <button
            onClick={saveCalendarPlan}
            disabled={calendar.length === 0 || savingPlan}
            className="bg-[#1A1A1C] border border-[#2A2A2C] hover:border-[#D1FF26]/50 text-[#88888E] hover:text-white font-bold px-5 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider disabled:opacity-50"
          >
            {savingPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#D1FF26]" />}
            <span>Guardar plan</span>
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {calendar.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: 30 Day calendar grid (takes 7 cols) */}
          <div className="lg:col-span-7 bg-[#141416] border border-[#222224] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#222224] pb-3">
              <h3 className="text-xs font-semibold text-[#88888E] uppercase tracking-wider">
                Calendario de Contenido: Vista Mensual
              </h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-[#D1FF26] bg-[#D1FF26]/10 px-2 py-0.5 rounded font-mono font-semibold">
                  <span>●</span> 30 Días
                </span>
              </div>
            </div>

            {/* Calendar Grid 7 columns */}
            <div className="grid grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2">
              {calendar.map((item) => {
                const isActive = activeItem?.day === item.day;
                
                // Color mapping based on platform
                let platColor = "bg-[#1A1A1C] border-[#222224] text-[#88888E] hover:border-[#2A2A2C]";
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
                      isActive ? "ring-2 ring-[#D1FF26] border-transparent bg-[#1A1A1C]" : platColor
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
            <div className="flex items-center gap-4 text-[10px] font-mono text-[#66666E] border-t border-[#222224] pt-3 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Publicado</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Programado / Cola</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" /> Borrador</span>
            </div>
          </div>

          {/* RIGHT: Detailed Day inspector / Edit panel (takes 5 cols) */}
          <div className="lg:col-span-5">
            {activeItem ? (
              <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6 shadow-lg space-y-5">
                
                {/* Header title */}
                <div className="flex items-start justify-between gap-4 border-b border-[#222224] pb-4">
                  <div>
                    <span className="text-xs font-semibold text-[#D1FF26] font-mono">INSPECCIÓN: DÍA {activeItem.day}</span>
                    <h3 className="text-sm font-semibold text-white mt-1">{activeItem.title}</h3>
                  </div>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                    editingStatus === "Publicado" ? "bg-emerald-500/15 text-emerald-400" : editingStatus === "Programado" ? "bg-blue-500/15 text-blue-400" : "bg-slate-950 text-slate-500"
                  }`}>
                    {editingStatus}
                  </span>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Título de la publicación</label>
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded p-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Plataforma</label>
                      <select
                        value={editingPlatform}
                        onChange={(e) => setEditingPlatform(e.target.value)}
                        className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded p-2 text-xs text-white focus:outline-none"
                      >
                        <option value="Instagram Carousel">Instagram Carousel</option>
                        <option value="Meta Ads Banner">Meta Ads Banner</option>
                        <option value="LinkedIn Post">LinkedIn Post</option>
                        <option value="TikTok Reel">TikTok Reel</option>
                        <option value="YouTube Short">YouTube Short</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Hora Programada</label>
                      <div className="flex items-center gap-1.5 bg-[#1A1A1C] border border-[#2A2A2C] rounded px-2.5 py-1 text-xs text-[#88888E]">
                        <Clock className="w-3.5 h-3.5 text-[#66666E]" />
                        <input
                          type="text"
                          value={editingTime}
                          onChange={(e) => setEditingTime(e.target.value)}
                          className="w-full bg-transparent border-none text-xs focus:outline-none focus:ring-0 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Estado de la Publicación</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Borrador", "Programado", "Publicado"].map((st) => (
                        <button
                          key={st}
                          onClick={() => setEditingStatus(st as any)}
                          className={`py-1.5 px-2 text-xs rounded border transition font-semibold ${
                            editingStatus === st
                              ? "bg-[#0A0A0B] border-[#D1FF26] text-[#D1FF26]"
                              : "bg-[#1A1A1C] border-[#2A2A2C] text-[#66666E] hover:text-white"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Guión / Copy Final</label>
                    <textarea
                      value={editingCopy}
                      onChange={(e) => setEditingCopy(e.target.value)}
                      className="w-full h-32 bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded p-2.5 text-xs text-white focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Save and sync buttons */}
                <div className="pt-3 border-t border-[#222224] space-y-2">
                  <button
                    onClick={handleSaveItemEdit}
                    className="w-full bg-[#1A1A1C] hover:bg-[#2A2A2C] text-white font-semibold text-xs px-4 py-2.5 rounded border border-[#2A2A2C] flex items-center justify-center gap-2 transition"
                    id="btn-calendar-save-edit"
                  >
                    <span>Guardar Cambios Locales</span>
                  </button>

                  <button
                    onClick={handleGoogleCalendarSync}
                    disabled={syncing || synced}
                    className={`w-full font-bold text-xs px-4 py-3 rounded-full flex items-center justify-center gap-2 transition border ${
                      synced
                        ? "bg-[#D1FF26]/10 border-[#D1FF26]/30 text-[#D1FF26]"
                        : "bg-[#D1FF26] hover:bg-[#c2ed1c] text-black border-[#D1FF26]"
                    }`}
                    id="btn-google-calendar-sync"
                  >
                    {syncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Sincronizando con Google Calendar API...</span>
                      </>
                    ) : synced ? (
                      <>
                        <Check className="w-4 h-4 text-[#D1FF26]" />
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
                  <div className="bg-[#0A0A0B] rounded p-2 border border-[#222224] font-mono text-[9px] text-[#88888E] space-y-0.5">
                    <div>POST /calendar/v3/calendars/primary/events/quickAdd HTTP/1.1</div>
                    <div className="text-green-400">HTTP/1.1 200 OK {"{"} "id": "gcal_event_38402", "status": "confirmed" {"}"}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#141416] border border-[#222224] rounded-2xl p-12 text-center text-[#88888E] text-xs">
                Selecciona un día del calendario a la izquierda para editar o inspeccionar.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
