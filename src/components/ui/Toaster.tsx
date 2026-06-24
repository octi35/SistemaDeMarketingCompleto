import React, { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { toast, ToastItem } from "../../lib/toast";

const STYLES: Record<ToastItem["type"], { border: string; icon: React.ReactNode }> = {
  success: { border: "border-[#D1FF26]/40", icon: <CheckCircle className="w-4 h-4 text-[#D1FF26]" /> },
  error: { border: "border-red-500/40", icon: <AlertCircle className="w-4 h-4 text-red-400" /> },
  info: { border: "border-blue-500/40", icon: <Info className="w-4 h-4 text-blue-400" /> },
};

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => toast.subscribe(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-96">
      {items.map((t) => (
        <div
          key={t.id}
          className={`bg-[#141416] border ${STYLES[t.type].border} rounded-xl px-4 py-3 shadow-xl shadow-black/40 flex items-start gap-3 animate-fade-in`}
          role="status"
        >
          <span className="shrink-0 mt-0.5">{STYLES[t.type].icon}</span>
          <p className="text-xs text-[#E5E5E7] leading-relaxed flex-1">{t.message}</p>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="text-[#66666E] hover:text-white transition shrink-0"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
