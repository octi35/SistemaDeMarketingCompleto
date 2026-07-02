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
      <Icon className="w-4 h-4 text-[#9ca3af] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
    )}
    <input
      id={id}
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-[46px] rounded-[14px] bg-[#f3f5fb] text-sm text-[#111111] placeholder:text-[#9ca3af]
        outline-none transition focus:bg-[#eef1fe] focus:ring-2 focus:ring-[#4f6ef7]/20
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
    className={`w-full rounded-[14px] bg-[#f3f5fb] text-sm text-[#111111] placeholder:text-[#9ca3af] p-4 resize-none
      outline-none transition focus:bg-[#eef1fe] focus:ring-2 focus:ring-[#4f6ef7]/20 ${className}`}
  />
);
