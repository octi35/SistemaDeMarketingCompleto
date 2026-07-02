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
  primary: "bg-black text-white hover:bg-sidebar",
  accent: "bg-accent text-white hover:brightness-110",
  yellow: "bg-yellow text-black hover:brightness-[1.04]",
  secondary: "bg-sink text-ink hover:bg-[#eaedf6]",
  outline: "bg-white text-ink ring-1 ring-inset ring-line hover:bg-canvas",
  ghost: "bg-transparent text-muted hover:bg-sink hover:text-ink",
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
