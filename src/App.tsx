import React, { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "./components/ui/Toaster";
import { Sidebar, type NavItem } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { DashboardOverview } from "./components/DashboardOverview";
import {
  RefreshCw, LayoutDashboard, Rocket, Images, Zap, GalleryHorizontalEnd,
  PenLine, CalendarDays, ClipboardList, BarChart3, Users, Cloud,
} from "lucide-react";

// Tab views are code-split so each one only loads when opened (smaller initial bundle).
const lazyNamed = <T extends Record<string, any>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(() => loader().then((m) => ({ default: m[name] as React.ComponentType })));

const AgentProfilesList = lazyNamed(() => import("./components/AgentProfiles"), "AgentProfilesList");
const MetaAdsManager = lazyNamed(() => import("./components/MetaAdsManager"), "MetaAdsManager");
const CarouselDesigner = lazyNamed(() => import("./components/CarouselDesigner"), "CarouselDesigner");
const ContentStrategist = lazyNamed(() => import("./components/ContentStrategist"), "ContentStrategist");
const CalendarManager = lazyNamed(() => import("./components/CalendarManager"), "CalendarManager");
const RealTimeAnalytics = lazyNamed(() => import("./components/RealTimeAnalytics"), "RealTimeAnalytics");
const IntegrationsManager = lazyNamed(() => import("./components/IntegrationsManager"), "IntegrationsManager");
const TeamPipeline = lazyNamed(() => import("./components/TeamPipeline"), "TeamPipeline");
const AutopilotEngine = lazyNamed(() => import("./components/AutopilotEngine"), "AutopilotEngine");
const SocialPublisher = lazyNamed(() => import("./components/SocialPublisher"), "SocialPublisher");

interface Tab extends NavItem {
  desc: string;
}

const TABS: Tab[] = [
  { id: "dashboard", label: "Panel general", desc: "Vista global de tu agencia de marketing con IA", icon: LayoutDashboard },
  { id: "autopilot", label: "Piloto Automático", desc: "Automatización total de campañas publicitarias", icon: Rocket },
  { id: "social-publisher", label: "Gestor de Contenido", desc: "Sube imágenes/videos y publica en tus redes", icon: Images },
  { id: "meta-ads", label: "Meta Ads 50x", desc: "Genera 50 anuncios de conversión al instante", icon: Zap },
  { id: "carousel", label: "Carruseles", desc: "Carruseles multi-slide para IG y LinkedIn", icon: GalleryHorizontalEnd },
  { id: "strategist", label: "Copys Persuasivos", desc: "Redacción de textos con marcos AIDA/PAS", icon: PenLine },
  { id: "calendar", label: "Calendario 30 días", desc: "Plan de publicación mensual automatizado", icon: CalendarDays },
  { id: "pipeline", label: "Control Pipeline", desc: "Tablero de Sofi y reporte unificado de ventas", icon: ClipboardList },
  { id: "analytics", label: "Analíticas", desc: "Hook Vault de Mateo — repetir o matar creativos", icon: BarChart3 },
  { id: "team", label: "Nuestro Equipo", desc: "Perfiles de los 6 agentes autónomos", icon: Users },
  { id: "integrations", label: "Integración Nube", desc: "Google Drive, Mail y Google Calendar", icon: Cloud },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-accent/20">
      <Sidebar items={TABS} activeTab={activeTab} onSelect={setActiveTab} />

      <div className="md:pl-[84px]">
        <div className="max-w-[1560px] mx-auto p-3 sm:p-5 flex flex-col gap-5">
          <Topbar title={current.label} subtitle={current.desc} />

          {/* Mobile nav */}
          <nav className="md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] font-medium transition ${
                    active ? "bg-black text-white" : "bg-white text-muted shadow-card"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <main>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {activeTab === "dashboard" ? (
                  <DashboardOverview onNavigate={setActiveTab} />
                ) : (
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-64 text-muted gap-2 text-sm bg-white rounded-card shadow-card">
                        <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                        <span>Cargando módulo...</span>
                      </div>
                    }
                  >
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
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="text-[12px] text-faint px-1 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2026 AdTeam AI · Agencia autónoma de marketing con agentes de IA.</p>
            <span>Full-Stack Express + React</span>
          </footer>
        </div>
      </div>

      <Toaster />
    </div>
  );
}
