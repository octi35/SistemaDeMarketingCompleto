// Persistence + utility endpoints: server config flags, carousel projects,
// published posts, scheduled posts, calendar plan, SMTP mail and image upload.
import express from "express";
import nodemailer from "nodemailer";
import {
  listProjects,
  getProject,
  saveProject,
  deleteProject,
  getCalendar,
  saveCalendar,
  listPosts,
  addScheduled,
  cancelScheduled,
  retryScheduled,
  listScheduled,
  getPipeline,
  savePipeline,
  getBrand,
  saveBrand,
  listExperiments,
  addExperiment,
  getReportConfig,
  saveReportConfig,
} from "../serverStore";
import { collectMetricsOnce, buildMetricsSummary, decideDueExperiments } from "./metricsHistory";
import { sendWeeklyReport, buildReportText } from "./weeklyReport";
import { storeImagePublic } from "./cloudStorage";
import { sealPayloadTokens, storeSecret } from "./secretStore";
import {
  parseBody,
  scheduleSchema,
  calendarSchema,
  projectSchema,
  mailSchema,
  brandSchema,
  experimentSchema,
  reportConfigSchema,
} from "./validate";
import type { ServerContext } from "./context";

export function registerStoreRoutes(app: express.Express, ctx: ServerContext): void {
  // Lets the frontend know whether server-side API keys are configured.
  app.get("/api/config", (_req, res) => {
    res.json({
      geminiServerKey: !!ctx.ai,
      anthropicServerKey: !!ctx.anthropicClient,
    });
  });

  // ---- Carousel projects (file-based persistence) ----
  app.get("/api/projects", (_req, res) => {
    res.json({ projects: listProjects() });
  });

  app.get("/api/projects/:id", (req, res) => {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });
    res.json(project);
  });

  app.post("/api/projects", (req, res) => {
    const body = parseBody(projectSchema, req, res);
    if (!body) return;
    try {
      const saved = saveProject(body);
      res.json({ project: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "No se pudo guardar el proyecto" });
    }
  });

  app.delete("/api/projects/:id", (req, res) => {
    const ok = deleteProject(req.params.id);
    if (!ok) return res.status(404).json({ error: "Proyecto no encontrado" });
    res.json({ success: true });
  });

  // ---- Published posts registry ----
  app.get("/api/posts", (_req, res) => {
    res.json({ posts: listPosts() });
  });

  // ---- Scheduled posts (auto-publishing) ----
  app.get("/api/scheduled", (_req, res) => {
    res.json({ scheduled: listScheduled() });
  });

  app.post("/api/schedule", (req, res) => {
    const body = parseBody(scheduleSchema, req, res);
    if (!body) return;
    try {
      // Tokens inside the payload are encrypted at rest and replaced by refs;
      // the scheduler resolves them just-in-time when publishing.
      const post = addScheduled({
        network: body.network,
        payload: sealPayloadTokens(body.payload),
        publishAt: body.publishAt,
        label: body.label,
      });
      res.json({
        scheduled: {
          id: post.id,
          network: post.network,
          publishAt: post.publishAt,
          status: post.status,
          label: post.label,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "No se pudo programar la publicación" });
    }
  });

  app.delete("/api/scheduled/:id", (req, res) => {
    const ok = cancelScheduled(req.params.id);
    if (!ok) return res.status(404).json({ error: "No se encontró o ya no está pendiente." });
    res.json({ success: true });
  });

  // Re-queues a FAILED scheduled post for immediate publishing.
  app.post("/api/scheduled/:id/retry", (req, res) => {
    const ok = retryScheduled(req.params.id);
    if (!ok) return res.status(404).json({ error: "Solo se pueden reintentar publicaciones fallidas." });
    res.json({ success: true });
  });

  // ---- Calendar plan persistence (single current plan) ----
  app.get("/api/calendar", (_req, res) => {
    res.json({ calendar: getCalendar() });
  });

  app.post("/api/calendar", (req, res) => {
    const body = parseBody(calendarSchema, req, res);
    if (!body) return;
    try {
      res.json({ calendar: saveCalendar(body.items, body.meta) });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "No se pudo guardar el calendario" });
    }
  });

  // ---- Calendar export as iCalendar (importable in Google Calendar/Outlook) ----
  app.get("/api/calendar.ics", (_req, res) => {
    const cal = getCalendar();
    const items: any[] = cal?.items || [];
    if (!items.length) {
      return res.status(404).type("text/plain").send("No hay plan de calendario guardado. Genera y guarda el plan primero.");
    }

    const esc = (s: string) =>
      String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const pad = (n: number) => String(n).padStart(2, "0");
    // Same convention as the UI scheduler: day 1 of the plan = tomorrow.
    const fmtLocal = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

    const events = items.map((item) => {
      const d = new Date();
      d.setDate(d.getDate() + Math.max(1, Number(item.day) || 1));
      const [hh, mm] = String(item.time || "10:00").split(":").map((n: string) => parseInt(n, 10));
      d.setHours(isNaN(hh) ? 10 : hh, isNaN(mm) ? 0 : mm, 0, 0);
      const end = new Date(d.getTime() + 30 * 60 * 1000);
      return [
        "BEGIN:VEVENT",
        `UID:adteam-day-${item.day}-${cal?.updatedAt || "plan"}@adteam.ai`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${fmtLocal(d)}`,
        `DTEND:${fmtLocal(end)}`,
        `SUMMARY:${esc(`[${item.platform || "Post"}] ${item.title || `Día ${item.day}`}`)}`,
        `DESCRIPTION:${esc(item.copy || item.description || "")}`,
        "END:VEVENT",
      ].join("\r\n");
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AdTeam AI//Calendario de Contenido//ES",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="adteam-calendario.ics"');
    res.send(ics);
  });

  // ---- Real email via SMTP (Nodemailer) ----
  app.post("/api/mail/send", async (req, res) => {
    const body = parseBody(mailSchema, req, res);
    if (!body) return;
    const { host, port, user, pass, to, subject, text, html } = body;
    const smtpHost = host || process.env.SMTP_HOST;
    const smtpUser = user || process.env.SMTP_USER;
    const smtpPass = pass || process.env.SMTP_PASS;
    const smtpPort = Number(port || process.env.SMTP_PORT || 465);

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.json({
        success: false,
        simulated: true,
        error: "Faltan credenciales SMTP (host, usuario o contraseña).",
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // 465 = SSL, otherwise STARTTLS
        auth: { user: smtpUser, pass: smtpPass },
      });

      const info = await transporter.sendMail({
        from: smtpUser,
        to: to || smtpUser,
        subject: subject || "Informe de Marketing — AdTeam AI",
        text: text || "Reporte generado por AdTeam AI.",
        html,
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending email via SMTP:", error);
      res.status(500).json({ success: false, error: error.message || "Fallo el envío SMTP" });
    }
  });

  // ---- Metrics history (publish → measure loop) ----
  app.get("/api/metrics/history", (_req, res) => {
    res.json(buildMetricsSummary());
  });

  // Triggers an on-demand metrics collection (also runs on a 6h schedule).
  app.post("/api/metrics/collect", async (_req, res) => {
    try {
      const result = await collectMetricsOnce();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "No se pudieron recolectar métricas" });
    }
  });

  // ---- Pipeline board persistence ----
  app.get("/api/pipeline", (_req, res) => {
    res.json({ pipeline: getPipeline() });
  });

  app.post("/api/pipeline", (req, res) => {
    const { cards } = req.body || {};
    if (!Array.isArray(cards)) return res.status(400).json({ error: "Se requiere un array 'cards'." });
    res.json({ pipeline: savePipeline(cards) });
  });

  // ---- Brand kit (injected into every AI prompt) ----
  app.get("/api/brand", (_req, res) => {
    res.json({ brand: getBrand() });
  });

  app.post("/api/brand", (req, res) => {
    const body = parseBody(brandSchema, req, res);
    if (!body) return;
    res.json({ brand: saveBrand(body) });
  });

  // ---- A/B experiments (decided automatically by the metrics job) ----
  app.get("/api/experiments", (_req, res) => {
    decideDueExperiments();
    res.json({ experiments: listExperiments() });
  });

  app.post("/api/experiments", (req, res) => {
    const body = parseBody(experimentSchema, req, res);
    if (!body) return;
    if (body.postIdA === body.postIdB) {
      return res.status(400).json({ error: "Elige dos publicaciones distintas para comparar." });
    }
    res.json({ experiment: addExperiment(body) });
  });

  // ---- Weekly report ----
  app.get("/api/report/config", (_req, res) => {
    const cfg = getReportConfig();
    res.json({
      config: cfg
        ? {
            enabled: cfg.enabled,
            to: cfg.to,
            lastSentAt: cfg.lastSentAt,
            hasSmtp: !!(cfg.smtp?.host && cfg.smtp?.user && cfg.smtp?.passRef) || !!process.env.SMTP_HOST,
          }
        : { enabled: false, hasSmtp: !!process.env.SMTP_HOST },
    });
  });

  app.post("/api/report/config", (req, res) => {
    const body = parseBody(reportConfigSchema, req, res);
    if (!body) return;
    const patch: any = { enabled: body.enabled, to: body.to };
    if (body.smtp) {
      patch.smtp = {
        host: body.smtp.host,
        port: body.smtp.port ? String(body.smtp.port) : undefined,
        user: body.smtp.user,
        // The password is encrypted at rest; only a ref is stored.
        passRef: body.smtp.pass ? storeSecret(body.smtp.pass) : getReportConfig()?.smtp?.passRef,
      };
    }
    const saved = saveReportConfig(patch);
    res.json({ config: { enabled: saved.enabled, to: saved.to, lastSentAt: saved.lastSentAt } });
  });

  app.get("/api/report/preview", (_req, res) => {
    res.type("text/plain").send(buildReportText());
  });

  app.post("/api/report/send-now", async (_req, res) => {
    const result = await sendWeeklyReport();
    res.status(result.success ? 200 : 400).json(result);
  });

  // ---- Upload base64 images -> public URLs (needed for IG publishing) ----
  // Uses Supabase Storage when configured (stable CDN URLs); local /uploads otherwise.
  app.post("/api/upload-image", async (req, res) => {
    try {
      const { images, dataUrl } = req.body || {};
      const list: string[] = Array.isArray(images) ? images : dataUrl ? [dataUrl] : [];
      if (list.length === 0) {
        return res.status(400).json({ error: "No hay imágenes para subir." });
      }
      const base = ctx.publicBaseUrl(req);
      const stored = await Promise.all(list.map((d) => storeImagePublic(d, base)));
      res.json({ urls: stored.map((s) => s.url), publicBase: base });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: error.message || "No se pudo subir la imagen" });
    }
  });
}
