import React from "react";
import { Search, Bell, Settings, HelpCircle } from "lucide-react";
import { Input } from "./ui";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export const Topbar: React.FC<TopbarProps> = ({ title, subtitle }) => (
  <header className="bg-white rounded-[22px] shadow-card px-4 sm:px-6 py-3.5 flex items-center gap-4">
    {/* Title */}
    <div className="min-w-0 shrink-0">
      <div className="flex items-center gap-2 text-[11px] text-[#9ca3af] font-medium mb-0.5">
        <span>Workspace</span>
        <span>/</span>
        <span className="text-[#6b7280]">AdTeam.AI</span>
      </div>
      <h1 className="text-[19px] font-semibold tracking-tight text-[#111111] leading-none truncate">{title}</h1>
    </div>

    {/* Search */}
    <div className="hidden lg:block flex-1 max-w-md mx-auto">
      <Input icon={Search} placeholder="Buscar campañas, clientes, copys..." />
    </div>

    {/* Actions */}
    <div className="flex items-center gap-2 ml-auto shrink-0">
      <button title="Ayuda" className="w-10 h-10 rounded-full hover:bg-[#f3f5fb] text-[#6b7280] flex items-center justify-center transition">
        <HelpCircle className="w-[18px] h-[18px]" />
      </button>
      <button title="Notificaciones" className="relative w-10 h-10 rounded-full hover:bg-[#f3f5fb] text-[#6b7280] flex items-center justify-center transition">
        <Bell className="w-[18px] h-[18px]" />
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#4f6ef7] ring-2 ring-white" />
      </button>
      <button title="Ajustes" className="w-10 h-10 rounded-full hover:bg-[#f3f5fb] text-[#6b7280] flex items-center justify-center transition">
        <Settings className="w-[18px] h-[18px]" />
      </button>

      <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-[#ececec]">
        <div className="text-right leading-tight">
          <div className="text-[13px] font-semibold text-[#111111]">AdTeam</div>
          <div className="text-[11px] text-[#9ca3af]">Agencia IA</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#8fd4f8] flex items-center justify-center text-white text-xs font-semibold">
          AT
        </div>
      </div>
    </div>
  </header>
);
