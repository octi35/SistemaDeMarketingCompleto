// Public API for other systems (CRM, funnels, Zapier/Make/n8n, custom apps).
// Protected by API keys defined in EXTERNAL_API_KEYS (comma-separated).
// Webhook subscriptions (outgoing notifications) are managed here too.
// Full reference: API.md at the repo root.
import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { runPublishAll } from "./publishAllCore";
import { parseBody, publishAllSchema, webhookSchema } from "./validate";
import { listPosts, listScheduled, getCalendar, listAssets, listWebhooks, addWebhook, deleteWebhook } from "../serverStore";
import { buildMetricsSummary } from "./metricsHistory";
import { fireWebhook } from "./webhooks";
import type { ServerContext } from "./context";

function configuredKeys(): string[] {
  return (process.env.EXTERNAL_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= 16);
}

// Constant-time comparison via SHA-256 digests: same-length buffers for
// timingSafeEqual and no early-exit on the first differing character.
function safeKeyMatch(provided: string, keys: string[]): boolean {
  const providedHash = crypto.createHash("sha256").update(provided).digest();
  let match = false;
  for (const key of keys) {
    const keyHash = crypto.createHash("sha256").update(key).digest();
    if (crypto.timingSafeEqual(providedHash, keyHash)) match = true;
  }
  return match;
}

function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const keys = configuredKeys();
  if (keys.length === 0) {
    res.status(503).json({
      error:
        "API externa deshabilitada: define EXTERNAL_API_KEYS en el servidor (una o más claves de 16+ caracteres separadas por coma).",
    });
    return;
  }
  const provided = (req.headers["x-api-key"] as string) || "";
  if (!provided || !safeKeyMatch(provided, keys)) {
    res.status(401).json({ error: "API key inválida o ausente (cabecera X-Api-Key)." });
    return;
  }
  next();
}

export function registerExternalApi(app: express.Express, ctx: ServerContext): void {
  const ext = express.Router();
  ext.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
  ext.use(requireApiKey);

  // Publish (or schedule with publishAt) to every network in one call.
  ext.post("/publish-all", async (req, res) => {
    const body = parseBody(publishAllSchema, req, res);
    if (!body) return;
    try {
      const result = await runPublishAll(body);
      res.status(result.status).json(result.body);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "No se pudo publicar." });
    }
  });

  // Read-only resources for dashboards / sync jobs.
  ext.get("/posts", (_req, res) => res.json({ posts: listPosts() }));
  ext.get("/scheduled", (_req, res) => res.json({ scheduled: listScheduled() }));
  ext.get("/calendar", (_req, res) => res.json({ calendar: getCalendar() }));
  ext.get("/metrics", (_req, res) => res.json(buildMetricsSummary()));
  ext.get("/assets", (req, res) =>
    res.json({ assets: listAssets().map((a) => ({ ...a, url: `${ctx.publicBaseUrl(req)}/uploads/${a.file}` })) })
  );

  app.use("/api/ext", ext);

  // ---- Outgoing webhook subscriptions (managed from the app itself) ----
  app.get("/api/webhooks", (_req, res) => {
    // Secrets are never echoed back.
    res.json({ webhooks: listWebhooks().map(({ secret, ...w }) => ({ ...w, hasSecret: !!secret })) });
  });

  app.post("/api/webhooks", (req, res) => {
    const body = parseBody(webhookSchema, req, res);
    if (!body) return;
    const { secret, ...saved } = addWebhook(body);
    res.json({ webhook: { ...saved, hasSecret: !!secret } });
  });

  app.delete("/api/webhooks/:id", (req, res) => {
    if (!deleteWebhook(req.params.id)) return res.status(404).json({ error: "Webhook no encontrado" });
    res.json({ success: true });
  });

  // Sends a test event to all subscribers so integrations can be verified.
  app.post("/api/webhooks/test", (_req, res) => {
    fireWebhook("post.published", { network: "instagram", postId: "test_123", caption: "Evento de prueba de AdTeam AI" });
    res.json({ success: true, sent: listWebhooks().length });
  });
}
