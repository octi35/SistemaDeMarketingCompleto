import React from "react";

export interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

/** Uppercase micro-label above a control — the standard form row of the app. */
export const Field: React.FC<FieldProps> = ({ label, hint, htmlFor, children, className = "" }) => (
  <div className={`space-y-1.5 ${className}`}>
    <label htmlFor={htmlFor} className="text-[10px] font-semibold text-faint uppercase tracking-wider block">
      {label}
    </label>
    {children}
    {hint && <p className="text-[11px] text-faint">{hint}</p>}
  </div>
);
