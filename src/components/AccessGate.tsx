import React, { useEffect, useState } from "react";
import { Lock, Loader2, ShieldCheck } from "lucide-react";

/**
 * Blocks the whole app behind a password when the server has APP_PASSWORD
 * configured. Local/dev instances (no password) pass straight through.
 */
export const AccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<"checking" | "locked" | "open">("checking");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth-status")
      .then((r) => r.json())
      .then((d) => setStatus(d.protected && !d.authenticated ? "locked" : "open"))
      .catch(() => setStatus("open")); // if the check itself fails, let the app render its own errors
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("open");
      } else {
        setError(data.error || "Contraseña incorrecta.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "open") return <>{children}</>;

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      {status === "checking" ? (
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      ) : (
        <form onSubmit={submit} className="bg-surface border border-line rounded-2xl p-8 w-full max-w-sm space-y-5 shadow-card">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="p-3 rounded-full bg-black text-lime-300">
              <Lock className="w-5 h-5" />
            </span>
            <h1 className="text-base font-semibold text-ink">AdTeam AI</h1>
            <p className="text-xs text-muted">Instancia protegida. Ingresa la contraseña de acceso para continuar.</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            placeholder="Contraseña de acceso"
            className="w-full bg-sink border border-line rounded-input px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/20"
          />
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full bg-black hover:bg-sidebar disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-full flex items-center justify-center gap-2 transition"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            <span>Entrar</span>
          </button>
          <p className="text-[10px] text-faint text-center leading-relaxed">
            La sesión dura 30 días en este navegador. La contraseña se define con <code className="bg-sink px-1 rounded">APP_PASSWORD</code> en el servidor.
          </p>
        </form>
      )}
    </div>
  );
};
