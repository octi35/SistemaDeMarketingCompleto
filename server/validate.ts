// zod schemas for the write endpoints + a small validation helper.
import { z } from "zod";
import type express from "express";

export const scheduleSchema = z.object({
  network: z.enum(["instagram", "facebook", "linkedin"]),
  payload: z.record(z.string(), z.any()),
  publishAt: z.string().refine((v) => !isNaN(Date.parse(v)), {
    message: "publishAt debe ser una fecha/hora válida (ISO).",
  }),
  label: z.string().max(200).optional(),
});

export const calendarSchema = z.object({
  items: z.array(z.record(z.string(), z.any())).max(100),
  meta: z.record(z.string(), z.any()).optional(),
});

export const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(120).optional(),
  platform: z.string().max(40).optional(),
  topic: z.string().max(300).optional(),
  slides: z.array(z.record(z.string(), z.any())).min(1, "El carrusel no tiene diapositivas para guardar."),
});

export const mailSchema = z.object({
  host: z.string().max(200).optional(),
  port: z.union([z.string(), z.number()]).optional(),
  user: z.string().max(200).optional(),
  pass: z.string().max(500).optional(),
  to: z.string().max(500).optional(),
  subject: z.string().max(300).optional(),
  text: z.string().max(50_000).optional(),
  html: z.string().max(500_000).optional(),
});

export const brandSchema = z.object({
  businessName: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  audience: z.string().max(1000).optional(),
  tone: z.string().max(200).optional(),
  website: z.string().max(300).optional(),
  palette: z.string().max(300).optional(),
  hashtags: z.string().max(500).optional(),
});

export const experimentSchema = z.object({
  name: z.string().min(1).max(200),
  postIdA: z.string().min(1),
  postIdB: z.string().min(1),
  decideAfterDays: z.number().min(1).max(30).optional(),
});

export const reportConfigSchema = z.object({
  enabled: z.boolean(),
  to: z.string().max(300).optional(),
  smtp: z
    .object({
      host: z.string().max(200).optional(),
      port: z.union([z.string(), z.number()]).optional(),
      user: z.string().max(200).optional(),
      pass: z.string().max(500).optional(),
    })
    .optional(),
});

export const webhookSchema = z.object({
  url: z.string().url().max(500),
  events: z.array(z.enum(["post.published", "post.failed", "asset.created"])).max(10).optional(),
  secret: z.string().max(200).optional(),
});

export const brandImagePlanSchema = z.object({
  count: z.number().int().min(1).max(50).optional(),
  focus: z.string().max(500).optional(),
});

export const brandImageGenerateSchema = z.object({
  prompt: z.string().min(3).max(2000),
  concept: z.string().max(200).optional(),
  tags: z.array(z.string().max(40)).max(10).optional(),
  imageModel: z.enum(["standard", "pro"]).optional(),
  aspect: z.enum(["square", "portrait"]).optional(),
  referenceImage: z.string().max(15_000_000).optional(),
});

export const publishAllSchema = z.object({
  caption: z.string().max(5000).optional(),
  captions: z
    .object({
      instagram: z.string().max(2200).optional(),
      facebook: z.string().max(5000).optional(),
      linkedin: z.string().max(3000).optional(),
    })
    .optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),
  // Video mode: IG publishes a Reel and FB a page video (LinkedIn is skipped).
  videoUrl: z.string().url().optional(),
  networks: z.object({
    instagram: z
      .object({
        igAccountId: z.string().min(3),
        token: z.string().min(10),
        // Posted as first comment right after publishing (e.g. hashtags).
        firstComment: z.string().max(2200).optional(),
      })
      .optional(),
    facebook: z.object({ pageId: z.string().min(3), token: z.string().min(10) }).optional(),
    linkedin: z.object({ authorUrn: z.string().optional(), token: z.string().min(10) }).optional(),
  }),
  // Optional: schedule for later instead of publishing right away.
  publishAt: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: "publishAt debe ser una fecha/hora válida (ISO)." })
    .optional(),
  label: z.string().max(200).optional(),
});

export const metaAdsDraftSchema = z.object({
  adAccountId: z.string().min(3),
  token: z.string().min(10),
  pageId: z.string().min(3),
  campaignName: z.string().min(1).max(200),
  objective: z.string().max(60).optional(),
  dailyBudgetUsd: z.number().min(1).max(100000),
  countries: z.array(z.string().length(2)).max(20).default(["AR"]),
  ageMin: z.number().min(13).max(65).optional(),
  ageMax: z.number().min(13).max(65).optional(),
  message: z.string().min(1).max(3000),
  headline: z.string().max(200).optional(),
  link: z.string().url(),
  imageUrl: z.string().url().optional(),
});

/**
 * Parses req.body with the given schema. On failure it answers 400 with the
 * first issue and returns null so the handler can simply early-return.
 */
export function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  req: express.Request,
  res: express.Response
): z.infer<T> | null {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path?.length ? ` (${issue.path.join(".")})` : "";
    res.status(400).json({ error: `${issue?.message || "Cuerpo de petición inválido"}${where}` });
    return null;
  }
  return result.data;
}
