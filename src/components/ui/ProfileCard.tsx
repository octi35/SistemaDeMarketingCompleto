import React from "react";
import { Card } from "./Card";
import { Avatar } from "./Avatar";

export interface ProfileField {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

export interface ProfileAction {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick?: () => void;
}

export interface ProfileCardProps {
  name: string;
  role?: string;
  avatarSrc?: string;
  fields?: ProfileField[];
  actions?: ProfileAction[];
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  role,
  avatarSrc,
  fields = [],
  actions = [],
  className = "",
}) => (
  <Card className={className}>
    <div className="flex flex-col items-center text-center">
      <Avatar name={name} src={avatarSrc} size="lg" />
      <h3 className="mt-3 text-[17px] font-semibold text-[#111111] tracking-tight">{name}</h3>
      {role && <p className="text-[13px] text-[#6b7280] mt-0.5">{role}</p>}

      {actions.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {actions.map((a, i) => (
            <button
              key={i}
              title={a.title}
              onClick={a.onClick}
              className="w-10 h-10 rounded-full bg-[#f3f5fb] hover:bg-[#4f6ef7] hover:text-white text-[#6b7280] flex items-center justify-center transition"
            >
              <a.icon className="w-[18px] h-[18px]" />
            </button>
          ))}
        </div>
      )}
    </div>

    {fields.length > 0 && (
      <div className="mt-5 pt-5 border-t border-[#ececec] space-y-3.5">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#f3f5fb] text-[#6b7280] flex items-center justify-center shrink-0">
              <f.icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-[#9ca3af]">{f.label}</div>
              <div className="text-[13px] font-medium text-[#111111] truncate">{f.value}</div>
            </div>
          </div>
        ))}
      </div>
    )}
  </Card>
);
