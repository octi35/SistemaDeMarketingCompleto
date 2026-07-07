// Outgoing webhooks: notify external systems (CRM, funnels, Zapier/Make/n8n)
// when something happens here. Deliveries run in the background with retries
// and a short timeout; a dead subscriber never blocks publishing.
import crypto from "crypto";
import { listWebhooks } from "../serverStore";

export type WebhookEvent = "post.published" | "post.failed" | "asset.created";

const RETRY_DELAYS_MS = [5_000, 30_000]; // initial attempt + 2 retries

async function deliver(url: string, headers: Record<string, string>, body: string, event: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) });
      if (res.ok) return;
      // 4xx (except 429) means the subscriber rejected the payload: no retry.
      if (res.status < 500 && res.status !== 429) {
        console.warn(`[webhooks] ${event} -> ${url} rechazado con ${res.status}; no se reintenta.`);
        return;
      }
      if (attempt >= RETRY_DELAYS_MS.length) {
        console.warn(`[webhooks] ${event} -> ${url} falló (${res.status}) tras ${attempt + 1} intentos.`);
        return;
      }
    } catch (err: any) {
      if (attempt >= RETRY_DELAYS_MS.length) {
        console.warn(`[webhooks] ${event} -> ${url} falló tras ${attempt + 1} intentos:`, err?.message || err);
        return;
      }
    }
    await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
  }
}

export function fireWebhook(event: WebhookEvent, payload: Record<string, any>): void {
  const hooks = listWebhooks().filter((w) => !w.events?.length || w.events.includes(event));
  if (!hooks.length) return;

  const body = JSON.stringify({ event, at: new Date().toISOString(), data: payload });
  for (const hook of hooks) {
    const headers: Record<string, string> = { "Content-Type": "application/json", "X-AdTeam-Event": event };
    if (hook.secret) {
      headers["X-AdTeam-Signature"] = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
    }
    void deliver(hook.url, headers, body, event);
  }
}
