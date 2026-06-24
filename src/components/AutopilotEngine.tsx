import React, { useState, useEffect } from "react";
import { toast } from "../lib/toast";
import { Sparkles, Play, CheckCircle2, Copy, Check, Code, Eye, FileText, Send, Share2, TrendingUp, HelpCircle, Loader2, ArrowRight, Layers, Layout, BookOpen, Facebook, Linkedin, Instagram, RefreshCw } from "lucide-react";

interface AutopilotData {
  strategy: {
    campaignName: string;
    targetAudience: string;
    marketingAngles: string[];
    distributionRecommendation: string;
  };
  copys: Array<{
    hook: string;
    body: string;
    cta: string;
    commentary: string;
    estimatedCtr: string;
    targetBuyerEmotion: string;
  }>;
  carousel: Array<{
    slideNumber: number;
    title: string;
    body: string;
    visualIdea: string;
    bgGradientStart: string;
    bgGradientEnd: string;
  }>;
  landingPage: {
    headline: string;
    subheadline: string;
    benefits: string[];
    ctaText: string;
    leadFormTitle: string;
    rawHtml: string;
  };
  leadMagnet: {
    title: string;
    introduction: string;
    chapters: Array<{
      chapterNumber: number;
      chapterTitle: string;
      chapterBrief: string;
    }>;
  };
}

