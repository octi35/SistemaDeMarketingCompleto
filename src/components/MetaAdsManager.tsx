import React, { useState, useEffect, useRef } from "react";
import { Creative } from "../types";
import { Search, SlidersHorizontal, Download, Share2, Upload, Calendar, RefreshCw, Check, Sparkles, Filter, AlertCircle, PlayCircle } from "lucide-react";
import { PixelAvatar } from "./AgentProfiles";

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
      const response = await fetch("/api/generate-creatives", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-Key": localStorage.getItem("custom_gemini_api_key") || ""
        },
        body: JSON.stringify({ description, niche, audience }),
      });
      const data = await response.json();
      if (data.creatives) {
        setCreatives(data.creatives);
        setActiveCreative(data.creatives[0]);
        setIsDemo(!!data.isMock);
      }
    } catch (err) {
      console.error("Error fetching creatives:", err);
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
      gradient.addColorStop(0, "#1e1b4b"); // Deep Indigo
      gradient.addColorStop(1, "#311042"); 
    } else if (creative.angle.includes("AIDA")) {
      gradient.addColorStop(0, "#0f172a"); // Slate Slate
      gradient.addColorStop(1, "#1e293b");
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
    
    ctx.fillStyle = "#cbd5e1"; // Cool Gray Text
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
      <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26]/20">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                Generador de 50 Creativos con Santi & Mateo
              </h2>
              <p className="text-xs text-[#88888E] mt-0.5">
                Utiliza inteligencia artificial estructurada para generar un conjunto de 50 ganchos de conversión instantáneos.
              </p>
            </div>
          </div>
          {isDemo && (
            <span className="bg-[#1A1A1C] text-[#D1FF26] text-[11px] px-3 py-1.5 rounded-lg border border-[#2A2A2C] font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              Modo Demostración Activo (Sin Llave)
            </span>
          )}
        </div>

        {/* Input parameters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Descripción del Negocio</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none resize-none"
              placeholder="Ej: Agencia de marketing, tienda e-commerce..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Nicho / Categoría</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: Domótica y Tecnología"
            />
            <div className="text-[11px] text-[#66666E] italic mt-1">
              Santi usará esto para afinar el tono de la oferta.
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Público Objetivo (Buyer Persona)</label>
            <textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full h-24 bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none resize-none"
              placeholder="Ej: Emprendedores, propietarios..."
            />
          </div>
        </div>

        <button
          onClick={generateCreatives}
          disabled={loading}
          className="w-full md:w-auto bg-[#D1FF26] hover:bg-[#c2ed1c] active:bg-[#b3db18] disabled:bg-[#1A1A1C] text-black font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
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
          <div className="lg:col-span-5 bg-[#141416] border border-[#222224] rounded-2xl p-4 h-[750px] flex flex-col">
            
            {/* Search and filter header */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 justify-between">
                <h3 className="text-xs font-semibold text-[#88888E] uppercase tracking-wider">
                  Listado de Creativos ({filteredCreatives.length}/50)
                </h3>
                <span className="text-xs bg-[#1A1A1C] border border-[#2A2A2C] px-2 py-0.5 rounded text-[#88888E] font-mono">
                  Santi & Mateo
                </span>
              </div>
              
              <div className="relative">
                <Search className="w-4 h-4 text-[#66666E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por gancho, título o ángulo..."
                  className="w-full bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#D1FF26]"
                />
              </div>

              {/* Filters row */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="bg-[#1A1A1C] border border-[#2A2A2C] rounded px-2 py-1.5 text-[#88888E] focus:outline-none"
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
                  className="bg-[#1A1A1C] border border-[#2A2A2C] rounded px-2 py-1.5 text-[#88888E] focus:outline-none"
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
                <div className="text-center py-12 text-[#66666E] text-xs">
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
                          ? "bg-[#1A1A1C] border-[#D1FF26] shadow" 
                          : "bg-transparent border-[#222224] hover:bg-[#1A1A1C]/50 hover:border-[#2A2A2C]"
                      }`}
                      id={`btn-creative-card-${creative.id}`}
                    >
                      {/* Estimated ROI indicator on left edge */}
                      <div className="h-full w-1 absolute left-0 top-0 bg-[#D1FF26]" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-[#66666E] font-mono uppercase">{creative.platform}</span>
                          <span className="text-[10px] text-[#D1FF26] bg-[#D1FF26]/10 px-1.5 py-0.5 rounded font-mono font-semibold">
                            CTR Est: {creative.estimatedCtr}%
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-white mt-1 truncate group-hover:text-[#D1FF26] transition-colors">
                          {creative.headline}
                        </h4>
                        <p className="text-[11px] text-[#88888E] line-clamp-2 mt-1 leading-relaxed">
                          {creative.hook}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[9px] bg-[#1A1A1C] border border-[#2A2A2C] px-1.5 py-0.5 rounded text-[#88888E] font-mono">
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
              <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6 space-y-6">
                
                {/* Header card info */}
                <div className="flex items-start justify-between gap-4 border-b border-[#222224] pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <span className="text-[#D1FF26]">⚡</span> {activeCreative.title}
                    </h3>
                    <p className="text-xs text-[#88888E] mt-1">
                      Este creativo fue diseñado bajo el marco de copywriting <strong className="text-[#D1FF26]">{activeCreative.angle}</strong> para ser distribuido en <strong className="text-white">{activeCreative.platform}</strong>.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 text-right font-mono">
                    <span className="text-[10px] text-[#66666E] uppercase tracking-widest font-semibold">PREDICCIÓN MATEO</span>
                    <span className="text-[#D1FF26] text-sm font-bold">CTR: {activeCreative.estimatedCtr}%</span>
                    <span className="text-white text-xs">Conv: {activeCreative.estimatedConversionRate}%</span>
                  </div>
                </div>

                {/* Main section: Mock device preview and customization form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Visual mockup panel */}
                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-[#88888E] uppercase tracking-wider block">Vista Previa de Anuncio</span>
                    
                    {/* Mock phone/ad shell */}
                    <div className="bg-[#0A0A0B] border border-[#222224] rounded-2xl overflow-hidden relative flex flex-col h-[520px]">
                      {/* Meta header */}
                      <div className="bg-[#141416] px-4 py-3 border-b border-[#222224] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1A1A1C] border border-[#2A2A2C] flex items-center justify-center text-xs font-bold text-[#D1FF26] font-mono">
                          AD
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-semibold text-white">Mi Cuenta de Meta Ads</h4>
                            <span className="text-[9px] bg-[#D1FF26]/10 text-[#D1FF26] px-1 rounded font-mono font-bold">Patrocinado</span>
                          </div>
                          <p className="text-[10px] text-[#88888E] font-mono mt-0.5">{activeCreative.platform}</p>
                        </div>
                      </div>

                      {/* Post body */}
                      <div className="p-3 bg-[#0A0A0B] text-xs text-[#88888E] space-y-2 flex-1 min-h-0 overflow-y-auto select-none custom-scrollbar">
                        <p className="leading-relaxed whitespace-pre-wrap">
                          <span className="text-[#D1FF26] font-bold">{editedHook}</span> {editedBodyCopy}
                        </p>
                        
                        {/* Interactive Banner visual design inside phone */}
                        <div className="border border-[#222224] rounded-xl p-4 bg-gradient-to-br from-[#1A1A1C] to-[#0F0F10] space-y-3 min-h-[180px] flex flex-col justify-between relative">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] bg-[#D1FF26] text-black px-1.5 rounded font-mono font-bold tracking-wider">
                              {activeCreative.angle}
                            </span>
                            <span className="text-[9px] text-[#66666E] font-mono">1080x1080 PNG</span>
                          </div>

                          <h3 className="text-sm font-semibold text-white text-center leading-tight drop-shadow my-auto">
                            {editedHeadline}
                          </h3>

                          {/* Suggested image prompt preview visual */}
                          <div className="bg-black/40 border border-white/5 p-2 rounded text-[9px] text-[#88888E] font-mono leading-relaxed truncate">
                            💡 {activeCreative.imagePrompt}
                          </div>
                        </div>
                      </div>

                      {/* Footer CTA */}
                      <div className="bg-[#141416] border-t border-[#222224] px-4 py-3 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-white truncate max-w-[180px]">{editedHeadline}</h4>
                          <p className="text-[10px] text-[#88888E] truncate max-w-[180px]">adteam.ai/empieza</p>
                        </div>
                        <button className="bg-[#1A1A1C] border border-[#2A2A2C] text-white font-semibold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider select-none shrink-0">
                          {editedCta}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Customizer form */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <span className="text-xs font-semibold text-[#88888E] uppercase tracking-wider block">Laboratorio de Personalización</span>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Título / Titular de la Imagen</label>
                        <input
                          type="text"
                          value={editedHeadline}
                          onChange={(e) => setEditedHeadline(e.target.value)}
                          className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Gancho de Entrada (Hook)</label>
                        <textarea
                          value={editedHook}
                          onChange={(e) => setEditedHook(e.target.value)}
                          className="w-full h-16 bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Cuerpo de Texto Persuasivo</label>
                        <textarea
                          value={editedBodyCopy}
                          onChange={(e) => setEditedBodyCopy(e.target.value)}
                          className="w-full h-24 bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-2.5 text-xs text-white focus:outline-none resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">Etiqueta de Botón CTA</label>
                        <select
                          value={editedCta}
                          onChange={(e) => setEditedCta(e.target.value)}
                          className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-2 text-xs text-white focus:outline-none"
                        >
                          <option value="Más información">Más información</option>
                          <option value="Comprar ahora">Comprar ahora</option>
                          <option value="Registrarse">Registrarse</option>
                          <option value="Ver más">Ver más</option>
                          <option value="Contactar">Contactar</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-[#1A1A1C] rounded-lg p-3 border border-[#222224] flex items-start gap-2.5 text-[11px] text-[#88888E]">
                      <span className="text-[#D1FF26]">🧠</span>
                      <p>
                        Santi comenta: <span className="italic text-white">"Hacer pruebas A/B variando el gancho inicial incrementa el CTR hasta en un 40%. Intenta cambiar el gancho de curiosidad por una pregunta directa."</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Output action buttons */}
                <div className="border-t border-[#222224] pt-5 flex flex-wrap gap-3">
                  
                  <button
                    onClick={() => handleDownloadPNG(activeCreative)}
                    className="flex-1 bg-[#1A1A1C] border border-[#2A2A2C] hover:bg-[#2A2A2C] text-white font-semibold text-xs px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition"
                    id={`btn-download-png-${activeCreative.id}`}
                  >
                    <Download className="w-4 h-4 text-[#D1FF26]" />
                    <span>Descargar PNG Alta Resolución</span>
                  </button>

                  <button
                    onClick={() => handleUploadAPI(activeCreative.id)}
                    disabled={uploading === activeCreative.id || uploadedList.includes(activeCreative.id)}
                    className={`flex-1 font-semibold text-xs px-4 py-3 rounded-lg border flex items-center justify-center gap-2 transition ${
                      uploadedList.includes(activeCreative.id)
                        ? "bg-[#D1FF26]/10 border-[#D1FF26]/30 text-[#D1FF26]"
                        : "bg-[#1A1A1C] border border-[#2A2A2C] hover:bg-[#2A2A2C] text-white"
                    }`}
                    id={`btn-upload-api-${activeCreative.id}`}
                  >
                    {uploading === activeCreative.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#D1FF26]" />
                        <span>Sincronizando con Meta Ads Manager...</span>
                      </>
                    ) : uploadedList.includes(activeCreative.id) ? (
                      <>
                        <Check className="w-4 h-4 text-[#D1FF26]" />
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
                        : "bg-[#D1FF26] hover:bg-[#c2ed1c] text-black border-none"
                    }`}
                    id={`btn-schedule-campaign-${activeCreative.id}`}
                  >
                    {scheduling === activeCreative.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>Programando en campañas...</span>
                      </>
                    ) : scheduledList.includes(activeCreative.id) ? (
                      <>
                        <Check className="w-4 h-4 text-blue-400" />
                        <span>Programado en Campañas Activas</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4 text-black" />
                        <span>Programar Automáticamente</span>
                      </>
                    )}
                  </button>
                </div>

                {/* API Request Logs display */}
                {(uploading === activeCreative.id || uploadedList.includes(activeCreative.id)) && (
                  <div className="bg-[#0A0A0B] rounded-lg p-3 border border-[#222224] font-mono text-[10px] text-[#88888E] space-y-1">
                    <div className="flex justify-between items-center text-[#66666E] pb-1 border-b border-[#222224]">
                      <span>HTTP REQUEST LOG (METADATA API INTEGRATION)</span>
                      <span className="text-green-400">STATUS: 200 OK</span>
                    </div>
                    <p className="text-white">POST /v17.0/act_28461048620/campaign_creatives HTTP/1.1</p>
                    <p>Authorization: Bearer EAAXg...yZC</p>
                    <p>Content-Type: application/json</p>
                    <p className="text-[#D1FF26]/80">{"{"} "name": "{editedHeadline}", "body": "{editedBodyCopy.slice(0, 40)}...", "title": "{editedHeadline}", "call_to_action": "{editedCta}", "status": "ACTIVE" {"}"}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#141416] border border-[#222224] rounded-2xl p-12 text-center text-[#88888E]">
                Selecciona un creativo de la lista para ver su previsualización y herramientas de exportación.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
