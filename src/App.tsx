import React, { useState } from "react";
import { AgentProfilesList } from "./components/AgentProfiles";
import { TeamWorkflow } from "./components/TeamWorkflow";
import { MetaAdsManager } from "./components/MetaAdsManager";
import { CarouselDesigner } from "./components/CarouselDesigner";
import { ContentStrategist } from "./components/ContentStrategist";
import { CalendarManager } from "./components/CalendarManager";
import { RealTimeAnalytics } from "./components/RealTimeAnalytics";
import { IntegrationsManager } from "./components/IntegrationsManager";
import { TeamPipeline } from "./components/TeamPipeline";
import { AutopilotEngine } from "./components/AutopilotEngine";
import { SocialPublisher } from "./components/SocialPublisher";
import { Sparkles, Users, Award, TrendingUp, Settings, HelpCircle, Activity, LayoutGrid, Calendar, HelpCircle as HelpIcon, ArrowUpRight } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("autopilot");

  // Tab configurations
  const navTabs = [
    { id: "autopilot", label: "Piloto Automático", desc: "Automatización total de campañas", icon: "🚀" },
    { id: "social-publisher", label: "Gestor de Contenido", desc: "Sube imágenes/videos y publica", icon: "📸" },
    { id: "meta-ads", label: "Meta Ads (50x)", desc: "Crear 50 anuncios de conversión", icon: "⚡" },
    { id: "carousel", label: "Carruseles", desc: "IG & LinkedIn Multislides", icon: "🎠" },
    { id: "strategist", label: "Copys Persuasivos", desc: "AIDA/PAS Redacción de textos", icon: "✍" },
    { id: "calendar", label: "Calendario 30d", desc: "Plan de publicación mensual", icon: "📅" },
    { id: "pipeline", label: "Control Pipeline", desc: "Tablero Sofi y Reporte Unificado", icon: "📋" },
    { id: "analytics", label: "Analíticas Cockpit", desc: "Mateo's Hook Vault (Repetir/Matar)", icon: "📊" },
    { id: "team", label: "Nuestro Equipo", desc: "Perfiles de los 6 Agentes", icon: "🤖" },
    { id: "integrations", label: "Integración Nube", desc: "Drive, Mail & Google Calendar", icon: "☁" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E5E5E7] font-sans flex flex-col selection:bg-[#D1FF26] selection:text-black overflow-x-hidden">
      
      {/* Dynamic top bar */}
      <header className="bg-[#0A0A0B]/80 border-b border-[#222224] shrink-0 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#D1FF26] rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-black rotate-45"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white">ADTEAM.AI</h1>
                <span className="bg-[#D1FF26]/10 border border-[#D1FF26]/20 text-[#D1FF26] text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">v1.4.0</span>
              </div>
              <p className="text-[10px] text-[#88888E] uppercase tracking-wider">Agencia Automatizada de Marketing con Agentes Autónomos</p>
            </div>
          </div>

          {/* Quick global states */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
            <div className="flex items-center gap-2 bg-[#1A1A1C] border border-[#222224] px-3 py-1.5 rounded-lg text-[#88888E]">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Agentes Autónomos Activos: <strong className="text-white">6/6</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-[#1A1A1C] border border-[#222224] px-3 py-1.5 rounded-lg text-[#88888E]">
              <span>Sincronización API: <strong className="text-[#D1FF26]">ONLINE</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* Flow of Collaboration Section - Rendered directly to avoid double nested borders */}
        <TeamWorkflow 
          activeTab={activeTab === "analytics" ? "mateo" : activeTab === "meta-ads" ? "santi" : activeTab === "carousel" ? "cami" : activeTab === "strategist" ? "lauti" : activeTab === "calendar" ? "facu" : activeTab === "pipeline" ? "sofi" : undefined}
          onNavigateTab={(tab) => {
            if (tab === "mateo") setActiveTab("analytics");
            if (tab === "santi") setActiveTab("meta-ads");
            if (tab === "cami") setActiveTab("carousel");
            if (tab === "lauti") setActiveTab("strategist");
            if (tab === "facu") setActiveTab("calendar");
            if (tab === "sofi") setActiveTab("pipeline");
          }} 
        />

        {/* Dashboard workspace layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Sidebar navigation tabs (takes 3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <div className="bg-[#141416] border border-[#222224] rounded-2xl p-4 space-y-4">
              <span className="text-[10px] uppercase tracking-widest text-[#66666E] block pl-2">
                ÁREAS DE TRABAJO
              </span>

              <nav className="space-y-1">
                {navTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition relative group ${
                        isActive
                          ? "bg-[#1A1A1C] border-[#2A2A2C] text-[#D1FF26]"
                          : "bg-transparent border-transparent text-[#88888E] hover:text-white hover:bg-[#1A1A1C]/50"
                      }`}
                      id={`tab-button-${tab.id}`}
                    >
                      <span className="text-lg shrink-0 mt-0.5">{tab.icon}</span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-medium tracking-tight">{tab.label}</h4>
                        <p className="text-[10px] text-[#66666E] truncate group-hover:text-[#88888E] transition-colors">{tab.desc}</p>
                      </div>
                      
                      {isActive && (
                        <div className="h-4 w-1 bg-[#D1FF26] rounded absolute right-2 top-1/2 -translate-y-1/2" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick guide notes box */}
            <div className="bg-gradient-to-br from-[#1A1A1C] to-[#0F0F10] border border-[#222224] rounded-xl p-4 text-[11px] text-[#88888E] leading-relaxed space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#66666E] block">🧠 NOTA DE SOFI:</span>
              <p className="text-white">
                "Descarga tus creativos de Meta Ads en PNG y compártelos con tu diseñador gráfico o súbelos directo a tu cuenta publicitaria. Todas las herramientas tienen integraciones listas."
              </p>
            </div>
          </div>

          {/* RIGHT: Active Tab container (takes 9 cols) */}
          <div className="lg:col-span-9">
            {activeTab === "autopilot" && <AutopilotEngine />}
            {activeTab === "social-publisher" && <SocialPublisher />}
            {activeTab === "meta-ads" && <MetaAdsManager />}
            {activeTab === "carousel" && <CarouselDesigner />}
            {activeTab === "strategist" && <ContentStrategist />}
            {activeTab === "calendar" && <CalendarManager />}
            {activeTab === "pipeline" && <TeamPipeline />}
            {activeTab === "analytics" && <RealTimeAnalytics />}
            {activeTab === "team" && <AgentProfilesList />}
            {activeTab === "integrations" && <IntegrationsManager />}
          </div>

        </div>

      </main>

      {/* Footer bar */}
      <footer className="bg-[#0A0A0B] border-t border-[#222224] text-xs text-[#88888E] shrink-0 mt-auto">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 AdTeam AI. Todos los derechos reservados. Diseñado para optimizar tu ROI publicitario de forma autónoma.</p>
          <div className="flex gap-4 font-mono text-[11px] text-[#66666E]">
            <span>Estilo de Pixel Art integrado</span>
            <span>•</span>
            <span>Full-Stack Express + React</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
