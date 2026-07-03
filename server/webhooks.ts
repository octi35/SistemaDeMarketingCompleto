// Outgoing webhooks: notify external systems (CRM, funnels, Zapier/Make/n8n)
// when something happens here. Fire-and-forget with a short timeout; a dead
// subscriber never blocks publishing.
import crypto from "crypto";
import { listWebhooks } from "../serverStore";

export type WebhookEvent = "post.published" | "post.failed" | "asset.created";

export function fireWebhook(event: WebhookEvent, payload: Record<string, any>): void {
  const hooks = listWebhooks().filter((w) => !w.events?.length || w.events.includes(event));
  if (!hooks.length) return;

  const body = JSON.stringify({ event, at: new Date().toISOString(), data: payload });
  for (const hook of hooks) {
    const headers: Record<string, string> = { "Content-Type": "application/json", "X-AdTeam-Event": event };
    if (hook.secret) {
      headers["X-AdTeam-Signature"] = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
    }
    fetch(hook.url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) }).catch((err) => {
      console.warn(`[webhooks] ${event} -> ${hook.url} failed:`, err?.message || err);
    });
  }
}
