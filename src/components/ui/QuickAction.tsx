import React from "react";
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

type Tone = "accent" | "yellow" | "green" | "sky" | "dark" | "neutral";

const chip: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  yellow: "bg-[#fff6d6] text-[#a8791b]",
  green: "bg-[#e6f7e6] text-[#3f9a3f]",
  sky: "bg-[#e6f5fe] text-[#2b8fc7]",
  dark: "bg-black text-white",
  neutral: "bg-sink text-muted",
};

export interface QuickActionProps {
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  onClick?: () => void;
}

export const QuickAction: React.FC<QuickActionProps> = ({ label, description, icon: Icon, tone = "neutral", onClick }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ x: 2 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-canvas transition text-left group"
  >
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${chip[tone]}`}>
      <Icon className="w-[18px] h-[18px]" />
    </span>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium text-ink truncate">{label}</div>
      {description && <div className="text-[12px] text-faint truncate">{description}</div>}
    </div>
    <ChevronRight className="w-4 h-4 text-[#cfd4e2] group-hover:text-muted shrink-0" />
  </motion.button>
);
