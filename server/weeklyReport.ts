// Weekly email report: summarizes posts, metrics, scheduler status and A/B
// experiments, and sends it via SMTP (env vars or config saved from the UI).
import nodemailer from "nodemailer";
import { listPosts, listScheduled, listExperiments, getReportConfig, saveReportConfig } from "../serverStore";
import { buildMetricsSummary } from "./metricsHistory";
import { resolveSecret } from "./secretStore";

const NETWORK_LABEL: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export function buildReportText(): string {
  const posts = listPosts();
  const scheduled = listScheduled();
  const metrics = buildMetricsSummary();
  const experiments = listExperiments();

  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const postsWeek = posts.filter((p) => Date.parse(p.createdAt) >= weekAgo);
  const pending = scheduled.filter((s: any) => s.status === "pending");
  const failed = scheduled.filter((s: any) => s.status === "failed");

  const lines = [
    `INFORME SEMANAL — AdTeam AI`,
    `Generado: ${new Date().toLocaleString()}`,
    ``,
    `— PUBLICACIONES —`,
    `Posts publicados esta semana: ${postsWeek.length} (total registrado: ${posts.length})`,
    ...postsWeek.slice(0, 10).map((p) => `  · [${NETWORK_LABEL[p.network] || p.network}] ${(p.caption || "(sin texto)").slice(0, 80)}`),
    ``,
    `— MÉTRICAS —`,
    `Engagement total medido: ${metrics.totalEngagement} (${metrics.totalLikes} me gusta, ${metrics.totalComments} comentarios) en ${metrics.totalPosts} posts`,
    ...Object.entries(metrics.byNetwork).map(([n, d]) => `  · ${NETWORK_LABEL[n] || n}: ${d.engagement} interacciones en ${d.posts} posts`),
    ``,
    `— PROGRAMACIÓN —`,
    `Pendientes: ${pending.length} · Fallidos: ${failed.length}`,
    ...pending.slice(0, 5).map((s: any) => `  · ${new Date(s.publishAt).toLocaleString()} → ${NETWORK_LABEL[s.network] || s.network} ${s.label ? `(${s.label})` : ""}`),
    ``,
  ];

  const decided = experiments.filter((e) => e.status === "decided");
  if (experiments.length) {
    lines.push(`— EXPERIMENTOS A/B —`);
    for (const e of experiments.slice(0, 5)) {
      lines.push(
        e.status === "decided"
          ? `  · ${e.name}: ganador ${e.winner === "tie" ? "empate" : `variante ${e.winner}`} (A=${e.engagementA ?? "?"} vs B=${e.engagementB ?? "?"})`
          : `  · ${e.name}: en curso (decide en ${e.decideAfterDays} días)`
      );
    }
    lines.push("");
  }

  lines.push(
    `— SIGUIENTE PASO SUGERIDO —`,
    metrics.totalPosts === 0
      ? `Publica contenido esta semana para empezar a medir engagement real.`
      : decided.length
        ? `Escala el ángulo ganador de tus experimentos y mata las variantes perdedoras.`
        : `Revisa el Hook Vault en Analíticas: repite lo que está por encima de la mediana.`
  );

  return lines.join("\n");
}

export interface SendReportResult {
  success: boolean;
  simulated?: boolean;
  error?: string;
  messageId?: string;
}

export async function sendWeeklyReport(): Promise<SendReportResult> {
  const cfg = getReportConfig();
  const host = cfg?.smtp?.host || process.env.SMTP_HOST;
  const user = cfg?.smtp?.user || process.env.SMTP_USER;
  const pass = resolveSecret(cfg?.smtp?.passRef) || process.env.SMTP_PASS;
  const port = Number(cfg?.smtp?.port || process.env.SMTP_PORT || 465);
  const to = cfg?.to || user;

  if (!host || !user || !pass) {
    return { success: false, simulated: true, error: "Faltan credenciales SMTP para el informe semanal." };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from: user,
      to,
      subject: `Informe semanal AdTeam AI — ${new Date().toLocaleDateString()}`,
      text: buildReportText(),
    });
    saveReportConfig({ lastSentAt: new Date().toISOString() });
    console.log(`[WeeklyReport] Informe semanal enviado a ${to}.`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[WeeklyReport] Error enviando informe:", error);
    return { success: false, error: error.message || String(error) };
  }
}

/** Hourly check: send on Mondays (09:00-10:00 local) at most once per 6 days. */
export async function maybeSendWeeklyReport(): Promise<void> {
  const cfg = getReportConfig();
  if (!cfg?.enabled) return;
  const now = new Date();
  if (now.getDay() !== 1 || now.getHours() !== 9) return;
  if (cfg.lastSentAt && Date.now() - Date.parse(cfg.lastSentAt) < 6 * 24 * 3600 * 1000) return;
  await sendWeeklyReport();
}
