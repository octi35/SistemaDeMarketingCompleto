import React from "react";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { AvatarGroup } from "./Avatar";

type Tone = "blue" | "sky" | "yellow" | "dark" | "white";

interface ToneStyle {
  bg: string;
  title: string;
  meta: string;
  amount: string;
  btn: string;
}

const toneStyles: Record<Tone, ToneStyle> = {
  blue: { bg: "bg-[#4f6ef7]", title: "text-white", meta: "text-white/70", amount: "text-white", btn: "bg-white/15 text-white hover:bg-white/25" },
  sky: { bg: "bg-[#8fd4f8]", title: "text-[#0f2a3d]", meta: "text-[#0f2a3d]/60", amount: "text-[#0f2a3d]", btn: "bg-[#0f2a3d]/10 text-[#0f2a3d] hover:bg-[#0f2a3d]/20" },
  yellow: { bg: "bg-[#ffd84d]", title: "text-[#3a2e05]", meta: "text-[#3a2e05]/60", amount: "text-[#3a2e05]", btn: "bg-[#3a2e05]/10 text-[#3a2e05] hover:bg-[#3a2e05]/20" },
  dark: { bg: "bg-[#101010]", title: "text-white", meta: "text-white/55", amount: "text-white", btn: "bg-white/15 text-white hover:bg-white/25" },
  white: { bg: "bg-white shadow-card", title: "text-[#111111]", meta: "text-[#9ca3af]", amount: "text-[#111111]", btn: "bg-[#f3f5fb] text-[#6b7280] hover:bg-[#eaedf6]" },
};

export interface OpportunityCardProps {
  date: string;
  title: string;
  tag?: string;
  amount: string;
  people?: { name: string; src?: string }[];
  tone?: Tone;
  onClick?: () => void;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({
  date,
  title,
  tag,
  amount,
  people = [],
  tone = "white",
  onClick,
}) => {
  const s = toneStyles[tone];
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`${s.bg} rounded-[22px] p-5 flex flex-col justify-between min-h-[168px] cursor-pointer`}
    >
      <div className="flex items-start justify-between">
        <span className={`text-[12px] font-medium ${s.meta}`}>{date}</span>
        <button className={`w-8 h-8 rounded-full flex items-center justify-center transition ${s.btn}`}>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4">
        <h4 className={`text-[15px] font-semibold leading-snug ${s.title}`}>{title}</h4>
        {tag && <p className={`text-[12px] mt-1 ${s.meta}`}>{tag}</p>}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <span className={`text-2xl font-semibold tracking-tight ${s.amount}`}>{amount}</span>
        {people.length > 0 && <AvatarGroup people={people} size="xs" max={3} />}
      </div>
    </motion.div>
  );
};
