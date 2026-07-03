import React, { useEffect, useState } from "react";
import { Palette, Save, Mail, Send, RefreshCw, Sparkles } from "lucide-react";
import { Card, SectionTitle, Field, Input, Textarea, Button, Badge } from "./ui";
import { apiGet, apiPost } from "../lib/api";
import { toast } from "../lib/toast";

interface Brand {
  businessName?: string;
  description?: string;
  audience?: string;
  tone?: string;
  website?: string;
  palette?: string;
  hashtags?: string;
  updatedAt?: string;
}

interface ReportConfigView {
  enabled: boolean;
  to?: string;
  lastSentAt?: string;
  hasSmtp?: boolean;
}

export const BrandKit: React.FC = () => {
  const [brand, setBrand] = useState<Brand>({});
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<ReportConfigView>({ enabled: false });
  const [savingReport, setSavingReport] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);

  useEffect(() => {
    apiGet<{ brand: Brand | null }>("/api/brand")
      .then((r) => r.brand && setBrand(r.brand))
      .catch(() => {});
    apiGet<{ config: ReportConfigView }>("/api/report/config")
      .then((r) => setReport(r.config))
      .catch(() => {});
  }, []);

  const set = (key: keyof Brand) => (value: string) => setBrand((b) => ({ ...b, [key]: value }));

  const saveBrand = async () => {
    setSaving(true);
    try {
      const r = await apiPost<{ brand: Brand }>("/api/brand", {
        businessName: brand.businessName,
        description: brand.description,
        audience: brand.audience,
        tone: brand.tone,
        website: brand.website,
        palette: brand.palette,
        hashtags: brand.hashtags,
      });
      setBrand(r.brand);
      toast.success("Brand kit guardado: toda la IA usará esta identidad de marca.");
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar el brand kit.");
    } finally {
      setSaving(false);
    }
  };

  const saveReport = async (enabled: boolean) => {
    setSavingReport(true);
    try {
      // Reuses the SMTP credentials configured in "Integración Nube".
      const smtp = {
        host: localStorage.getItem("smtp_host") || undefined,
        port: localStorage.getItem("smtp_port") || undefined,
        user: localStorage.getItem("smtp_user") || undefined,
        pass: localStorage.getItem("smtp_pass") || undefined,
      };
      const r = await apiPost<{ config: ReportConfigView }>("/api/report/config", {
        enabled,
        to: report.to || smtp.user,
        smtp,
      });
      setReport((prev) => ({ ...prev, ...r.config, hasSmtp: !!smtp.host }));
      toast.success(enabled ? "Informe semanal activado (lunes 9:00)." : "Informe semanal desactivado.");
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar la configuración.");
    } finally {
      setSavingReport(false);
    }
  };

  const sendNow = async () => {
    setSendingNow(true);
    try {
      const r = await apiPost<{ success: boolean; simulated?: boolean; error?: string }>("/api/report/send-now", {});
      if (r.success) toast.success("Informe enviado por email.");
      else if (r.simulated) toast.info("Configura SMTP en Integración Nube y guarda la configuración del informe primero.");
      else toast.error(r.error || "No se pudo enviar.");
    } catch (err: any) {
      toast.error(err.message || "No se pudo enviar el informe.");
    } finally {
      setSendingNow(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5" id="brand-kit-root">
      {/* Brand identity form */}
      <Card className="xl:col-span-2">
        <SectionTitle
          icon={Palette}
          title="Identidad de Marca"
          subtitle="Estos datos se inyectan automáticamente en todos los prompts de IA: creativos, carruseles, copys, calendario y piloto automático."
          action={brand.updatedAt ? <Badge tone="green" dot>Activo</Badge> : <Badge tone="yellow">Sin configurar</Badge>}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Field label="Nombre del negocio / marca" htmlFor="brand-name">
            <Input id="brand-name" value={brand.businessName || ""} onChange={set("businessName")} placeholder="Ej: SmartDomo" />
          </Field>
          <Field label="Sitio web" htmlFor="brand-web">
            <Input id="brand-web" value={brand.website || ""} onChange={set("website")} placeholder="https://tunegocio.com" />
          </Field>
          <Field label="Descripción del negocio" htmlFor="brand-desc" className="md:col-span-2">
            <Textarea
              id="brand-desc"
              rows={3}
              value={brand.description || ""}
              onChange={set("description")}
              placeholder="Qué vendes, qué te diferencia, tu propuesta de valor..."
            />
          </Field>
          <Field label="Público objetivo" htmlFor="brand-audience">
            <Textarea id="brand-audience" rows={2} value={brand.audience || ""} onChange={set("audience")} placeholder="Ej: dueños de casa 25-45, interesados en tecnología..." />
          </Field>
          <Field label="Tono de voz" htmlFor="brand-tone">
            <Textarea id="brand-tone" rows={2} value={brand.tone || ""} onChange={set("tone")} placeholder="Ej: cercano pero profesional, directo, sin tecnicismos..." />
          </Field>
          <Field label="Paleta de colores" htmlFor="brand-palette" hint="Se usa como referencia en las imágenes generadas.">
            <Input id="brand-palette" value={brand.palette || ""} onChange={set("palette")} placeholder="Ej: azul #4f6ef7, negro, blanco" />
          </Field>
          <Field label="Hashtags preferidos" htmlFor="brand-hashtags">
            <Input id="brand-hashtags" value={brand.hashtags || ""} onChange={set("hashtags")} placeholder="#Domotica #CasaInteligente" />
          </Field>
        </div>

        <div className="mt-6">
          <Button icon={saving ? undefined : Save} onClick={saveBrand} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              "Guardar Brand Kit"
            )}
          </Button>
        </div>
      </Card>

      {/* Weekly report + how it works */}
      <div className="flex flex-col gap-5">
        <Card>
          <SectionTitle
            icon={Mail}
            title="Informe semanal automático"
            subtitle="Cada lunes a las 9:00 recibirás por email el resumen de publicaciones, métricas y experimentos."
            action={report.enabled ? <Badge tone="green" dot>Activado</Badge> : <Badge tone="neutral">Desactivado</Badge>}
          />
          <div className="mt-5 space-y-4">
            <Field label="Enviar a" htmlFor="report-to">
              <Input id="report-to" value={report.to || ""} onChange={(v) => setReport((r) => ({ ...r, to: v }))} placeholder="tu@email.com" />
            </Field>
            {report.lastSentAt && (
              <p className="text-[12px] text-faint">Último envío: {new Date(report.lastSentAt).toLocaleString()}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant={report.enabled ? "secondary" : "primary"} size="sm" onClick={() => saveReport(!report.enabled)} disabled={savingReport}>
                {report.enabled ? "Desactivar" : "Activar informe semanal"}
              </Button>
              <Button variant="secondary" size="sm" icon={Send} onClick={sendNow} disabled={sendingNow}>
                {sendingNow ? "Enviando..." : "Enviar ahora"}
              </Button>
            </div>
            <p className="text-[11px] text-faint leading-relaxed">
              Usa las credenciales SMTP configuradas en <strong>Integración Nube</strong>. La contraseña se guarda
              cifrada en el servidor.
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle icon={Sparkles} title="¿Cómo funciona?" />
          <ul className="mt-4 space-y-2.5 text-[13px] text-muted leading-relaxed list-disc pl-4">
            <li>El brand kit se antepone a cada prompt de generación, así los 6 agentes escriben siempre con tu voz.</li>
            <li>No necesitas repetir tu nicho o público en cada pestaña: se completa solo.</li>
            <li>El informe semanal junta posts publicados, engagement medido y ganadores A/B en un solo email.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
