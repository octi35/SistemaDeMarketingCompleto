import React from "react";

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ title, subtitle, icon: Icon, action, className = "" }) => (
  <div className={`flex items-start justify-between gap-4 ${className}`}>
    <div className="flex items-start gap-3 min-w-0">
      {Icon && (
        <span className="w-9 h-9 rounded-xl bg-[#f3f5fb] text-[#111111] flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px]" />
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-[#111111] tracking-tight leading-tight">{title}</h3>
        {subtitle && <p className="text-[13px] text-[#6b7280] mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
