import React from "react";

type Tone = "neutral" | "accent" | "yellow" | "green" | "sky" | "dark" | "red";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  dot?: boolean;
}

const tones: Record<Tone, string> = {
  neutral: "bg-[#f3f5fb] text-[#6b7280]",
  accent: "bg-[#eef1fe] text-[#4f6ef7]",
  yellow: "bg-[#fff6d6] text-[#a8791b]",
  green: "bg-[#e6f7e6] text-[#3f9a3f]",
  sky: "bg-[#e6f5fe] text-[#2b8fc7]",
  dark: "bg-[#101010] text-white",
  red: "bg-[#fdeaea] text-[#d5514f]",
};

const dotColors: Record<Tone, string> = {
  neutral: "bg-[#9ca3af]",
  accent: "bg-[#4f6ef7]",
  yellow: "bg-[#ffd84d]",
  green: "bg-[#7dd87d]",
  sky: "bg-[#8fd4f8]",
  dark: "bg-white",
  red: "bg-[#d5514f]",
};

export const Badge: React.FC<BadgeProps> = ({ children, tone = "neutral", icon: Icon, className = "", dot }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${tones[tone]} ${className}`}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[tone]}`} />}
    {Icon && <Icon className="w-3 h-3" />}
    {children}
  </span>
);
