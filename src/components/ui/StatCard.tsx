import React from "react";
import { Card } from "./Card";
import { TrendingUp, TrendingDown } from "lucide-react";

type Tone = "accent" | "yellow" | "green" | "sky" | "dark" | "neutral";

const iconChip: Record<Tone, string> = {
  accent: "bg-[#eef1fe] text-[#4f6ef7]",
  yellow: "bg-[#fff6d6] text-[#a8791b]",
  green: "bg-[#e6f7e6] text-[#3f9a3f]",
  sky: "bg-[#e6f5fe] text-[#2b8fc7]",
  dark: "bg-[#101010] text-white",
  neutral: "bg-[#f3f5fb] text-[#6b7280]",
};

export interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down";
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, delta, trend = "up", icon: Icon, tone = "neutral" }) => (
  <Card interactive padded={false} className="p-5">
    <div className="flex items-start justify-between">
      <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconChip[tone]}`}>
        <Icon className="w-5 h-5" />
      </span>
      {delta && (
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium ${
            trend === "up" ? "text-[#3f9a3f]" : "text-[#d5514f]"
          }`}
        >
          {trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {delta}
        </span>
      )}
    </div>
    <div className="mt-4">
      <div className="text-[26px] font-semibold tracking-tight leading-none text-[#111111]">{value}</div>
      <div className="text-[13px] text-[#6b7280] mt-1.5">{label}</div>
    </div>
  </Card>
);
