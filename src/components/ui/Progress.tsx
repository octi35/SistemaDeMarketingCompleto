import React from "react";
import { motion } from "motion/react";

type Tone = "accent" | "yellow" | "green" | "sky" | "dark";

const barTone: Record<Tone, string> = {
  accent: "bg-[#4f6ef7]",
  yellow: "bg-[#ffd84d]",
  green: "bg-[#7dd87d]",
  sky: "bg-[#8fd4f8]",
  dark: "bg-[#101010]",
};

export interface ProgressProps {
  value: number; // 0 - 100
  tone?: Tone;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, tone = "accent", className = "" }) => (
  <div className={`w-full h-2 rounded-full bg-[#f3f5fb] overflow-hidden ${className}`}>
    <motion.div
      className={`h-full rounded-full ${barTone[tone]}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </div>
);