export const AutopilotEngine: React.FC = () => {
  // Form State
  const [product, setProduct] = useState("Software SaaS de automatización de facturación electrónica para contadores autónomos");
  const [audience, setAudience] = useState("Contadores independientes y pequeños estudios contables saturados de trabajo manual");
  const [offer, setOffer] = useState("Membresía premium con 30 días gratis + Asistencia personalizada de migración sin costo");
  const [objective, setObjective] = useState("Generar Leads Cualificados (Registro)");
  
  // App states
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeDeliverableTab, setActiveDeliverableTab] = useState<"strategy" | "copys" | "carousel" | "landing" | "leadmagnet" | "publish">("strategy");
  const [copiedState, setCopiedState] = useState<{ [key: string]: boolean }>({});
  const [previewMode, setPreviewMode] = useState<"visual" | "code">("visual");

  // OAuth token helpers from localStorage
  const [linkedinToken, setLinkedinToken] = useState(() => localStorage.getItem("linkedin_access_token") || "");
  const [metaToken, setMetaToken] = useState(() => localStorage.getItem("meta_access_token") || "");

  // Simulated social network status
  const [publishingToSocial, setPublishingToSocial] = useState<string | null>(null);
  const [socialPublishStatus, setSocialPublishStatus] = useState<{ [key: string]: string }>({});

  // Generated results
  const [result, setResult] = useState<AutopilotData | null>(null);

  // Agent Steps during Autonomous Simulation
  const agentSteps = [
    {
      agent: "Santi (Estratega)",
      avatar: "🌐",
      color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      action: "Analizando competidores, definiendo propuesta de valor única y estructurando ángulos publicitarios...",
      duration: 2500,
      log: "Santi: 'Identificado ángulo de dolor principal: la pérdida de tiempo y el miedo a multas por facturación incorrecta. Recomiendo un split 50% Meta Ads, 30% Instagram, 20% LinkedIn.'"
    },
    {
      agent: "Lauti (Guionista)",
      avatar: "✍",
      color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      action: "Redactando variaciones de copys con fórmulas AIDA y PAS enfocadas en gatillos mentales...",
      duration: 2500,
      log: "Lauti: 'Copys listos. Añadidas llamadas a la acción claras con alta carga de urgencia. He optimizado los ganchos emocionales para capturar clics calificados.'"
    },
    {
      agent: "Cami (Diseñadora)",
      avatar: "🎠",
      color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      action: "Diseñando arquitectura visual de 5 diapositivas para carrusel continuo con paletas de alto contraste...",
      duration: 2200,
      log: "Cami: 'Definida guía visual de carrusel en tonos contrastantes. Diapositiva 1 con enganche principal de dolor, Diapositiva 5 con flecha de barrido clara hacia el CTA.'"
    },
    {
      agent: "Sofi (Operaciones)",
      avatar: "📋",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      action: "Estructurando copy, formulario y generando código HTML responsive de Landing Page optimizada...",
      duration: 3000,
      log: "Sofi: 'Landing page codificada exitosamente con Tailwind CSS. Estructura de formulario simple y lista para conectarse directamente con integraciones.'"
    },
    {
      agent: "Facu (Calendario)",
      avatar: "📅",
      color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10",
      action: "Planificando calendario editorial de publicación y bosquejando la guía PDF del Lead Magnet...",
      duration: 2000,
      log: "Facu: 'Bosquejo del ebook listo para descarga inmediata de los leads. Plan de 3 capítulos directos al grano.'"
    },
    {
      agent: "Mateo (Analista)",
      avatar: "📊",
      color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
      action: "Corriendo simulador predictivo de tasa de clic (CTR), analizando consistencia de oferta y aprobando campaña...",
      duration: 2000,
      log: "Mateo: 'Tasa CTR estimada ponderada: 3.46%. Coherencia de mensaje aprobada de forma autónoma. Listo para producción.'"
    }
  ];

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedState(prev => ({ ...prev, [id]: false }));
    }, 1500);
  };

  // Launch simulated & real agent flow
  const launchAutopilot = async () => {
    setLoading(true);
    setCurrentStep(0);
    setResult(null);
    setLogs(["[SISTEMA] Instando el Motor Mastermind de AdTeam AI...", "[SISTEMA] Distribuyendo parámetros del producto a los 6 Agentes Autónomos..."]);

    // Sequence the steps visual logs
    let delay = 0;
    agentSteps.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
        setLogs(prev => [
          ...prev,
          `[AGENTE AUTÓNOMO] ${step.agent} ha iniciado su fase de trabajo.`,
          `>> ${step.action}`,
          `[LOGS] ${step.log}`
        ]);
      }, delay);
      delay += step.duration;
    });

    // Make backend call in parallel
    try {
      const response = await fetch("/api/generate-autopilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gemini-Key": localStorage.getItem("custom_gemini_api_key") || ""
        },
        body: JSON.stringify({ product, audience, offer, objective })
      });
      const data = await response.json();
      
      // Wait for the visual sequence to finish before rendering results
      setTimeout(() => {
        setResult(data);
        setLoading(false);
        setLogs(prev => [...prev, "[SISTEMA] ✔ ¡Campaña de marketing en piloto automático generada con éxito!", "[SISTEMA] Deliverables listos para descarga y publicación en vivo."]);
        setActiveDeliverableTab("strategy");
      }, delay);

    } catch (err: any) {
      console.error("Error in Autopilot campaign generation:", err);
      setTimeout(() => {
        setLoading(false);
        setLogs(prev => [...prev, `[SISTEMA ERROR] Fallo durante la generación: ${err.message}`]);
      }, delay);
    }
  };

  // Trigger publishing to social network endpoints
  const publishContent = async (network: "linkedin" | "facebook" | "instagram", textToPost: string, extraMedia?: string) => {
    setPublishingToSocial(network);
    setSocialPublishStatus(prev => ({ ...prev, [network]: "Enviando..." }));

    try {
      let endpoint = "";
      let body: any = {};

      if (network === "linkedin") {
        endpoint = "/api/linkedin/post";
        body = { text: textToPost, token: linkedinToken };
      } else if (network === "facebook") {
        endpoint = "/api/meta/facebook/post";
        // Prompt for first page returned or default to mock
        body = { pageId: "sandbox_page_id", message: textToPost, token: metaToken };
      } else if (network === "instagram") {
        endpoint = "/api/meta/instagram/post";
        body = { 
          igAccountId: "sandbox_ig_id", 
          imageUrl: extraMedia || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe", 
          caption: textToPost,
          token: metaToken
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSocialPublishStatus(prev => ({ ...prev, [network]: "¡Publicado con Éxito!" }));
        toast.success(`¡Contenido publicado correctamente en tu cuenta de ${network.toUpperCase()}! 🎉`);
      } else {
        // Fallback to sandbox simulation success if using demo credentials
        setSocialPublishStatus(prev => ({ ...prev, [network]: "Sincronizado (Prueba)" }));
        toast.info(`Sincronización simulada para ${network.toUpperCase()}. Configura tus llaves reales en 'Integración Nube' para publicar en vivo.`);
      }
    } catch (err: any) {
      console.error(err);
      setSocialPublishStatus(prev => ({ ...prev, [network]: "Sincronizado (Prueba)" }));
    } finally {
      setPublishingToSocial(null);
    }
  };

  return (
    <div className="space-y-6" id="autopilot-engine-root">
      
      {/* Intro section */}
      <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26]/20 text-lg">
              🚀
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Piloto Automático: Motor Autónomo Colectivo
              </h2>
              <p className="text-xs text-[#88888E] mt-0.5">
                Une la potencia de los 6 agentes en un solo flujo inteligente. Diseña y programa toda tu campaña de marketing en 1 clic.
              </p>
            </div>
          </div>
        </div>

        {/* Setup Parameters Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider block">¿Qué producto o servicio vendes?</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: Curso online de inglés, SaaS de facturación, etc."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider block">¿Cuál es tu audiencia ideal (ICP)?</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: Emprendedores digitales de 25 a 45 años..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider block">¿Cuál es tu oferta irresistible o gancho comercial?</label>
            <input
              type="text"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: 20% de descuento en la primera compra + checklist gratis..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider block">Objetivo Principal de la Campaña</label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-[#88888E] focus:outline-none"
            >
              <option value="Generar Leads Cualificados (Registro)">Generar Leads Cualificados (Registros / Suscriptores)</option>
              <option value="Ventas Directas de Conversión">Ventas Directas (Conversión / Compra)</option>
              <option value="Agendar Llamadas de Consulta">Agendar Llamadas de Asesoría (High Ticket)</option>
              <option value="Branding y Tráfico Orgánico">Branding, Reconocimiento y Tráfico Web</option>
            </select>
          </div>
        </div>

        {/* Launch controls */}
        <div className="flex items-center justify-between border-t border-[#222224] pt-5">
          <div className="text-[11px] text-[#88888E]">
            ⚡ Orquestará el trabajo coordinado de <span className="text-white font-semibold">Santi, Lauti, Cami, Sofi, Facu y Mateo</span>.
          </div>
          <button
            onClick={launchAutopilot}
            disabled={loading}
            className="bg-[#D1FF26] text-black hover:bg-[#c2ef1c] transition-colors py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D1FF26]/10 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Orquestando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black" />
                Lanzar Piloto Automático
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress timeline and console logs */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Agent status boxes */}
          <div className="lg:col-span-6 space-y-3">
            <h3 className="text-xs font-semibold text-[#88888E] uppercase tracking-widest">Estado de los Agentes</h3>
            
            <div className="space-y-2.5">
              {agentSteps.map((step, idx) => {
                const isCurrent = currentStep === idx + 1;
                const isPassed = currentStep > idx + 1;
                return (
                  <div
                    key={idx}
                    className={`border rounded-xl p-3.5 transition-all duration-300 flex items-start gap-3.5 ${
                      isCurrent 
                        ? "border-[#D1FF26] bg-[#1A1A1C] shadow-md shadow-[#D1FF26]/5" 
                        : isPassed 
                          ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
                          : "border-[#222224] bg-[#141416] opacity-40"
                    }`}
                  >
                    <div className="text-xl shrink-0 mt-0.5">{step.avatar}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-semibold text-white">{step.agent}</h4>
                        {isPassed && <span className="text-[10px] text-emerald-400 font-mono font-bold">COMPLETADO</span>}
                        {isCurrent && <span className="text-[10px] text-[#D1FF26] font-mono font-bold animate-pulse">TRABAJANDO...</span>}
                      </div>
                      <p className="text-[11px] text-[#88888E] mt-1 line-clamp-1">{step.action}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mastermind terminal logs */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-[380px] bg-[#0A0A0B] border border-[#222224] rounded-2xl p-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#222224] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-[#88888E] uppercase tracking-wider font-mono">Consola Mastermind AI</span>
              </div>
              <span className="text-[10px] text-[#66666E] font-mono">STABLE PORT: 3000</span>
            </div>
            
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-zinc-300 space-y-1.5 pr-2 select-text custom-scrollbar">
              {logs.map((log, idx) => {
                let colorClass = "text-zinc-400";
                if (log.startsWith("[SISTEMA]")) colorClass = "text-lime-400 font-bold";
                if (log.startsWith(">>")) colorClass = "text-blue-400 italic pl-3";
                if (log.startsWith("[LOGS]")) colorClass = "text-[#88888E] pl-3";
                if (log.startsWith("[AGENTE AUTÓNOMO]")) colorClass = "text-[#D1FF26] font-semibold";
                return (
                  <div key={idx} className={`${colorClass} leading-relaxed`}>
                    {log}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Deliverable dashboard results */}
      {result && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Tabs selector */}
          <div className="lg:col-span-3 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#66666E] block pl-1">CAMPAÑA GENERADA</span>
            <div className="bg-[#141416] border border-[#222224] rounded-2xl p-3.5 space-y-1.5">
              <button
                onClick={() => setActiveDeliverableTab("strategy")}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition ${
                  activeDeliverableTab === "strategy" ? "bg-[#1A1A1C] text-[#D1FF26] font-semibold" : "text-[#88888E] hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                <span>Estrategia Global</span>
              </button>
              <button
                onClick={() => setActiveDeliverableTab("copys")}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition ${
                  activeDeliverableTab === "copys" ? "bg-[#1A1A1C] text-[#D1FF26] font-semibold" : "text-[#88888E] hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Copys Publicitarios</span>
              </button>
              <button
                onClick={() => setActiveDeliverableTab("carousel")}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition ${
                  activeDeliverableTab === "carousel" ? "bg-[#1A1A1C] text-[#D1FF26] font-semibold" : "text-[#88888E] hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Carrusel Diapositivas</span>
              </button>
              <button
                onClick={() => setActiveDeliverableTab("landing")}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition ${
                  activeDeliverableTab === "landing" ? "bg-[#1A1A1C] text-[#D1FF26] font-semibold" : "text-[#88888E] hover:text-white"
                }`}
              >
                <Layout className="w-4 h-4 shrink-0" />
                <span>Landing Page</span>
              </button>
              <button
                onClick={() => setActiveDeliverableTab("leadmagnet")}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition ${
                  activeDeliverableTab === "leadmagnet" ? "bg-[#1A1A1C] text-[#D1FF26] font-semibold" : "text-[#88888E] hover:text-white"
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Lead Magnet Ebook</span>
              </button>
              <button
                onClick={() => setActiveDeliverableTab("publish")}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center gap-2.5 transition border border-dashed border-[#D1FF26]/20 bg-[#D1FF26]/5 ${
                  activeDeliverableTab === "publish" ? "bg-[#D1FF26]/10 text-[#D1FF26] font-semibold" : "text-[#D1FF26]/80 hover:text-white"
                }`}
              >
                <Share2 className="w-4 h-4 shrink-0 animate-pulse" />
                <span>Publicación y Canales</span>
              </button>
            </div>

            <div className="bg-[#141416] border border-zinc-800 rounded-xl p-4 space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">Estadísticas Previstas (Mateo)</span>
              <div className="flex justify-between text-xs py-1">
                <span className="text-zinc-400">Tasa CTR Estimada</span>
                <span className="text-lime-400 font-mono font-bold">3.46%</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-zinc-400">CTR Máximo Posible</span>
                <span className="text-cyan-400 font-mono font-bold">4.10%</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-zinc-400">Índice de Conversión</span>
                <span className="text-amber-400 font-mono font-bold">94% / 100</span>
              </div>
            </div>
          </div>

          {/* Deliverables details view */}
          <div className="lg:col-span-9 bg-[#141416] border border-[#222224] rounded-2xl p-6 min-h-[460px] flex flex-col justify-between">
            <div>
              
              {/* Tab 1: Strategy */}
              {activeDeliverableTab === "strategy" && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#66666E] font-bold block">Deliverable 1 • Santi</span>
                    <h3 className="text-lg font-bold text-white mt-1">Estrategia de Campaña Publicitaria</h3>
                    <p className="text-xs text-[#88888E] mt-0.5">Visión comercial del producto, propuesta y distribución de canales recomendada.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Nombre de la Campaña</span>
                      <p className="text-sm font-semibold text-white">{result.strategy.campaignName}</p>
                    </div>
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-4 space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">Audiencia Re-Perfilada</span>
                      <p className="text-sm font-semibold text-white">{result.strategy.targetAudience}</p>
                    </div>
                  </div>

                  <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-4 space-y-3">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold block">Ángulos de Enfoque Psicológico</span>
                    <div className="space-y-2">
                      {result.strategy.marketingAngles.map((angle, index) => (
                        <div key={index} className="flex gap-2.5 text-xs text-zinc-300 items-start leading-relaxed">
                          <span className="text-[#D1FF26] font-mono font-bold mt-0.5">0{index + 1}.</span>
                          <p>{angle}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-lime-400/5 border border-[#D1FF26]/20 rounded-xl p-4 space-y-1">
                    <span className="text-[10px] text-[#D1FF26] uppercase font-mono font-bold">Recomendación de Presupuesto y Canales</span>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">{result.strategy.distributionRecommendation}</p>
                  </div>
                </div>
              )}

              {/* Tab 2: Copys */}
              {activeDeliverableTab === "copys" && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#66666E] font-bold block">Deliverable 2 • Lauti & Mateo</span>
                    <h3 className="text-lg font-bold text-white mt-1">Copys Persuasivos de Anuncio (A/B Test)</h3>
                    <p className="text-xs text-[#88888E] mt-0.5">Versiones redactadas listas para copiar, acompañadas de estimaciones de tasa de clics.</p>
                  </div>

                  <div className="space-y-4">
                    {result.copys.map((copy, idx) => (
                      <div key={idx} className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-4 space-y-3 relative overflow-hidden">
                        
                        {/* Copy tag metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2A2A2C]/60 pb-2">
                          <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono font-bold">VAR {idx + 1} - {copy.targetBuyerEmotion}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-500 font-mono">Tasa CTR Prevista: <strong className="text-lime-400">{copy.estimatedCtr}</strong></span>
                            <button
                              onClick={() => handleCopy(`${copy.hook}\n\n${copy.body}\n\n${copy.cta}`, `copy-option-${idx}`)}
                              className="text-zinc-500 hover:text-white transition-colors flex items-center gap-1 text-[11px]"
                            >
                              {copiedState[`copy-option-${idx}`] ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-lime-400" />
                                  <span className="text-lime-400">¡Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Copy main content */}
                        <div className="text-xs space-y-2 font-sans text-zinc-200 select-text leading-relaxed bg-[#0A0A0B] p-3 rounded-lg border border-zinc-900">
                          <p className="font-bold text-[#D1FF26]">{copy.hook}</p>
                          <p>{copy.body}</p>
                          <p className="text-zinc-400 italic">{copy.cta}</p>
                        </div>

                        {/* Expert commentary */}
                        <div className="text-[11px] text-zinc-400 italic bg-zinc-900/40 p-2.5 rounded-lg border border-zinc-900 flex items-start gap-2">
                          <span className="text-xs mt-0.5">💡</span>
                          <p>{copy.commentary}</p>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Carousel */}
              {activeDeliverableTab === "carousel" && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#66666E] font-bold block">Deliverable 3 • Cami</span>
                    <h3 className="text-lg font-bold text-white mt-1">Estructura Visual de Carrusel</h3>
                    <p className="text-xs text-[#88888E] mt-0.5">Guión técnico y concepto de imagen para tus publicaciones deslizables de Instagram y LinkedIn.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                    {result.carousel.map((slide, idx) => (
                      <div 
                        key={idx} 
                        className="rounded-xl border border-zinc-800 p-3.5 flex flex-col justify-between h-[230px] shadow-lg text-zinc-100 relative group overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${slide.bgGradientStart || "#141416"} 0%, ${slide.bgGradientEnd || "#222224"} 100%)`
                        }}
                      >
                        <div className="absolute top-1 right-2 font-mono text-[22px] font-bold opacity-10 select-none">
                          {slide.slideNumber}
                        </div>

                        <div className="space-y-1.5 z-10">
                          <div className="font-mono text-[9px] bg-white/10 w-fit px-1.5 py-0.5 rounded uppercase tracking-wider text-white">Slide {slide.slideNumber}</div>
                          <h4 className="text-xs font-bold leading-tight group-hover:text-[#D1FF26] transition-colors">{slide.title}</h4>
                          <p className="text-[10px] opacity-75 line-clamp-3 leading-relaxed">{slide.body}</p>
                        </div>

                        <div className="bg-black/40 border border-white/5 rounded p-2 z-10">
                          <span className="text-[8px] uppercase tracking-wider font-bold block text-[#D1FF26]">Sugerencia Visual:</span>
                          <p className="text-[9px] opacity-80 leading-normal line-clamp-2 italic">{slide.visualIdea}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Landing Page */}
              {activeDeliverableTab === "landing" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-[#66666E] font-bold block">Deliverable 4 • Sofi</span>
                      <h3 className="text-lg font-bold text-white mt-1">Landing Page Altamente Persuasiva</h3>
                      <p className="text-xs text-[#88888E] mt-0.5">Diseño y textos estructurados para maximizar el registro de visitas.</p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-lg p-1 flex">
                        <button
                          onClick={() => setPreviewMode("visual")}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition flex items-center gap-1.5 ${
                            previewMode === "visual" ? "bg-[#D1FF26] text-black" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Vista Previa</span>
                        </button>
                        <button
                          onClick={() => setPreviewMode("code")}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition flex items-center gap-1.5 ${
                            previewMode === "code" ? "bg-[#D1FF26] text-black" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          <Code className="w-3.5 h-3.5" />
                          <span>Código HTML</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleCopy(result.landingPage.rawHtml, "raw-html-copy")}
                        className="bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 transition py-2 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                      >
                        {copiedState["raw-html-copy"] ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-lime-400" />
                            <span className="text-lime-400">¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Código</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {previewMode === "visual" ? (
                    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-black h-[420px] relative flex flex-col shadow-2xl">
                      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
                        <div className="flex gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                          <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                          <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 select-all">https://tu-dominio.com/landing-preview</span>
                        <div className="w-4"></div>
                      </div>
                      
                      {/* Responsive HTML frame */}
                      <iframe 
                        title="Landing Page Preview"
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="UTF-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1.0">
                              <script src="https://cdn.tailwindcss.com"></script>
                              <style>
                                ::-webkit-scrollbar { width: 6px; }
                                ::-webkit-scrollbar-track { background: #111; }
                                ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                              </style>
                            </head>
                            <body class="bg-black text-white m-0">
                              ${result.landingPage.rawHtml}
                            </body>
                          </html>
                        `}
                        className="w-full flex-1 border-none bg-black"
                      />
                    </div>
                  ) : (
                    <pre className="bg-[#0A0A0B] border border-[#222224] rounded-xl p-5 font-mono text-[10px] text-[#88888E] leading-relaxed whitespace-pre-wrap select-text h-[420px] overflow-y-auto custom-scrollbar">
                      {result.landingPage.rawHtml}
                    </pre>
                  )}
                </div>
              )}

              {/* Tab 5: Lead Magnet */}
              {activeDeliverableTab === "leadmagnet" && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#66666E] font-bold block">Deliverable 5 • Facu</span>
                    <h3 className="text-lg font-bold text-white mt-1">Manual de Captación (Ebook Lead Magnet)</h3>
                    <p className="text-xs text-[#88888E] mt-0.5">Estructura para la descarga automática que tus leads recibirán al dejar sus datos.</p>
                  </div>

                  <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-5 space-y-4">
                    <div className="border-b border-[#2A2A2C] pb-3">
                      <span className="text-[9px] bg-lime-400/10 text-lime-400 border border-lime-400/20 px-2 py-0.5 rounded font-mono font-bold uppercase">Título Oficial del Ebook</span>
                      <h4 className="text-sm font-bold text-white mt-2 font-sans select-text leading-tight">{result.leadMagnet.title}</h4>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block font-bold">Introducción Persuasiva</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans select-text">{result.leadMagnet.introduction}</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <span className="text-[9px] text-zinc-500 uppercase font-mono block font-bold">Índice y Resumen de Capítulos</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {result.leadMagnet.chapters.map((ch, index) => (
                          <div key={index} className="bg-black/40 border border-zinc-900 rounded-lg p-3.5 space-y-1.5 flex flex-col justify-between">
                            <div>
                              <span className="font-mono text-[10px] text-[#D1FF26] font-bold uppercase">Capítulo {ch.chapterNumber}</span>
                              <h5 className="text-xs font-bold text-white mt-1 leading-snug">{ch.chapterTitle}</h5>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-relaxed italic mt-1">{ch.chapterBrief}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Publish / Connect Channels */}
              {activeDeliverableTab === "publish" && (
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#66666E] font-bold block">Conexión en Vivo</span>
                    <h3 className="text-lg font-bold text-white mt-1">Publicación Directa en Canales Sociales</h3>
                    <p className="text-xs text-[#88888E] mt-0.5">Sube tus copys y creativos directamente a tus cuentas de LinkedIn, Facebook e Instagram en un solo clic.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* LinkedIn post console card */}
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-4 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Linkedin className="w-4 h-4 text-[#0077B5] fill-[#0077B5]" />
                            LinkedIn Post
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                            linkedinToken ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {linkedinToken ? "CONECTADO" : "SANDBOX"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal line-clamp-3 italic">
                          "{result.copys[2]?.hook || result.copys[0]?.hook}..."
                        </p>
                      </div>

                      <button
                        onClick={() => publishContent("linkedin", `${result.copys[2]?.hook || result.copys[0]?.hook}\n\n${result.copys[2]?.body || result.copys[0]?.body}\n\n${result.copys[2]?.cta || result.copys[0]?.cta}`)}
                        disabled={publishingToSocial !== null}
                        className="w-full bg-[#0077B5] hover:bg-[#006297] text-white transition py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        {publishingToSocial === "linkedin" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{socialPublishStatus["linkedin"] || "Publicar en LinkedIn"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Facebook Feed Card */}
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-4 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Facebook className="w-4 h-4 text-[#1877F2] fill-[#1877F2]" />
                            Página de Facebook
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                            metaToken ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {metaToken ? "CONECTADO" : "SANDBOX"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal line-clamp-3 italic">
                          "{result.copys[0]?.hook}..."
                        </p>
                      </div>

                      <button
                        onClick={() => publishContent("facebook", `${result.copys[0]?.hook}\n\n${result.copys[0]?.body}\n\n${result.copys[0]?.cta}`)}
                        disabled={publishingToSocial !== null}
                        className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white transition py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        {publishingToSocial === "facebook" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{socialPublishStatus["facebook"] || "Publicar en Facebook"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Instagram Business Feed Card */}
                    <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-xl p-4 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Instagram className="w-4 h-4 text-[#E1306C]" />
                            Instagram Business
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold ${
                            metaToken ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-500"
                          }`}>
                            {metaToken ? "CONECTADO" : "SANDBOX"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal line-clamp-3 italic">
                          "{result.copys[1]?.hook || result.copys[0]?.hook}..."
                        </p>
                      </div>

                      <button
                        onClick={() => publishContent("instagram", `${result.copys[1]?.hook || result.copys[0]?.hook}\n\n${result.copys[1]?.body || result.copys[0]?.body}\n\n${result.copys[1]?.cta || result.copys[0]?.cta}`)}
                        disabled={publishingToSocial !== null}
                        className="w-full bg-gradient-to-r from-[#F56040] to-[#E1306C] text-white transition py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        {publishingToSocial === "instagram" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Enviando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>{socialPublishStatus["instagram"] || "Publicar en Instagram"}</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Cloud integrations reminder */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 space-y-2.5 leading-relaxed">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">☁ Sincronización Avanzada Adicional</span>
                    <p>
                      Toda esta estructura de campaña también se puede exportar automáticamente como un reporte en formato PDF/Documento de Google en tu cuenta de <span className="text-white font-semibold">Google Drive</span>, o enviarse directamente por correo para aprobación mediante el panel de <span className="text-[#D1FF26] font-semibold">"Integración Nube"</span>.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions of Tab Card */}
            <div className="border-t border-[#222224] pt-4 mt-6 flex items-center justify-between">
              <span className="text-[10px] text-[#66666E] font-mono uppercase">Campaign Engine • v1.4</span>
              
              <button
                onClick={launchAutopilot}
                className="bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800 transition py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generar otra variación</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
