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
