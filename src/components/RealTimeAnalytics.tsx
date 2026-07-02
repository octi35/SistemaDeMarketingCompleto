import React, { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { BarChart3, TrendingUp, Skull, RotateCcw, AlertTriangle, ArrowUpRight, ShieldCheck, Mail, Sparkles } from "lucide-react";
import { RealMetricsPanel } from "./RealMetricsPanel";

export const RealTimeAnalytics: React.FC = () => {
  // Mock interactive dates
  const [platformFilter, setPlatformFilter] = useState("all");

  // Predictive ROI Planner States
  const [budget, setBudget] = useState(1500);
  const [cpc, setCpc] = useState(0.40);
  const [ctr, setCtr] = useState(5.4);
  const [convRate, setConvRate] = useState(2.5);
  const [aov, setAov] = useState(45);

  const estimatedClicks = budget / cpc;
  const estimatedSales = estimatedClicks * (convRate / 100);
  const revenue = estimatedSales * aov;
  const roas = budget > 0 ? revenue / budget : 0;
  const cac = estimatedSales > 0 ? budget / estimatedSales : 0;

  // Formulate advice
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

  // Recharts Data 1: Over-time trend
  const dailyMetrics = [
    { name: "Día 01", MetaAds: 2.8, IG: 1.9, LinkedIn: 2.4 },
    { name: "Día 05", MetaAds: 3.2, IG: 2.1, LinkedIn: 2.5 },
    { name: "Día 10", MetaAds: 3.9, IG: 2.4, LinkedIn: 2.9 },
    { name: "Día 15", MetaAds: 4.8, IG: 3.2, LinkedIn: 3.1 },
    { name: "Día 20", MetaAds: 4.2, IG: 3.8, LinkedIn: 3.0 },
    { name: "Día 25", MetaAds: 5.1, IG: 4.1, LinkedIn: 3.5 },
    { name: "Día 30", MetaAds: 5.4, IG: 4.5, LinkedIn: 3.8 },
  ];

  // Recharts Data 2: Funnel Clicks -> conversions
  const funnelData = [
    { stage: "Impresiones", value: 125000, fill: "#312e81" },
    { stage: "Clics (CTR)", value: 6500, fill: "#1e3a8a" },
    { stage: "Leads (DM)", value: 2400, fill: "#1d4ed8" },
    { stage: "Ventas", value: 480, fill: "#3b82f6" },
  ];

  // Platform comparisons
  const platformComparison = [
    { subject: "CTR (%)", Meta: 5.4, Instagram: 4.5, LinkedIn: 3.8 },
    { subject: "Costo x Lead ($)", Meta: 1.2, Instagram: 1.8, LinkedIn: 4.5 },
    { subject: "Conversión (%)", Meta: 3.1, Instagram: 2.4, LinkedIn: 1.9 },
    { subject: "Retorno (ROI)", Meta: 4.5, Instagram: 3.8, LinkedIn: 2.9 },
    { subject: "Engagement", Meta: 2.8, Instagram: 5.2, LinkedIn: 4.1 },
  ];

  // Mateo's Hook Vault: literal repeat vs. kill
  const [hookVault, setHookVault] = useState([
    {
      id: "hk-1",
      hook: "Por esto tu competencia está vendiendo 3 veces más que vos:",
      platform: "Meta Ads Banner",
      ctr: 5.4,
      conversions: 184,
      status: "REPETIR",
      reason: "CTR superior a la media (5.4%). La premisa de ganancia competitiva resuena con pymes."
    },
    {
      id: "hk-2",
      hook: "La dura verdad que nadie te dice sobre la domótica inteligente...",
      platform: "Instagram Stories",
      ctr: 4.8,
      conversions: 122,
      status: "REPETIR",
      reason: "Involucra un alto nivel de compartidos e interacción. Excelente conversión en DM."
    },
    {
      id: "hk-3",
      hook: "Atención emprendedores: no compren domótica sin ver esto antes",
      platform: "Meta Ads Feed",
      ctr: 1.1,
      conversions: 8,
      status: "MATAR",
      reason: "CTR muy bajo (1.1%). La advertencia negativa generó rechazo en las primeras impresiones."
    },
    {
      id: "hk-4",
      hook: "Lo que desearía haber sabido de mi negocio hace un año...",
      platform: "LinkedIn Post",
      ctr: 3.9,
      conversions: 62,
      status: "REPETIR",
      reason: "Tono vulnerable/storytelling tiene alta retención. Recomendado expandir a carrusel."
    },
    {
      id: "hk-5",
      hook: "Ahorra 40% de luz con un solo clic automatizado",
      platform: "Instagram Reels",
      ctr: 1.5,
      conversions: 11,
      status: "MATAR",
      reason: "Mensaje redundante y de apariencia spammer. Las métricas de retención caen en el segundo 2."
    }
  ]);

  // Facu's DM automation funnels auditor
  const dmAutomations = [
    { trigger: "Palabra clave 'INFO'", response: "Envío automático de PDF de propuesta + link de agenda", executions: 1284, conversion: "28.4%", active: true },
    { trigger: "Palabra clave 'PRECIO'", response: "Envío de tarifas y link de pasarela Stripe / MercadoPago", executions: 942, conversion: "15.8%", active: true },
    { trigger: "Mensaje directo inicial", response: "Saludo automatizado Santi y pre-calificación en 2 preguntas", executions: 3410, conversion: "41.2%", active: true }
  ];

  // Filter hooks
  const filteredHooks = hookVault.filter((h) => platformFilter === "all" || h.platform.toLowerCase().includes(platformFilter.toLowerCase()));

  // Simulated email report state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendEmailReport = () => {
    setSendingEmail(true);
    setTimeout(() => {
      setSendingEmail(false);
      setEmailSent(true);
    }, 1500);
  };

  return (
    <div className="space-y-6" id="realtime-analytics-root">

      {/* Real Instagram metrics + AI recommendations (live when connected) */}
      <RealMetricsPanel />

      {/* Top statistical summaries bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-line rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-faint font-mono uppercase tracking-wider block">Meta Ads CTR (7d)</span>
            <span className="text-2xl font-bold text-ink mt-1 block">5.42%</span>
            <span className="text-[10px] text-black font-mono mt-0.5 block flex items-center gap-1">
              ▲ +16.2% vs. mes anterior
            </span>
          </div>
          <div className="text-2xl opacity-35">📊</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-faint font-mono uppercase tracking-wider block">Conversiones Totales (30d)</span>
            <span className="text-2xl font-bold text-ink mt-1 block">$48,250</span>
            <span className="text-[10px] text-black font-mono mt-0.5 block flex items-center gap-1">
              ▲ +39.5% conversión
            </span>
          </div>
          <div className="text-2xl opacity-35">💰</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-faint font-mono uppercase tracking-wider block">Mensajes directos filtrados</span>
            <span className="text-2xl font-bold text-ink mt-1 block">1,204</span>
            <span className="text-[10px] text-black font-mono mt-0.5 block flex items-center gap-1">
              ▲ +88.1% automatizados
            </span>
          </div>
          <div className="text-2xl opacity-35">💬</div>
        </div>
        <div className="bg-surface border border-line rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-faint font-mono uppercase tracking-wider block">Hooks en Prueba Activa</span>
            <span className="text-2xl font-bold text-ink mt-1 block">482</span>
            <span className="text-[10px] text-amber-400 font-mono mt-0.5 block flex items-center gap-1">
              ⭐ 17 nuevos esta semana
            </span>
          </div>
          <div className="text-2xl opacity-35">🔥</div>
        </div>
      </div>

      {/* Calculadora Predictiva de ROAS & ROI (Estrategia Santi) */}
      <div className="bg-surface border border-line rounded-2xl p-5" id="predictive-roas-calculator">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-line mb-5">
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              📊 Simulador Financiero: ROAS & Presupuesto Predictivo (Estrategia Santi)
            </h3>
            <p className="text-xs text-faint mt-0.5">Calcula el retorno de tu inversión publicitaria estimando el impacto financiero de tus creativos de conversión.</p>
          </div>
          <span className="bg-black/10 text-black text-[10px] px-2.5 py-1 rounded-full border border-black/20 font-mono font-bold uppercase">
            Planificación de Campañas
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sliders panel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Presupuesto */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Inversión Publicitaria Mensual:</span>
                  <span className="text-black font-mono font-bold">${budget.toLocaleString()} USD</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full accent-[#101010]"
                />
              </div>

              {/* CPC Promedio */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">CPC Promedio Estimado:</span>
                  <span className="text-black font-mono font-bold">${cpc.toFixed(2)} USD</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="5.00"
                  step="0.05"
                  value={cpc}
                  onChange={(e) => setCpc(Number(e.target.value))}
                  className="w-full accent-[#101010]"
                />
              </div>

              {/* CTR Promedio */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">CTR de Creativos (Santi):</span>
                  <span className="text-black font-mono font-bold">{ctr.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.1"
                  value={ctr}
                  onChange={(e) => setCtr(Number(e.target.value))}
                  className="w-full accent-[#101010]"
                />
              </div>

              {/* Tasa de conversión de la landing */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Tasa de Conversión Web:</span>
                  <span className="text-black font-mono font-bold">{convRate.toFixed(2)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={convRate}
                  onChange={(e) => setConvRate(Number(e.target.value))}
                  className="w-full accent-[#101010]"
                />
              </div>
            </div>

            {/* Valor Promedio de Venta (AOV) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted">Valor Promedio del Ticket (AOV):</span>
                <span className="text-black font-mono font-bold">${aov.toLocaleString()} USD</span>
              </div>
              <input
                type="range"
                min="5"
                max="500"
                step="5"
                value={aov}
                onChange={(e) => setAov(Number(e.target.value))}
                className="w-full accent-[#101010]"
              />
            </div>
          </div>

          {/* Results breakdown panel */}
          <div className="lg:col-span-5 bg-sink border border-line rounded-xl p-4 flex flex-col justify-between space-y-4">
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

            {/* ROAS Speedometer/Metrics Display */}
            <div className="bg-surface p-3 rounded-lg border border-line space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-faint uppercase font-mono tracking-wider">RETORNO ESTIMADO (ROAS):</span>
                <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                  roas >= 3.0 ? "bg-black/10 text-black" : roas >= 1.5 ? "bg-amber-400/10 text-amber-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {roas.toFixed(2)}x
                </span>
              </div>
              <div className="text-[11px] leading-relaxed text-muted">
                <strong className="text-ink">Consejo de Santi:</strong> {roasAdvice}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main interactive charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Daily CTR progression (takes 8 cols) */}
        <div className="lg:col-span-8 bg-surface border border-line rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-line mb-4">
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-black" /> Rendimiento de Clics por Plataforma (CTR %)
              </h3>
              <p className="text-xs text-faint mt-0.5">Analítica diaria recopilada por Mateo del píxel de conversión.</p>
            </div>
            
            {/* Download/Email summary buttons */}
            <button
              onClick={handleSendEmailReport}
              disabled={sendingEmail || emailSent}
              className={`text-[11px] px-3 py-1.5 rounded-full border font-semibold flex items-center gap-1.5 transition ${
                emailSent
                  ? "bg-black/10 border-black/30 text-black"
                  : "bg-sink hover:bg-[#eaedf6] border-line text-ink"
              }`}
              id="btn-analytics-email-report"
            >
              <Mail className="w-3.5 h-3.5 text-black" />
              {sendingEmail ? "Enviando Reporte..." : emailSent ? "Reporte Enviado" : "Enviar Reporte al Email"}
            </button>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyMetrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#101010" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#101010" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" />
                <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: 10, fontFamily: "monospace" }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: 10, fontFamily: "monospace" }} />
                <Tooltip contentStyle={{ backgroundColor: "#F3F5FB", borderColor: "#ECECEC", borderRadius: 8, color: "#111111" }} />
                <Legend style={{ fontSize: 11, fontFamily: "monospace" }} />
                <Area type="monotone" dataKey="MetaAds" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMeta)" strokeWidth={2} />
                <Area type="monotone" dataKey="IG" stroke="#ec4899" fillOpacity={1} fill="url(#colorIG)" strokeWidth={2} />
                <Area type="monotone" dataKey="LinkedIn" stroke="#101010" fillOpacity={1} fill="url(#colorLI)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Conversions Funnel (takes 4 cols) */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider pb-3 border-b border-line mb-4">
            Embudo de Tráfico y Conversiones (Mateo & Facu)
          </h3>
          <p className="text-xs text-faint -mt-2 mb-4 leading-relaxed">Pérdida de fricción en campañas integradas.</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECECEC" />
                <XAxis type="number" stroke="#9CA3AF" hide />
                <YAxis dataKey="stage" type="category" stroke="#9CA3AF" style={{ fontSize: 10, fontWeight: "500" }} />
                <Tooltip contentStyle={{ backgroundColor: "#F3F5FB", borderColor: "#ECECEC", color: "#111111" }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funnelData.map((entry, index) => (
                    <rect key={index} fill={index === 3 ? "#101010" : entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-sink p-2.5 rounded-lg border border-line mt-4 text-[10px] text-muted font-mono leading-relaxed">
            🚀 <strong>Tasa de Conversión global:</strong> 7.38% desde clic a venta, un 2% arriba tras la optimización de copys de Santi.
          </div>
        </div>
      </div>

      {/* Mateo's Hook Vault: Kill/Repeat list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Mateo's vault (takes 7 cols) */}
        <div className="lg:col-span-7 bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-line">
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
                🔒 Hook Vault: Reporte de Desempeño Diario
              </h3>
              <p className="text-xs text-faint mt-0.5">La directiva literal de Mateo: Repetir el contenido ganador, matar el perdedor.</p>
            </div>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-sink rounded-input text-xs px-2.5 py-1.5 text-muted outline-none focus:bg-accent-soft focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">Todas las plataformas</option>
              <option value="meta">Meta Ads</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          {/* List items */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredHooks.map((h) => {
              const isRepeat = h.status === "REPETIR";
              return (
                <div key={h.id} className="bg-sink rounded-xl p-3.5 border border-line flex gap-3 relative overflow-hidden group">
                  <div className={`w-1 absolute left-0 top-0 h-full ${isRepeat ? "bg-black" : "bg-rose-500"}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-faint font-mono uppercase">{h.platform}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1 ${
                        isRepeat ? "bg-black/10 text-black" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {isRepeat ? (
                          <>
                            <RotateCcw className="w-3 h-3 text-black" />
                            <span>REPETIR / ESCALAR</span>
                          </>
                        ) : (
                          <>
                            <Skull className="w-3 h-3 text-rose-400" />
                            <span>MATAR / PAUSAR</span>
                          </>
                        )}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-ink mt-2">
                      "{h.hook}"
                    </p>
                    <p className="text-[11px] text-muted mt-1.5 leading-relaxed bg-sink p-2 rounded">
                      <span className="text-black font-mono font-bold">Mateo:</span> {h.reason}
                    </p>
                  </div>
                  
                  {/* CTR display on right */}
                  <div className="flex flex-col justify-center items-end text-right shrink-0 font-mono border-l border-line pl-3">
                    <span className="text-[10px] text-faint uppercase font-semibold">CTR</span>
                    <span className={`text-sm font-bold ${isRepeat ? "text-black" : "text-rose-400"}`}>{h.ctr}%</span>
                    <span className="text-[10px] text-muted mt-0.5">{h.conversions} leads</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Facu's DM Funnels auditor (takes 5 cols) */}
        <div className="lg:col-span-5 bg-surface border border-line rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider pb-3 border-b border-line">
            🤖 Auditoría de Embudos DM (Por Facu)
          </h3>
          <p className="text-xs text-faint -mt-2">Automatización de mensajes directos e interacciones directas en Meta/IG.</p>

          <div className="space-y-3">
            {dmAutomations.map((dm, idx) => (
              <div key={idx} className="bg-sink border border-line rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-black font-mono">Disparador #{idx + 1}</span>
                  <span className="flex items-center gap-1 text-[10px] bg-black/10 text-black px-2 py-0.5 rounded font-mono font-semibold">
                    <ShieldCheck className="w-3 h-3 text-black" /> Activa
                  </span>
                </div>
                
                <div className="text-xs">
                  <span className="text-faint font-semibold">Trigger:</span> <strong className="text-ink">{dm.trigger}</strong>
                </div>

                <div className="text-xs leading-relaxed bg-sink p-2 rounded text-muted">
                  <span className="text-faint font-semibold font-mono text-[10px] block mb-0.5">Acción Automática:</span>
                  {dm.response}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-line text-[11px] font-mono">
                  <span className="text-faint">Ejecuciones: <strong className="text-muted">{dm.executions}</strong></span>
                  <span className="text-faint">Conversión: <strong className="text-black">{dm.conversion}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
