// Brand image factory: plans N visual concepts from the Brand Kit and
// generates them one by one with Nano Banana into a persistent asset library
// served from /uploads (public URLs, directly publishable to social networks).
import express from "express";
import fs from "fs";
import path from "path";
import { Type } from "@google/genai";
import { generateContentWithFallback, generateNanoBananaImage, NANO_BANANA_MODELS, NANO_BANANA_PRO_MODELS } from "../aiHelpers";
import { getBrand, listAssets, addAsset, deleteAsset } from "../serverStore";
import { saveDataUrlImage, UPLOADS_DIR } from "../imageStore";
import { parseBody, brandImagePlanSchema, brandImageGenerateSchema } from "./validate";
import type { ServerContext } from "./context";

function brandContext(): string {
  const brand = getBrand();
  if (!brand) return "";
  const parts: string[] = [];
  if (brand.businessName) parts.push(`Brand: ${brand.businessName}`);
  if (brand.description) parts.push(`About: ${brand.description}`);
  if (brand.audience) parts.push(`Audience: ${brand.audience}`);
  if (brand.tone) parts.push(`Tone: ${brand.tone}`);
  if (brand.palette) parts.push(`Color palette: ${brand.palette}`);
  return parts.length ? `[BRAND IDENTITY]\n${parts.join("\n")}\n` : "";
}

// Offline fallback concepts so planning still works without an AI key.
const FALLBACK_CONCEPTS = [
  "Fondo abstracto premium con la paleta de la marca",
  "Producto/servicio en primer plano con iluminación de estudio",
  "Persona del público objetivo usando el producto, estilo lifestyle",
  "Patrón geométrico minimalista con los colores de la marca",
  "Escena aspiracional del resultado que promete la marca",
  "Detalle macro con textura elegante y espacio negativo para texto",
  "Ilustración vectorial moderna del concepto central de la marca",
  "Ambiente de trabajo/uso real del producto, luz natural",
  "Composición flat-lay con elementos de la marca",
  "Fondo degradado cinematográfico con el color principal de la marca",
];

export function registerBrandImageRoutes(app: express.Express, ctx: ServerContext): void {
  const { ai, getCustomAiClient } = ctx;

  const assetToJson = (req: express.Request, a: ReturnType<typeof listAssets>[number]) => ({
    ...a,
    url: `${ctx.publicBaseUrl(req)}/uploads/${a.file}`,
  });

  // 1. Plan N distinct visual concepts (default 50) from the Brand Kit.
  app.post("/api/brand-images/plan", async (req, res) => {
    const body = parseBody(brandImagePlanSchema, req, res);
    if (!body) return;
    const count = body.count ?? 50;
    const activeAi = getCustomAiClient(req) || ai;

    const fallbackPlan = () =>
      Array.from({ length: count }, (_, i) => {
        const base = FALLBACK_CONCEPTS[i % FALLBACK_CONCEPTS.length];
        return { concept: `${base} (variante ${Math.floor(i / FALLBACK_CONCEPTS.length) + 1})`, prompt: base };
      });

    if (!activeAi) {
      return res.json({ prompts: fallbackPlan(), isMock: true });
    }

    try {
      const prompt = `${brandContext()}
You are the art director of this brand. Plan ${count} DISTINCT brand images for social media (Instagram/Facebook/LinkedIn).
${body.focus ? `Campaign focus: ${body.focus}.` : ""}
Cover a varied mix: product/service shots, lifestyle scenes with the target audience, abstract backgrounds in the brand palette, patterns, quotes backgrounds (no text), behind-the-scenes vibes, seasonal ideas.
For each image return:
- concept: short name in Spanish (max 8 words)
- prompt: a rich English image-generation prompt (30-60 words) describing subject, style, lighting and composition. Never include text/letters in the image. Always respect the brand palette.
Return strictly valid JSON conforming to the requested schema. No markdown wrapping.`;

      const response = await generateContentWithFallback(
        {
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  concept: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                },
                required: ["concept", "prompt"],
              },
            },
          },
        },
        activeAi
      );
      const parsed = JSON.parse(response.text || "[]");
      const prompts = (Array.isArray(parsed) ? parsed : []).slice(0, count);
      if (!prompts.length) return res.json({ prompts: fallbackPlan(), isMock: true });
      res.json({ prompts, isMock: false });
    } catch (error: any) {
      console.error("Error planning brand images:", error);
      res.json({ prompts: fallbackPlan(), isMock: true, error: error?.message || String(error) });
    }
  });

  // 2. Generate ONE brand image and store it in the asset library.
  // The client loops over the plan (with limited concurrency) so progress is
  // visible and a failed image can be retried individually.
  app.post("/api/brand-images/generate", async (req, res) => {
    const body = parseBody(brandImageGenerateSchema, req, res);
    if (!body) return;
    const activeAi = getCustomAiClient(req) || ai;
    if (!activeAi) {
      return res.status(400).json({
        error: "No hay API Key de Gemini configurada. Agrega tu clave en 'Integración Nube' para generar imágenes.",
      });
    }

    const brand = getBrand();
    const palette = brand?.palette ? ` Brand color palette: ${brand.palette}.` : "";
    const fullPrompt = `High-end brand marketing image for social media. ${body.prompt}.${palette} Premium advertising quality, clean composition, no text or letters in the image, ultra high quality, 4k. ${
      body.aspect === "square" ? "Square 1:1 composition (1080x1080)." : "Vertical 4:5 portrait composition (1080x1350)."
    }`;

    let contents: any = fullPrompt;
    if (body.referenceImage && body.referenceImage.includes("base64,")) {
      const [meta, b64] = body.referenceImage.split("base64,");
      const mimeType = meta.split(":")[1]?.split(";")[0] || "image/png";
      contents = {
        parts: [
          { inlineData: { mimeType, data: b64 } },
          { text: `${fullPrompt} Use the provided image as the brand's product/logo and integrate it tastefully.` },
        ],
      };
    }

    try {
      const models = body.imageModel === "pro" ? NANO_BANANA_PRO_MODELS : NANO_BANANA_MODELS;
      const image = await generateNanoBananaImage(contents, { customAi: activeAi, models });
      if (!image) {
        return res.status(502).json({ error: "Nano Banana no devolvió imagen. Reintenta en unos segundos." });
      }
      const file = saveDataUrlImage(image);
      const asset = addAsset({ file, prompt: body.prompt, concept: body.concept, tags: body.tags });
      res.json({ asset: assetToJson(req, asset) });
    } catch (error: any) {
      console.error("Error generating brand image:", error);
      const msg = (error?.message || String(error)).toLowerCase();
      const friendly =
        msg.includes("quota") || msg.includes("429") || msg.includes("exhausted")
          ? "Límite de cuota de Gemini alcanzado. Espera un momento y reintenta."
          : error?.message || "No se pudo generar la imagen.";
      res.status(502).json({ error: friendly });
    }
  });

  // 3. Asset library listing (absolute URLs, publishable as-is).
  app.get("/api/assets", (req, res) => {
    res.json({ assets: listAssets().map((a) => assetToJson(req, a)) });
  });

  // 4. Remove an asset (record + file on disk).
  app.delete("/api/assets/:id", (req, res) => {
    const asset = deleteAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: "Asset no encontrado" });
    try {
      const file = path.join(UPLOADS_DIR, path.basename(asset.file));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      /* record removed; leftover file is non-fatal */
    }
    res.json({ success: true });
  });
}
