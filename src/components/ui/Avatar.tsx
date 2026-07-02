import React from "react";

type Size = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  xs: "w-6 h-6 text-[9px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-10 h-10 text-xs",
  lg: "w-14 h-14 text-base",
};

// Soft pastel palette used to deterministically color initials avatars.
const palette = ["#eef1fe", "#e6f5fe", "#fff6d6", "#e6f7e6", "#f3e8ff", "#fee2e6"];
const inkPalette = ["#4f6ef7", "#2b8fc7", "#a8791b", "#3f9a3f", "#8a4fd0", "#d5514f"];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: Size;
  className?: string;
  ring?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ name = "?", src, size = "md", className = "", ring }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const idx = hash(name) % palette.length;

  return (
    <div
      className={`${sizeMap[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold shrink-0 ${
        ring ? "ring-2 ring-white" : ""
      } ${className}`}
      style={{ backgroundColor: palette[idx], color: inkPalette[idx] }}
      title={name}
    >
      {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : <span>{initials}</span>}
    </div>
  );
};

export interface AvatarGroupProps {
  people: { name: string; src?: string }[];
  max?: number;
  size?: Size;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ people, max = 4, size = "sm", className = "" }) => {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex -space-x-2">
        {shown.map((p, i) => (
          <Avatar key={i} name={p.name} src={p.src} size={size} ring />
        ))}
      </div>
      {extra > 0 && (
        <span
          className={`${sizeMap[size]} -ml-2 rounded-full ring-2 ring-white bg-black text-white flex items-center justify-center font-semibold`}
        >
          +{extra}
        </span>
      )}
    </div>
  );
};
