// Gemini text + image generation helpers, extracted from server.ts.
// The default (shared) client is registered via setDefaultAiClient so the
// shared-key exhaustion logic and fallbacks live in one place.
import { GoogleGenAI } from "@google/genai";

let defaultAi: GoogleGenAI | null = null;
export function setDefaultAiClient(client: GoogleGenAI | null) {
  defaultAi = client;
}

// Tracks shared-key quota exhaustion to avoid hammering a depleted key.
let sharedKeyExhaustedUntil = 0;

// Text generation with retries + model fallback chain.
export async function generateContentWithFallback(params: any, customAi?: GoogleGenAI | null) {
  const activeAi = customAi || defaultAi;
  if (!activeAi) {
    throw new Error("Gemini client not initialized");
  }

  if (activeAi === defaultAi && Date.now() < sharedKeyExhaustedUntil) {
    console.log(`[Gemini Fallback Client] Skipping API call because the shared key is flagged as exhausted (cooldown active).`);
    throw new Error("Shared key is currently exhausted. Falling back to simulated mode.");
  }

  const modelsToTry = [params.model, "gemini-flash-latest", "gemini-2.5-flash-lite"].filter(Boolean);
  const uniqueModels = Array.from(new Set(modelsToTry));

  let lastError: any = null;
  for (const model of uniqueModels) {
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[Gemini Fallback Client] Attempting generation with model: ${model} (attempt ${attempts}/${maxAttempts})`);
        const response = await activeAi.models.generateContent({ ...params, model });
        console.log(`[Gemini Fallback Client] Successfully generated content using model: ${model}`);
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = (err.message || String(err)).toLowerCase();

        const isHardQuotaExceeded =
          errStr.includes("exceeded your current quota") ||
          errStr.includes("quota_exhausted") ||
          errStr.includes("resource_exhausted") ||
          errStr.includes("generativelanguage.googleapis.com/generate_content_free_tier_requests") ||
          (errStr.includes("429") && errStr.includes("limit"));

        if (isHardQuotaExceeded) {
          console.warn(`[Gemini Fallback Client] Model ${model} failed due to hard quota limit. Skipping retries.`);
          if (activeAi === defaultAi) {
            sharedKeyExhaustedUntil = Date.now() + 5 * 60 * 1000;
            console.log(`[Gemini Fallback Client] Shared key flagged as exhausted until ${new Date(sharedKeyExhaustedUntil).toISOString()}`);
          }
          break;
        }

        const isQuotaOrTransient =
          errStr.includes("429") ||
          errStr.includes("503") ||
          errStr.includes("quota") ||
          errStr.includes("unavailable") ||
          errStr.includes("demand") ||
          errStr.includes("limit") ||
          errStr.includes("exhausted");

        if (isQuotaOrTransient && attempts < maxAttempts) {
          const delay = attempts * 1000;
          console.warn(`[Gemini Fallback Client] Model ${model} got transient error. Retrying in ${delay}ms... ${err.message || err}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.warn(`[Gemini Fallback Client] Model ${model} failed: ${err.message || err}`);
          break;
        }
      }
    }
  }
  throw lastError || new Error("All models failed to generate content");
}

// ----- Nano Banana (native image generation) -----
export const NANO_BANANA_MODELS = [
  "gemini-2.5-flash-image", // Nano Banana (stable)
  "gemini-2.5-flash-image-preview", // Nano Banana (preview alias)
];

export const NANO_BANANA_PRO_MODELS = [
  "gemini-3-pro-image-preview", // Nano Banana Pro
  "gemini-2.5-flash-image", // fallback
];

// Generates a single image; `contents` is a prompt string or a parts object
// (when a reference image is supplied). Returns a data URL or null.
export async function generateNanoBananaImage(
  contents: any,
  opts: { customAi?: GoogleGenAI | null; models?: string[] } = {}
): Promise<string | null> {
  const activeAi = opts.customAi || defaultAi;
  if (!activeAi) {
    throw new Error("Gemini client not initialized");
  }

  const models = opts.models && opts.models.length ? opts.models : NANO_BANANA_MODELS;
  let lastError: any = null;
  for (const model of models) {
    try {
      console.log(`[Nano Banana] Generating image with model: ${model}`);
      const response: any = await activeAi.models.generateContent({
        model,
        contents,
        config: { responseModalities: ["IMAGE"] } as any,
      });

      const parts = response?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part?.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || "image/png";
          console.log(`[Nano Banana] Image generated successfully with ${model}.`);
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }
      console.warn(`[Nano Banana] Model ${model} returned no image part. Trying next model.`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[Nano Banana] Model ${model} failed: ${err?.message || err}`);
    }
  }
  if (lastError) throw lastError;
  return null;
}
