import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Tone = "accent" | "yellow" | "sky" | "dark";

const toneStyle: Record<Tone, string> = {
  accent: "bg-accent text-white",
  yellow: "bg-yellow text-[#3a2e05]",
  sky: "bg-[#8fd4f8] text-[#0f2a3d]",
  dark: "bg-black text-white",
};

export interface MiniCalendarProps {
  monthLabel: string;
  /** Number of days in the month. */
  daysInMonth: number;
  /** Weekday offset of day 1 (0 = Monday ... 6 = Sunday). */
  firstDayOffset: number;
  /** Highlighted days -> tone. */
  events?: Record<number, Tone>;
  today?: number;
  className?: string;
}

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  monthLabel,
  daysInMonth,
  firstDayOffset,
  events = {},
  today,
  className = "",
}) => {
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-ink">{monthLabel}</span>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded-full hover:bg-sink flex items-center justify-center text-faint transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-7 h-7 rounded-full hover:bg-sink flex items-center justify-center text-faint transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-2 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[11px] font-medium text-faint">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const tone = events[day];
          const isToday = today === day && !tone;
          return (
            <div key={day} className="flex items-center justify-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition
                  ${tone ? toneStyle[tone] : isToday ? "ring-1 ring-accent text-accent" : "text-muted hover:bg-sink"}`}
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
