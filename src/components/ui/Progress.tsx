import React from "react";
import { motion } from "motion/react";

type Tone = "accent" | "yellow" | "green" | "sky" | "dark";

const barTone: Record<Tone, string> = {
  accent: "bg-accent",
  yellow: "bg-yellow",
  green: "bg-[#7dd87d]",
  sky: "bg-[#8fd4f8]",
  dark: "bg-black",
};

export interface ProgressProps {
  value: number; // 0 - 100
  tone?: Tone;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({ value, tone = "accent", className = "" }) => (
  <div className={`w-full h-2 rounded-full bg-sink overflow-hidden ${className}`}>
    <motion.div
      className={`h-full rounded-full ${barTone[tone]}`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </div>
);
