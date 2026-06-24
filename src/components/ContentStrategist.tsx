import React, { useState, useEffect } from "react";
import { CopyOption } from "../types";
import { Sparkles, Copy, Check, MessageSquare, AlertCircle, RefreshCw, Layers } from "lucide-react";
import { PixelAvatar } from "./AgentProfiles";

export const ContentStrategist: React.FC = () => {
  const [topic, setTopic] = useState("Software SaaS de automatización de facturación electrónica para contadores autónomos");
  const [framework, setFramework] = useState("AIDA");
  const [tone, setTone] = useState("Directo y Persuasivo");
  
  const [loading, setLoading] = useState(false);
  const [copys, setCopys] = useState<CopyOption[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const generateCopys = async () => {
    setLoading(true);
    setCopys([]);
    try {
      const response = await fetch("/api/generate-copys", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-Key": localStorage.getItem("custom_gemini_api_key") || ""
        },
        body: JSON.stringify({ topic, framework, tone }),
      });
      const data = await response.json();
      if (data.copys) {
        setCopys(data.copys);
        setIsDemo(!!data.isMock);
      }
    } catch (err) {
      console.error("Error generating copys:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateCopys();
  }, []);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="space-y-6" id="content-strategist-root">
      
      {/* Parameter input panel */}
      <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#D1FF26]/10 text-[#D1FF26] border border-[#D1FF26]/20">
              ✍
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Estratega de Contenido IA: Copys Persuasivos
              </h2>
              <p className="text-xs text-[#88888E] mt-0.5">
                Santi define la estrategia de la oferta y Lauti redacta copys de alto impacto bajo metodologías probadas.
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">¿Qué estás vendiendo? (Producto/Servicio)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-white focus:outline-none"
              placeholder="Ej: Curso de programación, membresía fitness..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Estructura Psicológica</label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-[#88888E] focus:outline-none"
            >
              <option value="AIDA">AIDA (Atención, Interés, Deseo, Acción)</option>
              <option value="PAS">PAS (Problema, Agitación, Solución)</option>
              <option value="Hook-Story-Offer">Hook - Story - Offer (Gancho, Historia, Oferta)</option>
              <option value="Before-After-Bridge">BAB (Antes, Después, Puente)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-[#66666E] uppercase tracking-wider">Tono del Mensaje</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-[#1A1A1C] border border-[#2A2A2C] focus:border-[#D1FF26] rounded-lg p-3 text-xs text-[#88888E] focus:outline-none"
            >
              <option value="Directo y Persuasivo">Directo y Persuasivo (Agresivo)</option>
              <option value="Informativo y Profesional">Informativo y Corporativo</option>
              <option value="Urgente y Exclusivo">Urgente con Escasez (FOMO)</option>
              <option value="Cercano y Amigable">Cercano y Empático</option>
            </select>
          </div>
        </div>

        <button
          onClick={generateCopys}
          disabled={loading}
          className="bg-[#D1FF26] hover:bg-[#c2ed1c] active:bg-[#b3db18] disabled:bg-[#1A1A1C] text-black font-bold px-6 py-3.5 rounded-full flex items-center justify-center gap-2 transition text-xs uppercase tracking-wider"
          id="btn-generate-copys"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Lauti está redactando los borradores...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-black" />
              <span>Redactar Copies de Conversión con Santi & Lauti</span>
            </>
          )}
        </button>
      </div>

      {/* Workshop Board outputs */}
      {copys.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Workshop Dialogue with Santi & Lauti (takes 4 cols) */}
          <div className="lg:col-span-4 bg-[#141416] border border-[#222224] rounded-2xl p-5 flex flex-col justify-between h-[520px]">
            <div>
              <h3 className="text-xs font-semibold text-[#88888E] uppercase tracking-wider pb-3 border-b border-[#222224] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#D1FF26]" /> Discusión en el Taller
              </h3>
              
              <div className="space-y-4 mt-4 overflow-y-auto max-h-[380px] pr-1 custom-scrollbar">
                
                {/* Santi bubble */}
                <div className="flex gap-3">
                  <PixelAvatar agentId="santi" size="sm" />
                  <div className="bg-[#0A0A0B] rounded-xl p-3 border border-[#222224] text-xs text-[#88888E] relative">
                    <div className="font-bold text-[#D1FF26] mb-1">Santi:</div>
                    <p className="leading-relaxed">
                      "Para este servicio, usar la estructura <strong className="text-[#D1FF26]">{framework}</strong> con tono <strong className="text-white">{tone}</strong> es perfecto. Ataca el tiempo perdido como principal dolor."
                    </p>
                  </div>
                </div>

                {/* Lauti bubble */}
                <div className="flex gap-3">
                  <PixelAvatar agentId="lauti" size="sm" />
                  <div className="bg-[#0A0A0B] rounded-xl p-3 border border-[#222224] text-xs text-[#88888E] relative">
                    <div className="font-bold text-[#D1FF26] mb-1">Lauti:</div>
                    <p className="leading-relaxed">
                      "¡Entendido, Santi! He preparado 3 variaciones de ganchos rápidos. El segundo se enfoca en curiosidad extrema, mientras que el primero va directo al grano financiero. ¿Cuál te gusta más?"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0B] border border-[#222224] rounded-lg p-3 text-[10px] text-[#66666E] font-mono">
              🔑 Ganchos de conversión optimizados y validados con los análisis de Mateo.
            </div>
          </div>

          {/* RIGHT: Actual Generated Copy options list (takes 8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {copys.map((copy, idx) => {
              const fullText = `${copy.hook}\n\n${copy.body}\n\n${copy.cta}`;
              const isHookCopied = copiedIndex === `hook-${idx}`;
              const isBodyCopied = copiedIndex === `body-${idx}`;
              const isAllCopied = copiedIndex === `all-${idx}`;

              return (
                <div key={idx} className="bg-[#141416] border border-[#222224] rounded-2xl p-5 space-y-4 relative overflow-hidden group">
                  <div className="flex items-center justify-between border-b border-[#222224] pb-2.5">
                    <span className="text-xs font-semibold text-[#D1FF26] font-mono uppercase tracking-wider">
                      OPCIÓN #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleCopyText(fullText, `all-${idx}`)}
                      className="text-[11px] text-[#88888E] hover:text-[#D1FF26] bg-[#0A0A0B] hover:bg-[#1A1A1C] px-2.5 py-1.5 rounded border border-[#222224] transition flex items-center gap-1.5 font-mono"
                    >
                      {isAllCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#D1FF26]" />
                          <span>¡Copiado Todo!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Copy Completo</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Hook Section */}
                    <div className="bg-[#0A0A0B] p-3 rounded-lg border border-[#222224] relative group/line">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-[#66666E] font-mono uppercase">Gancho de Entrada (Hook)</span>
                        <button
                          onClick={() => handleCopyText(copy.hook, `hook-${idx}`)}
                          className="opacity-0 group-hover/line:opacity-100 transition-opacity text-[#66666E] hover:text-[#D1FF26] text-[10px]"
                        >
                          {isHookCopied ? <Check className="w-3 h-3 text-[#D1FF26]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {copy.hook}
                      </p>
                    </div>

                    {/* Body Section */}
                    <div className="bg-[#0A0A0B] p-3 rounded-lg border border-[#222224] relative group/line">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-[#66666E] font-mono uppercase">Desarrollo de Oferta (Body)</span>
                        <button
                          onClick={() => handleCopyText(copy.body, `body-${idx}`)}
                          className="opacity-0 group-hover/line:opacity-100 transition-opacity text-[#66666E] hover:text-[#D1FF26] text-[10px]"
                        >
                          {isBodyCopied ? <Check className="w-3 h-3 text-[#D1FF26]" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-xs text-[#88888E] leading-relaxed whitespace-pre-wrap">
                        {copy.body}
                      </p>
                    </div>

                    {/* CTA Section */}
                    <div className="bg-[#0A0A0B] p-3 rounded-lg border border-[#222224]">
                      <span className="text-[9px] font-bold text-[#66666E] font-mono block mb-1 uppercase">Llamado a la Acción (CTA)</span>
                      <p className="text-xs font-semibold text-[#D1FF26]">
                        {copy.cta}
                      </p>
                    </div>
                  </div>

                  {/* Critique comments */}
                  <div className="bg-[#0A0A0B] rounded-lg p-3 border border-[#222224] text-xs text-[#88888E] flex items-start gap-2 italic">
                    <span className="text-[#D1FF26] shrink-0 mt-0.5">💡</span>
                    <span>{copy.commentary}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
