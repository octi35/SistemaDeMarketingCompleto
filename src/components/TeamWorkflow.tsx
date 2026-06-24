import React from "react";
import { AGENTS, PixelAvatar } from "./AgentProfiles";
import { ArrowRight, CheckCircle2, CircleDot, PlayCircle } from "lucide-react";

interface TeamWorkflowProps {
  onSelectAgentTab?: (tabId: string) => void;
  onNavigateTab?: (tabId: string) => void;
  activeTab?: string;
}

export const TeamWorkflow: React.FC<TeamWorkflowProps> = ({ onSelectAgentTab, onNavigateTab, activeTab }) => {
  const handleSelect = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (onSelectAgentTab) {
      onSelectAgentTab(tab);
    }
  };

  const steps = [
    {
      agentId: "mateo",
      action: "Analizar Métricas",
      output: "Hooks de Éxito & Reporte Competidores",
      targetTab: "mateo",
      badgeColor: "bg-green-500/10 text-green-400 border-green-500/20",
      icon: "📊"
    },
    {
      agentId: "santi",
      action: "Estructurar Estrategia",
      output: "Content Mix Semanal & CTAs Ganadores",
      targetTab: "santi",
      badgeColor: "bg-[#D1FF26]/10 text-[#D1FF26] border-[#D1FF26]/20",
      icon: "🧭"
    },
    {
      agentId: "cami",
      action: "Idear Ángulos",
      output: "30+ Conceptos & Selección de 7 Ganadores",
      targetTab: "cami",
      badgeColor: "bg-[#D1FF26]/10 text-[#D1FF26] border-[#D1FF26]/20",
      icon: "💡"
    },
    {
      agentId: "lauti",
      action: "Redactar Guiones",
      output: "Copies Persuasivos & Hooks Validados",
      targetTab: "lauti",
      badgeColor: "bg-[#D1FF26]/10 text-[#D1FF26] border-[#D1FF26]/20",
      icon: "✍"
    },
    {
      agentId: "facu",
      action: "Programar & Agendar",
      output: "Contenido Agendado & Auditoría de DM",
      targetTab: "facu",
      badgeColor: "bg-[#D1FF26]/10 text-[#D1FF26] border-[#D1FF26]/20",
      icon: "📅"
    },
    {
      agentId: "sofi",
      action: "Supervisar & Consolidar",
      output: "Informe Inteligente de Ventas & Pipeline",
      targetTab: "sofi",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      icon: "👑"
    }
  ];

  return (
    <div className="bg-[#141416] border border-[#222224] rounded-2xl p-6" id="team-workflow-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>⚙</span> Flujo Automatizado de tu Agencia IA
          </h2>
          <p className="text-xs text-[#88888E] mt-1">
            Los 6 agentes cooperan en secuencia para crear, optimizar y distribuir tu contenido de marketing. Haz clic en un paso para entrar al taller de cada agente.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#1A1A1C] px-3 py-1.5 rounded-lg border border-[#222224] text-xs text-[#88888E]">
          <CircleDot className="w-4 h-4 text-green-500 animate-pulse" />
          <span>Sincronización de Pipeline Activa</span>
        </div>
      </div>

      {/* Workflow horizontal scrolling / stack list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 relative">
        {steps.map((step, index) => {
          const agent = AGENTS.find(a => a.id === step.agentId)!;
          const isSelected = activeTab === step.targetTab;

          return (
            <div key={step.agentId} className="flex flex-col h-full">
              <button
                onClick={() => handleSelect(step.targetTab)}
                className={`flex-1 text-left bg-[#1A1A1C] hover:bg-[#222224] border rounded-xl p-4 transition-all duration-300 relative group flex flex-col justify-between cursor-pointer ${
                  isSelected ? "border-[#D1FF26]" : "border-[#222224]"
                }`}
                id={`workflow-step-${step.agentId}`}
              >
                {/* Connector line for large screens */}
                {index < 5 && (
                  <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 text-[#222224]">
                    <ArrowRight className="w-5 h-5 group-hover:text-[#D1FF26] transition-colors" />
                  </div>
                )}

                <div>
                  {/* Step indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold text-[#66666E] font-mono uppercase">PASO 0{index + 1}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono border ${step.badgeColor}`}>
                      {step.icon} Activo
                    </span>
                  </div>

                  {/* Character Avatar */}
                  <div className="flex items-center gap-3 mb-3">
                    <PixelAvatar agentId={step.agentId} size="sm" />
                    <div>
                      <h4 className="font-semibold text-white text-sm group-hover:text-[#D1FF26] transition-colors">
                        {agent.name}
                      </h4>
                      <p className="text-[11px] text-[#88888E] truncate max-w-[120px]">{agent.role}</p>
                    </div>
                  </div>

                  {/* Action description */}
                  <p className="text-xs font-medium text-white mt-2 line-clamp-1 group-hover:text-[#D1FF26]">
                    {step.action}
                  </p>
                  <p className="text-[11px] text-[#88888E] mt-1 line-clamp-2 leading-relaxed">
                    {step.output}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222224] flex items-center justify-between text-xs text-[#D1FF26] font-mono font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                  <span>Abrir Taller</span>
                  <PlayCircle className="w-4 h-4 shrink-0" />
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Sales Intelligence Report banner (Sofi's dashboard snippet) */}
      <div className="mt-6 bg-[#0A0A0B] border border-[#222224] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-[#D1FF26]/10 text-[#D1FF26] shrink-0 border border-[#D1FF26]/20">
            📄
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#88888E] uppercase tracking-widest font-mono">
              REPORTE DE INTELIGENCIA DE VENTAS (Por Sofi)
            </h3>
            <p className="text-xs text-[#88888E] mt-0.5">
              Base analítica: Ventas NUEVAS de alto valor (&gt;$2.000) • Fuentes cruzadas: CRM de pagos, agendas, transcripciones de llamadas, etc.
            </p>
          </div>
        </div>
        <button 
          onClick={() => handleSelect("sofi")}
          className="bg-[#1A1A1C] border border-[#2A2A2C] text-xs font-medium text-white hover:bg-[#2A2A2C] px-4 py-2 rounded-lg transition shrink-0 font-mono"
        >
          Ver Reporte Ejecutivo
        </button>
      </div>
    </div>
  );
};
