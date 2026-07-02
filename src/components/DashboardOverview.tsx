import React from "react";
import {
  DollarSign, UserPlus, CheckSquare, Rocket, PenLine, CalendarDays, ClipboardList,
  MoreHorizontal, ArrowUpRight,
} from "lucide-react";
import {
  StatCard, Card, SectionTitle, OpportunityCard, MiniCalendar,
  QuickAction, Progress, Badge, Button, AvatarGroup,
} from "./ui";
import { TeamSpotlight } from "./TeamSpotlight";

interface DashboardOverviewProps {
  onNavigate: (tabId: string) => void;
}

const people = [
  { name: "Sofi Vega" }, { name: "Mateo Cruz" }, { name: "Cami Ortiz" },
  { name: "Lauti Gómez" }, { name: "Facu Díaz" }, { name: "Santi Roso" },
];

const opportunities = [
  { date: "4 Oct", title: "Campaña Royal Package", tag: "Oportunidad", amount: "$11.250", tone: "blue" as const },
  { date: "16 Oct", title: "Deal más rentable", tag: "Recurrente", amount: "$21.300", tone: "sky" as const },
  { date: "12 Oct", title: "Deal de éxito absoluto", tag: "Cerrado ganado", amount: "$2.100", tone: "dark" as const },
  { date: "11 Oct", title: "Campaña Royal Package", tag: "Oportunidad", amount: "$4.160", tone: "yellow" as const },
  { date: "2 Oct", title: "Servicios adaptativos", tag: "Servicio", amount: "$3.140", tone: "white" as const },
  { date: "2 Oct", title: "Segundo deal", tag: "Servicio común", amount: "$12.350", tone: "white" as const },
];

const funnel = [
  { label: "Cualificación", amount: "$92.350", value: 78, tone: "accent" as const },
  { label: "Oportunidad Royal Package", amount: "$67.120", value: 56, tone: "sky" as const },
  { label: "Propuesta de valor", amount: "$28.980", value: 32, tone: "yellow" as const },
  { label: "Cierre", amount: "$14.500", value: 18, tone: "dark" as const },
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  // Live month grid for the agenda calendar.
  const now = new Date();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const today = now.getDate();
  const clamp = (d: number) => Math.min(d, daysInMonth);
  const events = {
    [clamp(today + 1)]: "accent" as const,
    [clamp(today + 3)]: "yellow" as const,
    [clamp(today + 8)]: "sky" as const,
    [clamp(today + 12)]: "dark" as const,
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* ================= MAIN COLUMN ================= */}
      <div className="xl:col-span-2 flex flex-col gap-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Ingresos generados" value="$1.98M" delta="+11%" trend="up" icon={DollarSign} tone="accent" />
          <StatCard label="Nuevos clientes" value="89" delta="+8" trend="up" icon={UserPlus} tone="sky" />
          <StatCard label="Tareas esta semana" value="31" delta="hoy" trend="up" icon={CheckSquare} tone="yellow" />
          <StatCard label="Campañas activas" value="24" delta="+3" trend="up" icon={Rocket} tone="dark" />
        </div>

        {/* Interaction / campaign history */}
        <Card>
          <SectionTitle
            title="Historial de campañas"
            subtitle="Oportunidades y deals recientes de tu pipeline"
            action={<Button variant="secondary" size="sm" iconRight={ArrowUpRight} onClick={() => onNavigate("pipeline")}>Ver todo</Button>}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {opportunities.map((o, i) => (
              <OpportunityCard
                key={i}
                date={o.date}
                title={o.title}
                tag={o.tag}
                amount={o.amount}
                tone={o.tone}
                people={people.slice(i % 3, (i % 3) + 3)}
                onClick={() => onNavigate("pipeline")}
              />
            ))}
          </div>
        </Card>

        {/* Agenda + Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <SectionTitle title="Agenda de contenido" icon={CalendarDays} action={<Badge tone="accent" dot>Live</Badge>} />
            <div className="mt-5">
              <MiniCalendar
                monthLabel={`${monthNames[month]} ${year}`}
                daysInMonth={daysInMonth}
                firstDayOffset={firstDayOffset}
                events={events}
                today={today}
              />
            </div>
          </Card>

          <Card>
            <SectionTitle title="Embudo de conversión" subtitle="Total en pipeline" />
            <div className="mt-3 mb-6">
              <span className="text-[28px] font-semibold tracking-tight text-ink">$350.500</span>
            </div>
            <div className="space-y-5">
              {funnel.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-muted">{s.label}</span>
                    <span className="text-[13px] font-semibold text-ink">{s.amount}</span>
                  </div>
                  <Progress value={s.value} tone={s.tone} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="flex flex-col gap-5">
        <TeamSpotlight onNavigate={onNavigate} />

        {/* Featured KPI card */}
        <Card>
          <div className="flex items-center justify-between">
            <SectionTitle title="Rendimiento" subtitle="Últimos 30 días" />
            <button className="w-8 h-8 rounded-full bg-sink text-muted hover:bg-[#eaedf6] flex items-center justify-center transition">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl bg-canvas p-4">
              <div className="text-[22px] font-semibold text-ink">+41%</div>
              <div className="text-[12px] text-faint mt-1">Ganado (30 días)</div>
            </div>
            <div className="rounded-2xl bg-canvas p-4">
              <div className="text-[22px] font-semibold text-ink">6/6</div>
              <div className="text-[12px] text-faint mt-1">Agentes IA online</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[13px] text-muted">Equipo asignado</span>
            <AvatarGroup people={people} size="sm" max={4} />
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <SectionTitle title="Acciones rápidas" />
          <div className="mt-3 space-y-1">
            <QuickAction label="Nueva campaña" description="Piloto automático de ads" icon={Rocket} tone="accent" onClick={() => onNavigate("autopilot")} />
            <QuickAction label="Generar copys" description="Redacción persuasiva AIDA/PAS" icon={PenLine} tone="yellow" onClick={() => onNavigate("strategist")} />
            <QuickAction label="Programar contenido" description="Calendario de 30 días" icon={CalendarDays} tone="sky" onClick={() => onNavigate("calendar")} />
            <QuickAction label="Ver pipeline" description="Tablero de control unificado" icon={ClipboardList} tone="dark" onClick={() => onNavigate("pipeline")} />
          </div>
        </Card>
      </div>
    </div>
  );
};
