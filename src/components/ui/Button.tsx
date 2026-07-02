import React from "react";
import { motion } from "motion/react";

type Variant = "primary" | "accent" | "secondary" | "yellow" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: React.ComponentType<{ className?: string }>;
  iconRight?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  type?: "button" | "submit";
  full?: boolean;
  className?: string;
  title?: string;
  id?: string;
}

const variants: Record<Variant, string> = {
  primary: "bg-[#101010] text-white hover:bg-[#232323]",
  accent: "bg-[#4f6ef7] text-white hover:brightness-110",
  yellow: "bg-[#ffd84d] text-[#101010] hover:brightness-[1.04]",
  secondary: "bg-[#f3f5fb] text-[#111111] hover:bg-[#eaedf6]",
  outline: "bg-white text-[#111111] ring-1 ring-inset ring-[#ececec] hover:bg-[#f7f8fc]",
  ghost: "bg-transparent text-[#6b7280] hover:bg-[#f3f5fb] hover:text-[#111111]",
};

const sizes: Record<Size, string> = {
  sm: "h-[34px] px-3.5 text-[13px] gap-1.5",
  md: "h-[42px] px-5 text-sm gap-2",
  lg: "h-[48px] px-6 text-sm gap-2",
};

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  disabled = false,
  type = "button",
  full = false,
  className = "",
  title,
  id,
}) => (
  <motion.button
    id={id}
    type={type}
    title={title}
    onClick={onClick}
    disabled={disabled}
    whileHover={disabled ? undefined : { scale: 1.02 }}
    whileTap={disabled ? undefined : { scale: 0.98 }}
    transition={{ duration: 0.15, ease: "easeOut" }}
    className={`inline-flex items-center justify-center rounded-full font-medium whitespace-nowrap select-none
      ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""}
      ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
  >
    {Icon && <Icon className="w-4 h-4 shrink-0" />}
    {children}
    {IconRight && <IconRight className="w-4 h-4 shrink-0" />}
  </motion.button>
);
