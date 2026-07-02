import React, { useState } from "react";
import { motion } from "motion/react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  items: NavItem[];
  activeTab: string;
  onSelect: (id: string) => void;
}

const COLLAPSED = 84;
const EXPANDED = 264;

export const Sidebar: React.FC<SidebarProps> = ({ items, activeTab, onSelect }) => {
  const [open, setOpen] = useState(false);

  // Label reveal animation shared by brand / nav / footer rows.
  const label = {
    animate: { opacity: open ? 1 : 0, x: open ? 0 : -6 },
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const },
  };

  return (
    <motion.aside
      onHoverStart={() => setOpen(true)}
      onHoverEnd={() => setOpen(false)}
      initial={false}
      animate={{ width: open ? EXPANDED : COLLAPSED }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 h-screen p-3 z-50 hidden md:block"
    >
      <motion.div
        animate={{ boxShadow: open ? "0 24px 60px rgba(0,0,0,0.30)" : "0 0px 0px rgba(0,0,0,0)" }}
        transition={{ duration: 0.28 }}
        className="h-full bg-sidebar rounded-[26px] flex flex-col py-5 overflow-hidden"
      >
        {/* Brand */}
        <div className="flex items-center px-3 shrink-0">
          <span className="w-11 h-11 grid place-items-center shrink-0">
            <span className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center">
              <span className="w-4 h-4 rounded-[5px] bg-white rotate-45" />
            </span>
          </span>
          <motion.span {...label} className="ml-2 text-white font-semibold tracking-tight whitespace-nowrap text-[15px]">
            AdTeam<span className="text-white/40">.AI</span>
          </motion.span>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1.5 mt-6 w-full px-3">
          {items.map((item) => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => onSelect(item.id)}
                title={item.label}
                className="relative w-full h-11 rounded-2xl flex items-center group shrink-0"
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-2xl bg-accent"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <span className="w-11 h-11 grid place-items-center shrink-0 relative z-10">
                  <Icon
                    className={`w-[19px] h-[19px] transition-colors ${
                      active ? "text-white" : "text-[#8a8a8a] group-hover:text-white"
                    }`}
                  />
                </span>
                <motion.span
                  {...label}
                  className={`ml-1 text-[13.5px] font-medium whitespace-nowrap relative z-10 transition-colors ${
                    active ? "text-white" : "text-[#c9c9c9] group-hover:text-white"
                  }`}
                >
                  {item.label}
                </motion.span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-4 shrink-0 flex items-center px-3">
          <span className="w-11 h-11 grid place-items-center shrink-0">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#8fd4f8] flex items-center justify-center text-white text-xs font-semibold">
              AT
            </span>
          </span>
          <motion.div {...label} className="ml-2 leading-tight whitespace-nowrap">
            <div className="text-white text-[13px] font-medium">AdTeam</div>
            <div className="text-white/40 text-[11px]">Agencia IA</div>
          </motion.div>
        </div>
      </motion.div>
    </motion.aside>
  );
};
