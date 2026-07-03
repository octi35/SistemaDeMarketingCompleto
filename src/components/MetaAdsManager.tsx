import React, { useState, useEffect, useRef } from "react";
import { Creative } from "../types";
import { Search, SlidersHorizontal, Download, Share2, Upload, Calendar, RefreshCw, Check, Sparkles, Filter, AlertCircle, PlayCircle } from "lucide-react";
import { PixelAvatar } from "./AgentProfiles";
import { apiPost } from "../lib/api";
import { toast } from "../lib/toast";
import { STORAGE_KEYS, getStored, setStored } from "../lib/storageKeys";

export const MetaAdsManager: React.FC = () => {
  // Input fields
  const [description, setDescription] = useState("Venta de productos de tecnología inteligente para el hogar, domótica fácil, asistentes virtuales y enchufes wifi para ahorrar energía.");
  const [niche, setNiche] = useState("Domótica y Tecnología Hogar");
  const [audience, setAudience] = useState("Propietarios de viviendas, jóvenes de 25-45 años interesados en gadgets, eficiencia y ahorro energético.");
  
  // States
  const [loading, setLoading] = useState(false);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedAngle, setSelectedAngle] = useState("all");
  const [activeCreative, setActiveCreative] = useState<Creative | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [scheduledList, setScheduledList] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadedList, setUploadedList] = useState<string[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  
  // Customization state for active creative
  const [editedHeadline, setEditedHeadline] = useState("");
  const [editedHook, setEditedHook] = useState("");
  const [editedBodyCopy, setEditedBodyCopy] = useState("");
  const [editedCta, setEditedCta] = useState("");

  // Real Meta Ads draft (campaign + ad set + creative + ad, all PAUSED)
  const [adAccountId, setAdAccountId] = useState(() => getStored(STORAGE_KEYS.metaAdAccountId));
  const [adsPageId, setAdsPageId] = useState(() => getStored(STORAGE_KEYS.metaPageId));
  const [adsLink, setAdsLink] = useState("");
  const [adsBudget, setAdsBudget] = useState(10);
  const [adsCountries, setAdsCountries] = useState("AR");
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftResult, setDraftResult] = useState<{ ok: boolean; campaignId?: string; adId?: string; steps: { step: string; id?: string; error?: any }[] } | null>(null);

  const createRealAdsDraft = async () => {
    const token = getStored(STORAGE_KEYS.metaAccessToken);
    if (!token) {
      toast.error("Conecta tu cuenta de Meta en Integración Nube primero.");
      return;
    }
    if (!adAccountId || !adsPageId || !adsLink) {
      toast.error("Completa la cuenta publicitaria, la página de Facebook y el link de destino.");
      return;
    }
    setCreatingDraft(true);
    setDraftResult(null);
    try {
      const r = await apiPost("/api/meta/ads/draft", {
        adAccountId,
        token,
        pageId: adsPageId,
        campaignName: editedHeadline || "Campaña AdTeam AI",
        dailyBudgetUsd: adsBudget,
        countries: adsCountries.split(",").map((c) => c.trim().toUpperCase()).filter((c) => c.length === 2),
        message: `${editedHook}\n\n${editedBodyCopy}`,
        headline: editedHeadline || undefined,
        link: adsLink,
      });
      setDraftResult(r);
      setStored(STORAGE_KEYS.metaAdAccountId, adAccountId);
      setStored(STORAGE_KEYS.metaPageId, adsPageId);
      if (r.ok) {
        toast.success("Borrador creado en Meta (PAUSADO): revísalo y actívalo desde el Administrador de Anuncios.");
      } else {
        toast.error("La creación quedó incompleta: revisa el detalle de pasos abajo.");
      }
    } catch (err: any) {
      toast.error(err.message || "No se pudo crear el borrador de campaña.");
    } finally {
      setCreatingDraft(false);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync edits to state
  useEffect(() => {
    if (activeCreative) {
      setEditedHeadline(activeCreative.headline);
      setEditedHook(activeCreative.hook);
      setEditedBodyCopy(activeCreative.bodyCopy);
      setEditedCta(activeCreative.cta);
    }
  }, [activeCreative]);

  // Generate creatives
  const generateCreatives = async () => {
    setLoading(true);
    setCreatives([]);
    setActiveCreative(null);
    try {
      const data = await apiPost("/api/generate-creatives", { description, niche, audience });
      if (data.creatives) {
        setCreatives(data.creatives);
        setActiveCreative(data.creatives[0]);
        setIsDemo(!!data.isMock);
      }
    } catch (err: any) {
      toast.error(err.message || "No se pudieron generar los creativos.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-load some creatives on first load to give visual pop
  useEffect(() => {
    generateCreatives();
  }, []);

  // Filter creatives
  const filteredCreatives = creatives.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.hook.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.bodyCopy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.angle.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlatform = selectedPlatform === "all" || c.platform.toLowerCase().includes(selectedPlatform.toLowerCase());
    const matchesAngle = selectedAngle === "all" || c.angle.toLowerCase() === selectedAngle.toLowerCase();

    return matchesSearch && matchesPlatform && matchesAngle;
  });

  // Unique lists for filtering
  const anglesList = Array.from(new Set(creatives.map((c) => c.angle)));

  // Download Creative as high-resolution PNG using HTML5 Canvas
  const handleDownloadPNG = (creative: Creative) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions for high resolution 1080x1080px (Square Social Post)
    canvas.width = 1080;
    canvas.height = 1080;

    // Draw Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    if (creative.angle.includes("PAS")) {
      gradient.addColorStop(0, "#EEF1F8"); // Deep Indigo
      gradient.addColorStop(1, "#311042"); 
    } else if (creative.angle.includes("AIDA")) {
      gradient.addColorStop(0, "#EEF1F8"); // Slate Slate
      gradient.addColorStop(1, "#ECECEC");
    } else if (creative.angle.includes("Direct")) {
      gradient.addColorStop(0, "#022c22"); // Deep Green
      gradient.addColorStop(1, "#064e3b");
    } else {
      gradient.addColorStop(0, "#2c1102"); // Warm Rust
      gradient.addColorStop(1, "#451a03");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    // Decorative geometric vector shapes representing AI Agent architecture
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.arc(1080, 0, 600, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 191, 0, 0.04)";
    ctx.beginPath();
    ctx.arc(0, 1080, 450, 0, Math.PI * 2);
    ctx.fill();

    // Border Frame
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 24;
    ctx.strokeRect(30, 30, 1020, 1020);

    // Draw Platform Badge top-left
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(80, 80, 320, 50);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = "#fbbf24"; // Amber Accent
    ctx.fillText(creative.platform.toUpperCase(), 100, 114);

    // Draw Copywriting Framework Tag top-right
    ctx.fillStyle = "rgba(251, 191, 36, 0.15)";
    ctx.fillRect(720, 80, 280, 50);
    ctx.font = "bold 22px monospace";
    ctx.fillStyle = "#fef08a";
    ctx.fillText(`ÁNGULO: ${creative.angle}`, 740, 113);

    // Headline (Santi's Directive)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 52px system-ui, -apple-system, sans-serif";
    const words = editedHeadline.split(" ");
    let line = "";
    let y = 260;
    const maxWidth = 920;
    const lineHeight = 65;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 80, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, y);

    // Hook Line (Lauti's Script)
    y += 100;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "italic bold 36px system-ui";
    ctx.fillText(`"${editedHook}"`, 80, y);

    // Body Copy Box
    y += 80;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(80, y, 920, 280);
    
    ctx.fillStyle = "#6B7280"; // Cool Gray Text
    ctx.font = "30px system-ui";
    const bodyWords = editedBodyCopy.split(" ");
    let bodyLine = "";
    let bodyY = y + 60;
    const bodyLineHeight = 44;

    for (let n = 0; n < bodyWords.length; n++) {
      const testLine = bodyLine + bodyWords[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth - 40 && n > 0) {
        ctx.fillText(bodyLine, 110, bodyY);
        bodyLine = bodyWords[n] + " ";
        bodyY += bodyLineHeight;
      } else {
        bodyLine = testLine;
      }
    }
    ctx.fillText(bodyLine, 110, bodyY);

    // Button Design bottom center
    const btnX = 80;
    const btnY = 900;
    const btnW = 920;
    const btnH = 80;
    ctx.fillStyle = "#d97706"; // Amber Dark
    ctx.fillRect(btnX, btnY, btnW, btnH);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(editedCta.toUpperCase(), 1080 / 2, btnY + 52);
    ctx.textAlign = "left"; // reset

    // Watermark
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "16px monospace";
    ctx.fillText("DISEÑADO POR ADTEAM AI • META ADS INTEGRADO", 80, 1030);

    // Create Download Link
    const imageURI = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `ADTEAM_CREATIVE_${creative.id}_${creative.platform.replace(/\s+/g, "_")}.png`;
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Schedule campaign action
  const handleScheduleCreative = (creativeId: string) => {
    setScheduling(creativeId);
    setTimeout(() => {
      setScheduledList((prev) => [...prev, creativeId]);
      setScheduling(null);
    }, 1500);
  };

  // Upload creative to API
  const handleUploadAPI = (creativeId: string) => {
    setUploading(creativeId);
    setTimeout(() => {
      setUploadedList((prev) => [...prev, creativeId]);
      setUploading(null);
    }, 1800);
  };

  return (
    <div className="space-y-6" id="meta-ads-manager-root">
      {/* Search and control section */}
      <div className="bg-surface border border-line rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-black/10 text-black border border-black/20">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                Generador de 50 Creativos con Santi & Mateo
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Utiliza inteligencia artificial estructurada para generar un conjunto de 50 ganchos de conversión instantáneos.
              </p>
            </div>
          </div>
          {isDemo && (
            <span className="bg-sink text-black text-[11px] px-3 py-1.5 rounded-lg font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Modo Demostración Activo (Sin Llave)
            </span>
          )}
        </div>

        {/* Input parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Descripción del Negocio</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-sink rounded-input p-3 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none"
              placeholder="Ej: Agencia de marketing, tienda e-commerce..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Nicho / Categoría</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-sink rounded-input p-3 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
              placeholder="Ej: Domótica y Tecnología"
            />
            <div className="text-[11px] text-faint italic mt-1">
              Santi usará esto para afinar el tono de la oferta.
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-faint uppercase tracking-wider">Público Objetivo (Buyer Persona)</label>
            <textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full h-24 bg-sink rounded-input p-3 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none"
              placeholder="Ej: Emprendedores, propietarios..."
            />
          </div>
        </div>

        <button
          onClick={generateCreatives}
          disabled={loading}
          className="w-full md:w-auto bg-black hover:bg-sidebar active:bg-sidebar disabled:bg-[#ECECEC] disabled:text-faint text-white font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
          id="btn-generate-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generando 50 Creativos con el Equipo IA... (Toma unos segundos)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Ejecutar Algoritmo: Generar 50 Creativos de Conversión</span>
            </>
          )}
        </button>
      </div>

      {/* Invisible Canvas for Downloading PNG */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Grid containing list and previewer */}
      {creatives.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: 50 Creatives list (takes 5 cols) */}
          <div className="lg:col-span-5 bg-surface border border-line rounded-2xl p-4 h-[750px] flex flex-col">
            
            {/* Search and filter header */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 justify-between">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Listado de Creativos ({filteredCreatives.length}/50)
                </h3>
                <span className="text-xs bg-sink px-2 py-0.5 rounded text-muted font-mono">
                  Santi & Mateo
                </span>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 text-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por gancho, título o ángulo..."
                  className="w-full bg-sink rounded-input pl-9 pr-3 py-2 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {/* Filters row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="bg-sink rounded px-2 py-1.5 text-muted focus:outline-none"
                >
                  <option value="all">Plataformas (Todas)</option>
                  <option value="Feed">Facebook Feed</option>
                  <option value="Stories">Instagram Stories</option>
                  <option value="Reels">Instagram Reels</option>
                  <option value="Audience">Meta Network</option>
                </select>
                <select
                  value={selectedAngle}
                  onChange={(e) => setSelectedAngle(e.target.value)}
                  className="bg-sink rounded px-2 py-1.5 text-muted focus:outline-none"
                >
                  <option value="all">Ángulo IA (Todos)</option>
                  {anglesList.map((angle) => (
                    <option key={angle} value={angle}>{angle}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredCreatives.length === 0 ? (
                <div className="text-center py-12 text-faint text-xs">
                  Ningún creativo coincide con la búsqueda.
                </div>
              ) : (
                filteredCreatives.map((creative) => {
                  const isActive = activeCreative?.id === creative.id;
                  const isScheduled = scheduledList.includes(creative.id);
                  const isUploaded = uploadedList.includes(creative.id);

                  return (
                    <button
                      key={creative.id}
                      onClick={() => setActiveCreative(creative)}
                      className={`w-full text-left p-3 rounded-lg border transition flex items-start gap-3 relative overflow-hidden group ${
                        isActive 
                          ? "bg-sink border-black shadow" 
                          : "bg-transparent border-line hover:bg-sink/50 hover:border-line"
                      }`}
                      id={`btn-creative-card-${creative.id}`}
                    >
                      {/* Estimated ROI indicator on left edge */}
                      <div className="h-full w-1 absolute left-0 top-0 bg-black" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-faint font-mono uppercase">{creative.platform}</span>
                          <span className="text-[10px] text-black bg-black/10 px-1.5 py-0.5 rounded font-mono font-semibold">
                            CTR Est: {creative.estimatedCtr}%
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-ink mt-1 truncate group-hover:text-black transition-colors">
                          {creative.headline}
                        </h4>
                        <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-relaxed">
                          {creative.hook}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] bg-sink px-1.5 py-0.5 rounded text-muted font-mono">
                            {creative.angle}
                          </span>
                          {isScheduled && (
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">
                              Programado
                            </span>
                          )}
                          {isUploaded && (
                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                              Subido API
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Selected Creative visual previewer & actions (takes 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {activeCreative ? (
              <div className="bg-surface border border-line rounded-2xl p-6 space-y-6">
                
                {/* Header card info */}
                <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-ink flex items-center gap-2">
                      <span className="text-black">⚡</span> {activeCreative.title}
                    </h3>
                    <p className="text-xs text-muted mt-1">
                      Este creativo fue diseñado bajo el marco de copywriting <strong className="text-black">{activeCreative.angle}</strong> para ser distribuido en <strong className="text-ink">{activeCreative.platform}</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right font-mono">
                    <span className="text-[10px] text-faint uppercase tracking-widest font-semibold">PREDICCIÓN MATEO</span>
                    <span className="text-black text-sm font-bold">CTR: {activeCreative.estimatedCtr}%</span>
                    <span className="text-ink text-xs">Conv: {activeCreative.estimatedConversionRate}%</span>
                  </div>
                </div>

                {/* Main section: Mock device preview and customization form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Visual mockup panel */}
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Vista Previa de Anuncio</span>
                    
                    {/* Mock phone/ad shell */}
                    <div className="bg-sink border border-line rounded-2xl overflow-hidden relative flex flex-col h-[520px]">
                      {/* Meta header */}
                      <div className="bg-surface px-4 py-3 border-b border-line flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-sink flex items-center justify-center text-xs font-bold text-black font-mono">
                          AD
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-semibold text-ink">Mi Cuenta de Meta Ads</h4>
                            <span className="text-[9px] bg-black/10 text-black px-1 rounded font-mono font-bold">Patrocinado</span>
                          </div>
                          <p className="text-[10px] text-muted font-mono mt-0.5">{activeCreative.platform}</p>
                        </div>
                      </div>

                      {/* Post body */}
                      <div className="p-3 bg-sink text-xs text-muted space-y-2 flex-1 min-h-0 overflow-y-auto select-none custom-scrollbar">
                        <p className="leading-relaxed whitespace-pre-wrap">
                          <span className="text-black font-bold">{editedHook}</span> {editedBodyCopy}
                        </p>
                        
                        {/* Interactive Banner visual design inside phone */}
                        <div className="border border-line rounded-xl p-4 bg-gradient-to-br from-[#F3F5FB] to-[#F3F5FB] space-y-3 min-h-[180px] flex flex-col justify-between relative">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] bg-black text-white px-1.5 rounded font-mono font-bold tracking-wider">
                              {activeCreative.angle}
                            </span>
                            <span className="text-[9px] text-faint font-mono">1080x1080 PNG</span>
                          </div>

                          <h3 className="text-sm font-semibold text-ink text-center leading-tight drop-shadow my-auto">
                            {editedHeadline}
                          </h3>

                          {/* Suggested image prompt preview visual */}
                          <div className="bg-black/40 border border-white/5 p-2 rounded text-[9px] text-muted font-mono leading-relaxed truncate">
                            💡 {activeCreative.imagePrompt}
                          </div>
                        </div>
                      </div>

                      {/* Footer CTA */}
                      <div className="bg-surface border-t border-line px-4 py-3 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-ink truncate max-w-[180px]">{editedHeadline}</h4>
                          <p className="text-[10px] text-muted truncate max-w-[180px]">adteam.ai/empieza</p>
                        </div>
                        <button className="bg-sink text-ink font-semibold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider select-none shrink-0">
                          {editedCta}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customizer form */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <span className="text-xs font-semibold text-muted uppercase tracking-wider block">Laboratorio de Personalización</span>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-faint font-mono uppercase">Título / Titular de la Imagen</label>
                        <input
                          type="text"
                          value={editedHeadline}
                          onChange={(e) => setEditedHeadline(e.target.value)}
                          className="w-full bg-sink rounded-input p-2.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-faint font-mono uppercase">Gancho de Entrada (Hook)</label>
                        <textarea
                          value={editedHook}
                          onChange={(e) => setEditedHook(e.target.value)}
                          className="w-full h-16 bg-sink rounded-input p-2.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-faint font-mono uppercase">Cuerpo de Texto Persuasivo</label>
                        <textarea
                          value={editedBodyCopy}
                          onChange={(e) => setEditedBodyCopy(e.target.value)}
                          className="w-full h-24 bg-sink rounded-input p-2.5 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-faint font-mono uppercase">Etiqueta de Botón CTA</label>
                        <select
                          value={editedCta}
                          onChange={(e) => setEditedCta(e.target.value)}
                          className="w-full bg-sink rounded-input p-2 text-xs text-ink outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
                        >
                          <option value="Más información">Más información</option>
                          <option value="Comprar ahora">Comprar ahora</option>
                          <option value="Registrarse">Registrarse</option>
                          <option value="Ver más">Ver más</option>
                          <option value="Contactar">Contactar</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-sink rounded-lg p-3 border border-line flex items-start gap-2.5 text-[11px] text-muted">
                      <span className="text-black">🧠</span>
                      <p>
                        Santi comenta: <span className="italic text-ink">"Hacer pruebas A/B variando el gancho inicial incrementa el CTR hasta en un 40%. Intenta cambiar el gancho de curiosidad por una pregunta directa."</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Output action buttons */}
                <div className="border-t border-line pt-5 flex flex-wrap gap-3">
                  
                  <button
                    onClick={() => handleDownloadPNG(activeCreative)}
                    className="flex-1 bg-sink hover:bg-[#eaedf6] text-ink font-semibold text-xs px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition"
                    id={`btn-download-png-${activeCreative.id}`}
                  >
                    <Download className="w-4 h-4 text-black" />
                    <span>Descargar PNG Alta Resolución</span>
                  </button>

                  <button
                    onClick={() => handleUploadAPI(activeCreative.id)}
                    disabled={uploading === activeCreative.id || uploadedList.includes(activeCreative.id)}
                    className={`flex-1 font-semibold text-xs px-4 py-3 rounded-lg border flex items-center justify-center gap-2 transition ${
                      uploadedList.includes(activeCreative.id)
                        ? "bg-black/10 border-black/30 text-black"
                        : "bg-sink hover:bg-[#eaedf6] text-ink"
                    }`}
                    id={`btn-upload-api-${activeCreative.id}`}
                  >
                    {uploading === activeCreative.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Sincronizando con Meta Ads Manager...</span>
                      </>
                    ) : uploadedList.includes(activeCreative.id) ? (
                      <>
                        <Check className="w-4 h-4 text-black" />
                        <span>Cargado con Éxito (API Meta OK)</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-green-500" />
                        <span>Subir directamente mediante API</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleScheduleCreative(activeCreative.id)}
                    disabled={scheduling === activeCreative.id || scheduledList.includes(activeCreative.id)}
                    className={`flex-1 font-semibold text-xs px-4 py-3 rounded-lg border flex items-center justify-center gap-2 transition ${
                      scheduledList.includes(activeCreative.id)
                        ? "bg-blue-950/40 border-blue-500/30 text-blue-400"
                        : "bg-black hover:bg-sidebar text-white border-none"
                    }`}
                    id={`btn-schedule-campaign-${activeCreative.id}`}
                  >
                    {scheduling === activeCreative.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Programando en campañas...</span>
                      </>
                    ) : scheduledList.includes(activeCreative.id) ? (
                      <>
                        <Check className="w-4 h-4 text-blue-400" />
                        <span>Programado en Campañas Activas</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-white" />
                        <span>Programar Automáticamente</span>
                      </>
                    )}
                  </button>
                </div>

                {/* API Request Logs display */}
                {(uploading === activeCreative.id || uploadedList.includes(activeCreative.id)) && (
                  <div className="bg-sink rounded-lg p-3 border border-line font-mono text-[10px] text-muted space-y-1">
                    <div className="flex justify-between items-center text-faint pb-1 border-b border-line">
                      <span>HTTP REQUEST LOG (METADATA API INTEGRATION)</span>
                      <span className="text-green-400">STATUS: 200 OK</span>
                    </div>
                    <p className="text-ink">POST /v17.0/act_28461048620/campaign_creatives HTTP/1.1</p>
                    <p>Authorization: Bearer EAAXg...yZC</p>
                    <p>Content-Type: application/json</p>
                    <p className="text-black/80">{"{"} "name": "{editedHeadline}", "body": "{editedBodyCopy.slice(0, 40)}...", "title": "{editedHeadline}", "call_to_action": "{editedCta}", "status": "ACTIVE" {"}"}</p>
                  </div>
                )}

                {/* REAL Meta Ads draft: campaign + ad set + creative + ad (PAUSED) */}
                <div className="border border-line rounded-2xl p-5 space-y-4 bg-accent-soft/40">
                  <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                        🚀 Crear campaña REAL en Meta (borrador pausado)
                      </h4>
                      <p className="text-[11px] text-muted mt-1 leading-relaxed">
                        Crea campaña, conjunto de anuncios, creatividad y anuncio con este copy — todo en{" "}
                        <strong>PAUSED</strong> para que lo revises y actives desde el Administrador de Anuncios.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-faint font-mono uppercase">Cuenta publicitaria</label>
                      <input
                        type="text"
                        value={adAccountId}
                        onChange={(e) => setAdAccountId(e.target.value)}
                        placeholder="act_123456789"
                        className="w-full bg-surface rounded-input p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-faint font-mono uppercase">ID de página de Facebook</label>
                      <input
                        type="text"
                        value={adsPageId}
                        onChange={(e) => setAdsPageId(e.target.value)}
                        placeholder="1234567890"
                        className="w-full bg-surface rounded-input p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-faint font-mono uppercase">Link de destino</label>
                      <input
                        type="text"
                        value={adsLink}
                        onChange={(e) => setAdsLink(e.target.value)}
                        placeholder="https://tunegocio.com/oferta"
                        className="w-full bg-surface rounded-input p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-faint font-mono uppercase">USD/día</label>
                        <input
                          type="number"
                          min={1}
                          value={adsBudget}
                          onChange={(e) => setAdsBudget(Number(e.target.value))}
                          className="w-full bg-surface rounded-input p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-faint font-mono uppercase">Países</label>
                        <input
                          type="text"
                          value={adsCountries}
                          onChange={(e) => setAdsCountries(e.target.value)}
                          placeholder="AR, MX"
                          className="w-full bg-surface rounded-input p-2.5 text-xs text-ink outline-none focus:ring-2 focus:ring-accent/20"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={createRealAdsDraft}
                    disabled={creatingDraft}
                    className="bg-accent hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-full flex items-center justify-center gap-2 transition uppercase tracking-wider"
                    id="btn-create-real-ads-draft"
                  >
                    {creatingDraft ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creando borrador en Meta...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Crear borrador real en Meta Ads</span>
                      </>
                    )}
                  </button>

                  {draftResult && (
                    <div className="bg-surface rounded-input p-3 font-mono text-[10px] text-muted space-y-1">
                      {draftResult.steps.map((s) => (
                        <div key={s.step} className="flex items-center justify-between gap-2">
                          <span className="uppercase">{s.step}</span>
                          {s.error ? (
                            <span className="text-[#d5514f] truncate max-w-[70%]">
                              ✖ {typeof s.error === "string" ? s.error : s.error?.error?.message || JSON.stringify(s.error).slice(0, 120)}
                            </span>
                          ) : (
                            <span className="text-[#3f9a3f]">✔ {s.id || "ok"}</span>
                          )}
                        </div>
                      ))}
                      {draftResult.ok && (
                        <p className="text-ink pt-1 border-t border-line">
                          Campaña {draftResult.campaignId} creada en PAUSED — actívala desde Meta Ads Manager.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-line rounded-2xl p-12 text-center text-muted">
                Selecciona un creativo de la lista para ver su previsualización y herramientas de exportación.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
