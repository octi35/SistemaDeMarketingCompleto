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
  listScheduled,
} from "../serverStore";
import { saveDataUrlImage } from "../imageStore";
import { sealPayloadTokens } from "./secretStore";
import { parseBody, scheduleSchema, calendarSchema, projectSchema, mailSchema } from "./validate";
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

  // ---- Upload base64 images -> public URLs (needed for IG publishing) ----
  app.post("/api/upload-image", (req, res) => {
    try {
      const { images, dataUrl } = req.body || {};
      const list: string[] = Array.isArray(images) ? images : dataUrl ? [dataUrl] : [];
      if (list.length === 0) {
        return res.status(400).json({ error: "No hay imágenes para subir." });
      }
      const base = ctx.publicBaseUrl(req);
      const urls = list.map((d) => `${base}/uploads/${saveDataUrlImage(d)}`);
      res.json({ urls, publicBase: base });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: error.message || "No se pudo subir la imagen" });
    }
  });
}
