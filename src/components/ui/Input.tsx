import React from "react";

export interface InputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  type?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

/** Borderless input: light gray fill · radius 14px · generous padding. */
export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  placeholder,
  icon: Icon,
  type = "text",
  className = "",
  disabled,
  id,
}) => (
  <div className={`relative ${className}`}>
    {Icon && (
      <Icon className="w-4 h-4 text-faint absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
    )}
    <input
      id={id}
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-[46px] rounded-input bg-sink text-sm text-ink placeholder:text-faint
        outline-none transition focus:bg-accent-soft focus:ring-2 focus:ring-accent/20
        ${Icon ? "pl-11 pr-4" : "px-4"}`}
    />
  </div>
);

export interface TextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ value, onChange, placeholder, rows = 4, className = "", id }) => (
  <textarea
    id={id}
    rows={rows}
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    placeholder={placeholder}
    className={`w-full rounded-input bg-sink text-sm text-ink placeholder:text-faint p-4 resize-none
      outline-none transition focus:bg-accent-soft focus:ring-2 focus:ring-accent/20 ${className}`}
  />
);
