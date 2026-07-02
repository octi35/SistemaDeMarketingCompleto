import React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

/** Borderless select matching Input: light gray fill · radius 14px. */
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  className = "",
  disabled,
  id,
  "aria-label": ariaLabel,
}) => (
  <div className={`relative ${className}`}>
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full h-[46px] rounded-input bg-sink text-sm text-ink appearance-none
        outline-none transition focus:bg-accent-soft focus:ring-2 focus:ring-accent/20
        pl-4 pr-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="w-4 h-4 text-faint absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
  </div>
);
