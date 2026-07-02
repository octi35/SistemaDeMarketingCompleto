import React from "react";
import { motion } from "motion/react";

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
  /** Enables the premium hover lift (translateY -2px + deeper shadow). */
  interactive?: boolean;
  /** Applies the standard 24px internal padding. */
  padded?: boolean;
  onClick?: () => void;
  id?: string;
  style?: React.CSSProperties;
}

/**
 * Base surface used across the app.
 * radius 22px · white · soft shadow · generous padding.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  interactive = false,
  padded = true,
  onClick,
  id,
  style,
}) => (
  <motion.div
    id={id}
    style={style}
    onClick={onClick}
    whileHover={interactive ? { y: -2, boxShadow: "0 18px 45px rgba(15,23,42,0.09)" } : undefined}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className={`bg-white rounded-card shadow-card ${padded ? "p-6" : ""} ${
      interactive ? "cursor-pointer" : ""
    } ${className}`}
  >
    {children}
  </motion.div>
);
