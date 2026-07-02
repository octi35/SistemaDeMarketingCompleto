import React, { useState, useEffect } from "react";
import { CopyOption } from "../types";
import { Sparkles, Copy, Check, MessageSquare, RefreshCw, PenLine } from "lucide-react";
import { PixelAvatar } from "./AgentProfiles";
import { Card, SectionTitle, Field, Input, Select, Button, Badge } from "./ui";
import { apiPost } from "../lib/api";
import { toast } from "../lib/toast";

const FRAMEWORKS = [
  { value: "AIDA", label: "AIDA (Atención, Interés, Deseo, Acción)" },
  { value: "PAS", label: "PAS (Problema, Agitación, Solución)" },
  { value: "Hook-Story-Offer", label: "Hook - Story - Offer (Gancho, Historia, Oferta)" },
  { value: "Before-After-Bridge", label: "BAB (Antes, Después, Puente)" },
];

const TONES = [
  { value: "Directo y Persuasivo", label: "Directo y Persuasivo (Agresivo)" },
  { value: "Informativo y Profesional", label: "Informativo y Corporativo" },
  { value: "Urgente y Exclusivo", label: "Urgente con Escasez (FOMO)" },
  { value: "Cercano y Amigable", label: "Cercano y Empático" },
];

export const ContentStrategist: React.FC = () => {
  const [topic, setTopic] = useState("Software SaaS de automatización de facturación electrónica para contadores autónomos");
  const [framework, setFramework] = useState("AIDA");
  const [tone, setTone] = useState("Directo y Persuasivo");

  const [loading, setLoading] = useState(false);
  const [copys, setCopys] = useState<CopyOption[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const generateCopys = async () => {
    setLoading(true);
    setCopys([]);
    try {
      const data = await apiPost<{ copys?: CopyOption[]; isMock?: boolean }>("/api/generate-copys", {
        topic,
        framework,
        tone,
      });
      if (data.copys) {
        setCopys(data.copys);
        setIsDemo(!!data.isMock);
      }
    } catch (err: any) {
      toast.error(err.message || "No se pudieron generar los copys.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateCopys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="space-y-5" id="content-strategist-root">
      {/* Parameter input panel */}
      <Card>
        <SectionTitle
          icon={PenLine}
          title="Estratega de Contenido IA: Copys Persuasivos"
          subtitle="Santi define la estrategia de la oferta y Lauti redacta copys de alto impacto bajo metodologías probadas."
          action={isDemo ? <Badge tone="yellow" icon={Sparkles}>Modo Demo (sin llave)</Badge> : undefined}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
          <Field label="¿Qué estás vendiendo? (Producto/Servicio)" htmlFor="strategist-topic">
            <Input
              id="strategist-topic"
              value={topic}
              onChange={setTopic}
              placeholder="Ej: Curso de programación, membresía fitness..."
            />
          </Field>
          <Field label="Estructura Psicológica" htmlFor="strategist-framework">
            <Select id="strategist-framework" value={framework} onChange={setFramework} options={FRAMEWORKS} />
          </Field>
          <Field label="Tono del Mensaje" htmlFor="strategist-tone">
            <Select id="strategist-tone" value={tone} onChange={setTone} options={TONES} />
          </Field>
        </div>

        <Button
          id="btn-generate-copys"
          onClick={generateCopys}
          disabled={loading}
          icon={loading ? undefined : Sparkles}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Lauti está redactando los borradores...
            </>
          ) : (
            "Redactar Copies de Conversión con Santi & Lauti"
          )}
        </Button>
      </Card>

      {/* Workshop Board outputs */}
      {copys.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Workshop Dialogue with Santi & Lauti */}
          <Card className="lg:col-span-4 flex flex-col justify-between h-[520px]" padded>
            <div>
              <SectionTitle icon={MessageSquare} title="Discusión en el Taller" />

              <div className="space-y-4 mt-4 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
                {/* Santi bubble */}
                <div className="flex gap-3">
                  <PixelAvatar agentId="santi" size="sm" />
                  <div className="bg-sink rounded-xl p-3 text-xs text-muted">
                    <div className="font-bold text-ink mb-1">Santi:</div>
                    <p className="leading-relaxed">
                      "Para este servicio, usar la estructura <strong className="text-ink">{framework}</strong> con
                      tono <strong className="text-ink">{tone}</strong> es perfecto. Ataca el tiempo perdido como
                      principal dolor."
                    </p>
                  </div>
                </div>

                {/* Lauti bubble */}
                <div className="flex gap-3">
                  <PixelAvatar agentId="lauti" size="sm" />
                  <div className="bg-sink rounded-xl p-3 text-xs text-muted">
                    <div className="font-bold text-ink mb-1">Lauti:</div>
                    <p className="leading-relaxed">
                      "¡Entendido, Santi! He preparado 3 variaciones de ganchos rápidos. El segundo se enfoca en
                      curiosidad extrema, mientras que el primero va directo al grano financiero. ¿Cuál te gusta más?"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-sink rounded-input p-3 text-[11px] text-faint">
              🔑 Ganchos de conversión optimizados y validados con los análisis de Mateo.
            </div>
          </Card>

          {/* RIGHT: Generated copy options */}
          <div className="lg:col-span-8 space-y-4">
            {copys.map((copy, idx) => {
              const fullText = `${copy.hook}\n\n${copy.body}\n\n${copy.cta}`;
              const isHookCopied = copiedIndex === `hook-${idx}`;
              const isBodyCopied = copiedIndex === `body-${idx}`;
              const isAllCopied = copiedIndex === `all-${idx}`;

              return (
                <Card key={idx} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <Badge tone="dark">OPCIÓN #{idx + 1}</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={isAllCopied ? Check : Copy}
                      onClick={() => handleCopyText(fullText, `all-${idx}`)}
                    >
                      {isAllCopied ? "¡Copiado Todo!" : "Copiar Copy Completo"}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {/* Hook Section */}
                    <div className="bg-sink p-3.5 rounded-input group/line">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold text-faint uppercase tracking-wider">
                          Gancho de Entrada (Hook)
                        </span>
                        <button
                          aria-label="Copiar gancho"
                          onClick={() => handleCopyText(copy.hook, `hook-${idx}`)}
                          className="opacity-0 group-hover/line:opacity-100 transition-opacity text-faint hover:text-ink"
                        >
                          {isHookCopied ? <Check className="w-3.5 h-3.5 text-[#3f9a3f]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-ink">{copy.hook}</p>
                    </div>

                    {/* Body Section */}
                    <div className="bg-sink p-3.5 rounded-input group/line">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-semibold text-faint uppercase tracking-wider">
                          Desarrollo de Oferta (Body)
                        </span>
                        <button
                          aria-label="Copiar desarrollo"
                          onClick={() => handleCopyText(copy.body, `body-${idx}`)}
                          className="opacity-0 group-hover/line:opacity-100 transition-opacity text-faint hover:text-ink"
                        >
                          {isBodyCopied ? <Check className="w-3.5 h-3.5 text-[#3f9a3f]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{copy.body}</p>
                    </div>

                    {/* CTA Section */}
                    <div className="bg-sink p-3.5 rounded-input">
                      <span className="text-[10px] font-semibold text-faint uppercase tracking-wider block mb-1">
                        Llamado a la Acción (CTA)
                      </span>
                      <p className="text-xs font-semibold text-ink">{copy.cta}</p>
                    </div>
                  </div>

                  {/* Critique comments */}
                  <div className="bg-accent-soft rounded-input p-3 text-xs text-muted flex items-start gap-2 italic">
                    <span className="shrink-0 mt-0.5">💡</span>
                    <span>{copy.commentary}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
