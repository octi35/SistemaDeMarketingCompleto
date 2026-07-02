// AI content-generation endpoints (creatives, carousels, copys, calendar,
// ideas, autopilot, media descriptions, recommendations).
// Route bodies were extracted verbatim from the original monolithic server.ts.
import express from "express";
import { Type } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateContentWithFallback,
  generateNanoBananaImage,
  NANO_BANANA_MODELS,
  NANO_BANANA_PRO_MODELS,
} from "../aiHelpers";
import type { ServerContext } from "./context";

export function registerAiRoutes(app: express.Express, ctx: ServerContext): void {
  const { ai, anthropicClient, getCustomAiClient } = ctx;
// 1. ENDPOINT: Generate 50 creatives for Meta Ads
app.post("/api/generate-creatives", async (req, res) => {
  const { description, niche, audience } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Description is required" });
  }

  // Fallback high-quality mock data generator to ensure offline / key-less capability is flawless
  const generateMockCreatives = (desc: string, nc: string, aud: string) => {
    const list = [];
    const frameworks = ["AIDA", "PAS (Problem-Agitate-Solve)", "Direct Offer", "Social Proof", "Storytelling", "Fear Of Missing Out"];
    const platforms = ["Facebook Feed", "Instagram Stories", "Meta Audience Network", "Messenger Ad"];
    const CTAs = ["Más información", "Comprar ahora", "Registrarse", "Ver más", "Contactar"];
    const hookStyles = [
      "La dura verdad que nadie te dice sobre...",
      "Por esto tu competencia está vendiendo 3 veces más que vos:",
      "Deja de perder dinero en...",
      "El método definitivo de 3 pasos para...",
      "¡Atención emprendedores! Si vendes...",
      "Lo que desearía haber sabido antes de empezar con..."
    ];

    for (let i = 1; i <= 50; i++) {
      const fw = frameworks[i % frameworks.length];
      const plat = platforms[i % platforms.length];
      const cta = CTAs[i % CTAs.length];
      const hk = hookStyles[i % hookStyles.length] + ` ${nc || "tu negocio"}`;
      const ctr = parseFloat((1.5 + Math.random() * 3.8).toFixed(2));
      const conversion = parseFloat((0.8 + Math.random() * 2.1).toFixed(2));

      list.push({
        id: `creative-${i}`,
        title: `Creativo #${i}: ${fw} para ${plat}`,
        hook: hk,
        bodyCopy: `¿Cansado de no ver resultados? con nuestro producto enfocado en ${desc.slice(0, 50)}... Logramos transformar tu negocio de forma automatizada. ${fw === "AIDA" ? "¡Atención! Mira nuestro nuevo método. Interés garantizado. Deseo desbloqueado. ¡Haz clic hoy!" : "El problema de siempre resuelto en minutos. Olvídate del estrés hoy mismo."}`,
        cta: cta,
        imagePrompt: `A vibrant professional marketing banner showing a dynamic workflow representing ${nc || "services"}, with clean typography and modern visual UI elements, high resolution 3d render.`,
        platform: plat,
        angle: fw,
        estimatedCtr: ctr,
        estimatedConversionRate: conversion,
        targetAudience: aud || "Público general interesado en crecimiento y marketing",
        headline: `¿Quieres dominar ${nc || "tu mercado"}? ${cta} aquí.`
      });
    }
    return list;
  };

  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    // Return high quality mock list
    return res.json({ creatives: generateMockCreatives(description, niche, audience), isMock: true });
  }

  try {
    // To generate exactly 50 distinct creatives in a single request without timing out,
    // we'll instruct the model to generate a set of 10 highly distinct, premium foundational templates,
    // and we will expand them into a structured list of 50 in our Express handler. This guarantees
    // high quality, avoids token exhaustion, and provides a spectacular user experience.
    const prompt = `You are Santi, the Elite Content Strategist AI, and Mateo, the Data Analyst. 
Generate a list of 10 highly distinct, high-performance meta ads creative templates for the following business:
Business Description: ${description}
Niche/Category: ${niche || "General"}
Target Audience: ${audience || "Interested clients"}

For each of the 10 templates, output a structured template containing:
1. angle: The marketing framework/angle (e.g. AIDA, PAS, Storytelling, Social Proof, Direct Offer, Fear of Missing Out)
2. headline: A catchy main headline (max 40 chars)
3. hook: An attention-grabbing hook sentence (max 80 chars)
4. bodyCopy: A persuasive body text with a clear call-to-action (max 300 chars)
5. cta: The button CTA label (e.g., "Más información", "Comprar ahora", "Registrarse")
6. imagePrompt: A detailed, beautiful prompt for generating a visual creative asset (banner / photo) matching the angle
7. targetAudience: A specific target audience segment for this angle
8. estimatedCtr: A simulated realistic high-performance CTR percentage (e.g., 2.5 to 5.2) based on your expert analyst model
9. estimatedConversionRate: A simulated realistic conversion rate percentage (e.g., 1.0 to 3.5)

Return strictly valid JSON conforming to the requested schema. Do not include markdown formatting or wrapping outside the JSON.`;

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              angle: { type: Type.STRING },
              headline: { type: Type.STRING },
              hook: { type: Type.STRING },
              bodyCopy: { type: Type.STRING },
              cta: { type: Type.STRING },
              imagePrompt: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              estimatedCtr: { type: Type.NUMBER },
              estimatedConversionRate: { type: Type.NUMBER }
            },
            required: ["angle", "headline", "hook", "bodyCopy", "cta", "imagePrompt", "targetAudience", "estimatedCtr", "estimatedConversionRate"]
          }
        }
      }
    }, activeAi);

    const text = response.text || "[]";
    const baseTemplates = JSON.parse(text);

    // Now, let's expand these 10 core templates into 50 creatives by varying platforms, headlines, hooks, and CTAs
    const platforms = ["Facebook Feed", "Instagram Stories", "Meta Audience Network", "Messenger Ad", "Instagram Reels"];
    const variations = [
      { prefix: "✨ [Nuevo] ", suffix: " - Oferta Limitada", ctrBoost: 0.1 },
      { prefix: "🔥 ¿Sabías esto? ", suffix: " (Últimos días)", ctrBoost: -0.2 },
      { prefix: "💡 Tip rápido: ", suffix: " 🚀 ¡Prueba ya!", ctrBoost: 0.3 },
      { prefix: "⚠️ Alerta: ", suffix: " 🎯 No te lo pierdas", ctrBoost: 0.05 },
      { prefix: "🔒 Acceso Exclusivo: ", suffix: " 💎 ¡Ver ahora!", ctrBoost: 0.4 }
    ];

    const fullCreatives: any[] = [];
    let count = 1;

    for (const base of baseTemplates) {
      for (let vIdx = 0; vIdx < 5; vIdx++) {
        const variation = variations[vIdx];
        const plat = platforms[(vIdx + count) % platforms.length];
        
        // Slightly vary the CTR and conversion rates based on the platform and variation boost
        const ctr = Math.min(6.5, Math.max(1.1, parseFloat((base.estimatedCtr + variation.ctrBoost + (Math.random() * 0.4 - 0.2)).toFixed(2))));
        const conv = Math.min(4.5, Math.max(0.5, parseFloat((base.estimatedConversionRate + (variation.ctrBoost * 0.5) + (Math.random() * 0.2 - 0.1)).toFixed(2))));

        fullCreatives.push({
          id: `creative-${count}`,
          title: `Creativo #${count}: Ángulo ${base.angle} (${plat})`,
          angle: base.angle,
          headline: `${variation.prefix}${base.headline}${variation.suffix}`.slice(0, 60),
          hook: `${variation.prefix}${base.hook}`.slice(0, 100),
          bodyCopy: `${base.bodyCopy} ${variation.suffix}`.slice(0, 350),
          cta: base.cta,
          imagePrompt: base.imagePrompt,
          platform: plat,
          estimatedCtr: ctr,
          estimatedConversionRate: conv,
          targetAudience: base.targetAudience
        });
        count++;
      }
    }

    // Ensure we have exactly 50! (If API returned fewer than 10, fill up with mocks)
    while (fullCreatives.length < 50) {
      const idx = fullCreatives.length;
      fullCreatives.push({
        id: `creative-${idx + 1}`,
        title: `Creativo #${idx + 1}: Alternativa Dinámica`,
        angle: "Direct Offer",
        headline: `Optimiza tu negocio hoy mismo - Demo #${idx + 1}`,
        hook: `¡Transformación al instante con nuestro método comprobado!`,
        bodyCopy: `Acelera tus resultados publicitarios. Creado por nuestro estratega Santi y validado por Mateo de analíticas. Pruébalo hoy.`,
        cta: "Más información",
        imagePrompt: `A polished, highly converting marketing visual showing success metrics growing up.`,
        platform: "Instagram Stories",
        estimatedCtr: parseFloat((1.8 + Math.random() * 2.5).toFixed(2)),
        estimatedConversionRate: parseFloat((0.9 + Math.random() * 1.5).toFixed(2)),
        targetAudience: audience || "Empresas y creadores"
      });
    }

    res.json({ creatives: fullCreatives.slice(0, 50), isMock: false });
  } catch (error) {
    console.error("Error generating creatives via Gemini:", error);
    res.json({ creatives: generateMockCreatives(description, niche, audience), isMock: true, error: "Fallo de API, usando fallback inteligente." });
  }
});

// 2. ENDPOINT: Generate Carousels for Instagram/LinkedIn
app.post("/api/generate-carousel", async (req, res) => {
  const { topic, slideCount, platform, tone, engine } = req.body;
  const count = slideCount || 5;
  const selectedEngine = engine || "gemini";

  const getMockCarousel = (isClaudeFallback = false) => {
    const slides = [];
    const colors = [
      { bg: "#FCE22A", text: "#111112", accent: "#000000" }, // Nano Banana Yellow 🍌
      { bg: "#0f172a", text: "#f8fafc", accent: "#fbbf24" }, // Slate Dark with Gold Accent
      { bg: "#1e1b4b", text: "#f8fafc", accent: "#ec4899" }, // indigo pink
      { bg: "#022c22", text: "#f0fdf4", accent: "#2dd4bf" }, // Emerald Deep
      { bg: "#7c2d12", text: "#fff7ed", accent: "#fdba74" }  // Amber Orange
    ];
    const theme = colors[Math.floor(Math.random() * colors.length)];

    for (let i = 1; i <= count; i++) {
      let slideTitle = "";
      let slideBody = "";
      let visualIdea = "";

      if (i === 1) {
        slideTitle = `🔥 El Secreto de ${topic || "Ventas"} (vía Claude)`;
        slideBody = "Desliza para descubrir cómo multiplicar tus resultados usando metodologías ágiles de marketing.";
        visualIdea = "Bold title centered with a futuristic sleek black neon graphic or high contrast structure.";
      } else if (i === count) {
        slideTitle = "🚀 ¡Comienza Hoy Mismo!";
        slideBody = "Guarda este post, compártelo con tu equipo y envíanos un DM para diseñar tu estrategia personalizada.";
        visualIdea = "Minimalist bookmark icon representing save and share with high contrast accents.";
      } else {
        slideTitle = `Paso 0${i - 1}: Optimiza tu Conversión`;
        slideBody = `Implementa flujos automatizados para testear creativos y acelerar la toma de decisiones con datos reales.`;
        visualIdea = `Sleek high-contrast geometric outline pattern or upward vector trend.`;
      }

      slides.push({
        slideNumber: i,
        title: slideTitle,
        body: slideBody,
        visualIdea: visualIdea,
        bgGradientStart: theme.bg,
        bgGradientEnd: theme.bg === "#FCE22A" ? "#FCD900" : (theme.bg === "#0f172a" ? "#1e293b" : theme.bg + "ee"),
        textColor: theme.text,
        accentColor: theme.accent
      });
    }
    return { 
      slides, 
      platform: platform || "Instagram", 
      topic: topic || "Contenido",
      engineUsed: isClaudeFallback ? "Claude Haiku (Simulación)" : "Gemini (Simulación)"
    };
  };

  if (selectedEngine === "claude") {
    const userAnthropicKey = req.headers["x-anthropic-key"] as string || req.headers["X-Anthropic-Key"] as string;
    let activeAnthropicClient = anthropicClient;
    
    if (userAnthropicKey && userAnthropicKey.trim() !== "") {
      try {
        activeAnthropicClient = new Anthropic({
          apiKey: userAnthropicKey.trim()
        });
      } catch (err) {
        console.error("Failed to initialize custom Anthropic client:", err);
      }
    }

    if (!activeAnthropicClient) {
      console.log("No valid ANTHROPIC_API_KEY found, running Claude in demo fallback mode.");
      return res.json({ 
        ...getMockCarousel(true), 
        isMock: true, 
        warning: "Usando simulación de Claude Haiku. Configura tu API Key en la sección de Integraciones para habilitar la API real." 
      });
    }

    try {
      console.log(`[Claude API] Generating carousel with Claude Haiku for topic: ${topic}`);
      const prompt = `You are Santi, the Content Strategist AI, and Lauti, the Scriptwriter.
Generate a structured Carousel presentation of exactly ${count} slides for the platform: ${platform || "Instagram"}.
Topic: ${topic}
Tone of Voice: ${tone || "Professional & Persuasive"}

For each slide from 1 to ${count}, generate:
1. slideNumber: number (1 to ${count})
2. title: An extremely punchy slide headline (max 50 chars)
3. body: The slide explanation text or bullet points (max 180 chars)
4. visualIdea: Description of the background graphics, icons, or vector elements that should go on the canvas
5. bgGradientStart: A professional hex color code matching the tone (e.g. #FCE22A for Nano Banana Yellow, or #0f172a, or #022c22)
6. bgGradientEnd: A complementary hex color code to finish the gradient (e.g. #FCD900 for Banana Yellow, or #1e293b for Slate)
7. textColor: A highly readable hex color code for text (e.g. #FFFFFF, #000000 or #111112 for light backgrounds like Banana Yellow)
8. accentColor: A vibrant hex color code for highlighting key words (e.g. #000000 on yellow, or #fbbf24 on Slate)

Note: Slide 1 MUST be a high-conversion Cover slide. Slide ${count} MUST be an engaging Call-To-Action (CTA) slide.
Return strictly a valid JSON object matching this TypeScript structure:
{
  "slides": Array<{
    "slideNumber": number,
    "title": string,
    "body": string,
    "visualIdea": string,
    "bgGradientStart": string,
    "bgGradientEnd": string,
    "textColor": string,
    "accentColor": string
  }>,
  "platform": string,
  "topic": string
}
Do not write any preamble, explanation, or markdown backtick block. Just the raw JSON string.`;

      const response = await activeAnthropicClient.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 3500,
        temperature: 0.75,
        system: "You are a master of high-converting social media carousels. You output only raw, valid JSON matching the requested schema and nothing else. No explanation, no backticks.",
        messages: [{ role: "user", content: prompt }]
      });

      let responseText = "";
      if (response.content[0].type === "text") {
        responseText = response.content[0].text;
      }

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.substring(3);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      const parsed = JSON.parse(cleanJson);
      return res.json({ ...parsed, isMock: false, engineUsed: "Claude Haiku" });
    } catch (error: any) {
      console.error("Error generating carousel via Claude Haiku:", error);
      return res.json({ 
        ...getMockCarousel(true), 
        isMock: true, 
        error: `Fallo la API de Claude Haiku: ${error.message || error}. Usando simulación de carrusel.` 
      });
    }
  }

  // Gemini engine flow (Default)
  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    return res.json({ ...getMockCarousel(false), isMock: true });
  }

  try {
    const prompt = `You are Santi, the Content Strategist AI, and Lauti, the Scriptwriter.
Generate a structured Carousel presentation of exactly ${count} slides for the platform: ${platform || "Instagram"}.
Topic: ${topic}
Tone of Voice: ${tone || "Professional & Persuasive"}

For each slide from 1 to ${count}, generate:
1. slideNumber: number (1 to ${count})
2. title: An extremely punchy slide headline (max 50 chars)
3. body: The slide explanation text or bullet points (max 180 chars)
4. visualIdea: Description of the background graphics, icons, or vector elements that should go on the canvas
5. bgGradientStart: A professional hex color code matching the tone (e.g. Dark Slate, Deep Indigo, Bold Teal)
6. bgGradientEnd: A complementary hex color code to finish the gradient
7. textColor: A highly readable hex color code for text (e.g. #FFFFFF or #000000)
8. accentColor: A vibrant hex color code for highlighting key words

Note: Slide 1 MUST be a high-conversion Cover slide. Slide ${count} MUST be an engaging Call-To-Action (CTA) slide.
Return strictly valid JSON conforming to the requested schema. No markdown wrapping.`;

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slideNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  body: { type: Type.STRING },
                  visualIdea: { type: Type.STRING },
                  bgGradientStart: { type: Type.STRING },
                  bgGradientEnd: { type: Type.STRING },
                  textColor: { type: Type.STRING },
                  accentColor: { type: Type.STRING }
                },
                required: ["slideNumber", "title", "body", "visualIdea", "bgGradientStart", "bgGradientEnd", "textColor", "accentColor"]
              }
            },
            platform: { type: Type.STRING },
            topic: { type: Type.STRING }
          },
          required: ["slides", "platform", "topic"]
        }
      }
    }, activeAi);

    const parsed = JSON.parse(response.text || "{}");
    res.json({ ...parsed, isMock: false, engineUsed: "Gemini" });
  } catch (error) {
    console.error("Error generating carousel:", error);
    res.json({ ...getMockCarousel(false), isMock: true, error: "Fallo de API, usando fallback inteligente." });
  }
});

// 2.b ENDPOINT: Generate a real AI image for a carousel slide using Nano Banana
app.post("/api/generate-carousel-image", async (req, res) => {
  const { prompt, slideTitle, slideBody, visualIdea, platform, topic, accentColor, bgGradientStart, imageModel, referenceImage } = req.body;

  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    return res.json({
      image: null,
      isMock: true,
      warning: "No hay API Key de Gemini configurada. Agrega tu clave en Integraciones para generar imágenes reales con Nano Banana.",
    });
  }

  // Compose a rich visual prompt for Nano Banana. We instruct it to leave room
  // for text and to avoid rendering letters (the app overlays the copy itself).
  const aspect = platform === "Instagram"
    ? "vertical 4:5 portrait composition (1080x1350)"
    : "square 1:1 composition (1080x1080)";

  const fullPrompt = (prompt && String(prompt).trim().length > 0)
    ? `Generate a high-end social media carousel slide background image. ${aspect}. ${prompt}. Premium advertising design, clean composition with generous negative space for overlaid text, no text or letters in the image, ultra high quality, 4k.`
    : `Generate a stunning, premium social media carousel slide background image.
${aspect}.
Carousel topic: ${topic || "marketing"}.
Slide headline (for context, do NOT render it): "${slideTitle || ""}".
Slide message (for context, do NOT render it): "${slideBody || ""}".
Visual concept: ${visualIdea || "modern abstract marketing visual"}.
Style: modern, high-end premium advertising design, cinematic lighting, clean composition with generous negative space so text can be overlaid later. ${accentColor || bgGradientStart ? `Color palette inspired by ${bgGradientStart || ""} ${accentColor || ""}.` : ""}
Important: do NOT render any text, words or letters in the image. Photorealistic or sleek vector illustration. Ultra high quality, 4k.`;

  // If a reference image is supplied, send it alongside the prompt so the model
  // can use it as the main subject (Nano Banana supports image-to-image).
  let contents: any = fullPrompt;
  if (referenceImage && typeof referenceImage === "string" && referenceImage.includes("base64,")) {
    const [meta, b64] = referenceImage.split("base64,");
    const mimeType = meta.split(":")[1]?.split(";")[0] || "image/png";
    contents = {
      parts: [
        { inlineData: { mimeType, data: b64 } },
        { text: `${fullPrompt} Use the provided image as the main subject/product and integrate it tastefully into the composition.` },
      ],
    };
  }

  const isPro = imageModel === "pro";
  const models = isPro ? NANO_BANANA_PRO_MODELS : NANO_BANANA_MODELS;

  try {
    const image = await generateNanoBananaImage(contents, { customAi: activeAi, models });
    if (!image) {
      return res.json({
        image: null,
        isMock: true,
        error: "Nano Banana no devolvió ninguna imagen. Reintenta en unos segundos o revisa tu cuota de Gemini.",
      });
    }
    res.json({ image, isMock: false, engineUsed: isPro ? "Nano Banana Pro (gemini-3-pro-image)" : "Nano Banana (gemini-2.5-flash-image)" });
  } catch (error: any) {
    console.error("Error generating carousel image via Nano Banana:", error);
    const msg = (error?.message || String(error)).toLowerCase();
    const friendly = msg.includes("quota") || msg.includes("429") || msg.includes("exhausted")
      ? "Se alcanzó el límite de cuota de la API de Gemini para imágenes. Intenta de nuevo más tarde o usa tu propia API Key."
      : `No se pudo generar la imagen con Nano Banana: ${error?.message || error}`;
    res.json({ image: null, isMock: true, error: friendly });
  }
});
// 3. ENDPOINT: Generate copies based on Copywriting Frameworks
app.post("/api/generate-copys", async (req, res) => {
  const { topic, framework, tone } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Topic is required" });
  }

  const getMockCopys = () => {
    return {
      framework: framework || "AIDA",
      copys: [
        {
          hook: `¿Sabías que el 90% de los negocios fallan por no tener una oferta atractiva?`,
          body: `Lanzar anuncios sin un mensaje persuasivo es tirar dinero. Con nuestra suite, automatizas la creación de copys y creativos en minutos con inteligencia artificial validada.`,
          cta: `👉 Toca el botón para registrarte gratis hoy mismo y duplicar tu CTR.`,
          commentary: `Santi comenta: 'Este copy ataca el dolor de la conversión directa con una llamada de atención clásica. Funciona de maravilla para Meta Ads.'`
        },
        {
          hook: `El truco de un solo clic para generar 50 creativos de publicidad:`,
          body: `No necesitas contratar agencias costosas ni estresarte diseñando carruseles. Nuestra IA se encarga de estructurar ideas, guiones, métricas y automatizaciones por ti en un solo lugar.`,
          cta: `🚀 Empieza gratis ahora y obtén tu calendario mensual personalizado.`,
          commentary: `Lauti comenta: 'Usamos un hook de curiosidad y eliminamos la fricción de diseño. Perfecto para carruseles de Instagram.'`
        }
      ]
    };
  };

  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    return res.json(getMockCopys());
  }

  try {
    const prompt = `You are Santi (Estratega de Contenido) and Lauti (Guionista).
Create 3 variations of persuasive advertising copy for the topic: "${topic}".
Framework: ${framework || "AIDA (Attention, Interest, Desire, Action)"}.
Tone: ${tone || "Directo y Persuasivo"}.

For each variation, generate:
1. hook: An attention-grabbing hook (1 sentence)
2. body: The interest & desire builder paragraphs (2-3 sentences)
3. cta: Clear Call-To-Action sentence with emojis
4. commentary: A expert tip from either Santi or Lauti in Spanish explaining why this copy converts and which audience it targets.

Return strictly valid JSON conforming to the requested schema. No markdown wrapping.`;

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            framework: { type: Type.STRING },
            copys: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hook: { type: Type.STRING },
                  body: { type: Type.STRING },
                  cta: { type: Type.STRING },
                  commentary: { type: Type.STRING }
                },
                required: ["hook", "body", "cta", "commentary"]
              }
            }
          },
          required: ["framework", "copys"]
        }
      }
    }, activeAi);

    const parsed = JSON.parse(response.text || "{}");
    res.json({ ...parsed, isMock: false });
  } catch (error) {
    console.error("Error generating copys:", error);
    res.json({ ...getMockCopys(), isMock: true, error: "Fallo de API, usando fallback inteligente." });
  }
});

// 4. ENDPOINT: Generate monthly publication calendar (30 items)
app.post("/api/generate-calendar", async (req, res) => {
  const { niche, topic } = req.body;
  
  const getMockCalendar = () => {
    const list = [];
    const platforms = ["Instagram Carousel", "Meta Ads Banner", "LinkedIn Post", "TikTok Reel/Video", "YouTube Short"];
    const contentPillars = ["Educativo", "Venta Directa", "Detrás de Escena", "Autoridad/Métrica", "Entretenimiento"];
    const ideas = [
      "3 Errores comunes al optimizar presupuestos",
      "El método definitivo paso a paso para duplicar leads",
      "Detrás de escena: Cómo nuestro equipo IA planea contenido",
      "Estudio de caso: Cómo escalamos un cliente de e-commerce",
      "Tip rápido de copywriting que puedes aplicar hoy mismo",
      "¿Por qué tu contenido actual no está atrayendo clientes calificados?"
    ];

    for (let day = 1; day <= 30; day++) {
      const plat = platforms[day % platforms.length];
      const pillar = contentPillars[day % contentPillars.length];
      const baseIdea = ideas[day % ideas.length];

      list.push({
        day: day,
        title: `${baseIdea} - Día ${day}`,
        description: `Plan de contenido enfocado en educar y convertir. Creado en base a las directivas semanales.`,
        platform: plat,
        pillar: pillar,
        time: `${9 + (day % 3) * 4}:30`,
        status: day < 5 ? "Publicado" : day < 12 ? "Programado" : "Borrador",
        copy: `¿Estás cometiendo este error? ${baseIdea}. Muchos profesionales pierden hasta 4 horas al día intentando solucionarlo a mano. Aquí te enseño la clave para automatizarlo.`
      });
    }
    return { calendar: list, niche: niche || "Marketing Digital" };
  };

  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    return res.json(getMockCalendar());
  }

  try {
    const prompt = `You are Cami (Ideadora) and Facu (Encargado de Publicación).
Generate a custom monthly publication calendar (exactly 30 days) for a brand in this niche: "${niche || "Servicios Digitales"}" focusing on "${topic || "Crecimiento y Ventas"}".

Generate a list of 15 highly detailed unique calendar entries. We will interpolate them to make a 30-day calendar. For each entry, provide:
1. day: number (1 to 15)
2. title: Catchy title for the post
3. description: Content outline and goal of the post
4. platform: Recommended social platform ("Instagram Carousel", "Meta Ads Banner", "LinkedIn Post", "TikTok Reel", "YouTube Short")
5. pillar: Content pillar ("Educativo", "Venta Directa", "Detrás de Escena", "Autoridad", "Inspiracional")
6. time: Scheduled time string (e.g. "10:00", "15:30", "19:00")
7. copy: Draft social copy with interactive hook and CTA

Return strictly valid JSON conforming to the requested schema. No markdown wrapping.`;

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calendar: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  pillar: { type: Type.STRING },
                  time: { type: Type.STRING },
                  copy: { type: Type.STRING }
                },
                required: ["day", "title", "description", "platform", "pillar", "time", "copy"]
              }
            }
          },
          required: ["calendar"]
        }
      }
    }, activeAi);

    const parsed = JSON.parse(response.text || "{}");
    const generatedList = parsed.calendar || [];
    
    // Smoothly expand to exactly 30 items for a full calendar
    const fullCalendar = [];
    const platforms = ["Instagram Carousel", "Meta Ads Banner", "LinkedIn Post", "TikTok Reel", "YouTube Short"];
    const pillars = ["Educativo", "Venta Directa", "Detrás de Escena", "Autoridad", "Inspiracional"];

    for (let i = 1; i <= 30; i++) {
      const match = generatedList.find((item: any) => item.day === i);
      if (match) {
        fullCalendar.push({
          ...match,
          day: i,
          status: i < 5 ? "Publicado" : i < 15 ? "Programado" : "Borrador"
        });
      } else {
        const baseItem = generatedList[i % generatedList.length] || {
          title: `Estrategia de Crecimiento Avanzada`,
          description: `Análisis de automatizaciones para aumentar la conversión de leads.`,
          platform: platforms[i % platforms.length],
          pillar: pillars[i % pillars.length],
          time: "11:30",
          copy: `¿Estás cansado de diseñar contenido sin rumbo? Te muestro el sistema exacto que usan los líderes del sector para programar sus creativos.`
        };

        fullCalendar.push({
          day: i,
          title: `${baseItem.title} (Var #${i})`,
          description: baseItem.description,
          platform: platforms[i % platforms.length],
          pillar: pillars[i % pillars.length],
          time: baseItem.time || "11:30",
          copy: baseItem.copy,
          status: i < 5 ? "Publicado" : i < 15 ? "Programado" : "Borrador"
        });
      }
    }

    res.json({ calendar: fullCalendar, niche: niche || "General", isMock: false });
  } catch (error) {
    console.error("Error generating calendar:", error);
    res.json({ ...getMockCalendar(), isMock: true, error: "Fallo de API, usando fallback inteligente." });
  }
});

// 5. ENDPOINT: Generate Cami's 30+ Ideas
app.post("/api/generate-ideas", async (req, res) => {
  const { niche, goal } = req.body;

  const getMockIdeas = () => {
    const list = [];
    const pillars = ["Gancho Fuerte (Hook)", "Dolor / Solución", "Estudio de Caso", "Tendencia Viral", "Educativo Rápido", "Llamado a la Acción Directo"];
    for (let i = 1; i <= 32; i++) {
      const pillar = pillars[i % pillars.length];
      list.push({
        id: `idea-${i}`,
        title: `Ángulo #${i}: ${pillar} para ${niche || "Negocios"}`,
        concept: `Idea de contenido para detonar interacción mostrando cómo resolver un problema típico con ${goal || "automatización"}.`,
        hookIdea: `¿Por qué el 99% de los anuncios fallan en el segundo 3? Por esto...`,
        visualIdea: `Un sticker pixelart de Cami con café señalando un gráfico dinámico.`
      });
    }
    return { ideas: list };
  };

  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    return res.json(getMockIdeas());
  }

  try {
    const prompt = `You are Cami (Ideadora), who is playful, fast-paced, and generates highly innovative content angles.
Generate exactly 30 unique, winning social media content ideas / angles for a business in the niche: "${niche || "e-commerce"}".
Goal of the content: "${goal || "Get clients and increase views"}".

For each idea, output:
1. title: A catchy short title of the idea
2. concept: The core message or content explanation
3. hookIdea: An attention-grabbing hook recommendation
4. visualIdea: High-level dynamic graphic or video setup prompt

Return strictly valid JSON with an array named "ideas" containing these 30 items. No markdown wrapping.`;

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ideas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  concept: { type: Type.STRING },
                  hookIdea: { type: Type.STRING },
                  visualIdea: { type: Type.STRING }
                },
                required: ["title", "concept", "hookIdea", "visualIdea"]
              }
            }
          },
          required: ["ideas"]
        }
      }
    }, activeAi);

    const parsed = JSON.parse(response.text || "{}");
    // Ensure we have exactly 30 items
    let ideasList = parsed.ideas || [];
    if (ideasList.length < 30) {
      const mockFiller = getMockIdeas().ideas;
      ideasList = [...ideasList, ...mockFiller.slice(0, 30 - ideasList.length)];
    }
    res.json({ ideas: ideasList.slice(0, 32), isMock: false });
  } catch (error) {
    console.error("Error generating ideas:", error);
    res.json({ ...getMockIdeas(), isMock: true, error: "Fallo de API, usando fallback inteligente." });
  }
});

// Autonomous Campaign Mastermind (Autopilot Engine)
app.post("/api/generate-autopilot", async (req, res) => {
  const { product, audience, offer, objective } = req.body;
  if (!product) {
    return res.status(400).json({ error: "Product name/description is required" });
  }

  const getMockAutopilot = () => {
    return {
      strategy: {
        campaignName: `Lanzamiento Autónomo: ${product.slice(0, 30)}`,
        targetAudience: audience || "Propietarios de viviendas, profesionales tecnológicos y entusiastas del confort inteligente.",
        marketingAngles: [
          "Ángulo de Seguridad: Control absoluto de cerraduras, cámaras y accesos desde el celular estés donde estés.",
          "Ángulo de Confort y Estilo de Vida: Llegar a casa con la temperatura ideal, luces tenues y tu playlist favorita reproduciéndose.",
          "Ángulo de Ahorro Energético: Programación inteligente que disminuye el gasto eléctrico hasta un 32% mensual."
        ],
        distributionRecommendation: "50% de presupuesto para Meta Ads (Conversiones), 30% Instagram Reels Ads, 20% LinkedIn Social Ads para ejecutivos y profesionales de alto poder adquisitivo."
      },
      copys: [
        {
          hook: "❌ ¿Sigues preocupado si dejaste la cerradura abierta o las luces encendidas al salir de casa?",
          body: `El estrés de dudar ya es cosa del pasado. Domotiza tu hogar en un solo día y controla seguridad, iluminación y temperatura desde tu celular con un sistema inteligente autogestionable de nivel premium.`,
          cta: `👉 Consigue tu asesoramiento de instalación 100% GRATIS ingresando aquí:`,
          commentary: `Santi comenta: 'Usamos un gancho de dolor clásico enfocado en la tranquilidad mental del usuario. Es ideal para conversiones directas en Facebook Ads.'`,
          estimatedCtr: "3.4%",
          targetBuyerEmotion: "Tranquilidad / Alivio del estrés"
        },
        {
          hook: "Llegar a casa después de un día agotador de trabajo y que se sienta como un hotel de 5 estrellas... 🏰",
          body: `Climatización perfecta, luces tenues listas para relajarte y tu música preferida sonando. Eso no es el futuro, es tu casa hoy. Simplifica tu rutina con automatizaciones inteligentes diseñadas para tu estilo de vida.`,
          cta: `🚀 Toca abajo y reclama hoy un 15% de descuento especial en el Hub Central de control inteligente:`,
          commentary: `Lauti comenta: 'Estilo de vida aspiracional. El usuario se visualiza disfrutando del confort inmediato. Gran enganche visual para Instagram Reels.'`,
          estimatedCtr: "4.1%",
          targetBuyerEmotion: "Estatus / Confort Extremo"
        },
        {
          hook: "La forma más inteligente de recortar hasta un 32% en tu factura de luz (sin pasar frío ni calor):",
          body: `Los termostatos y sensores inteligentes apagan la climatización cuando no hay nadie en la habitación. Invierte en tecnología que se paga sola optimizando el consumo de energía de forma autónoma.`,
          cta: `⚡ Haz clic aquí y descubre cómo configurar tu casa inteligente de forma económica:`,
          commentary: `Mateo comenta: 'Ángulo racional financiero. Apela a la optimización de gastos y la eficiencia de recursos. Funciona excelente en LinkedIn.'`,
          estimatedCtr: "2.9%",
          targetBuyerEmotion: "Ahorro / Sentido de Inteligencia Financiera"
        }
      ],
      carousel: [
        {
          slideNumber: 1,
          title: "Tu Hogar en Piloto Automático",
          body: "Descubre cómo la domótica moderna transforma tu seguridad y confort diario sin cables complejos.",
          visualIdea: "Ilustración minimalista de un hogar moderno conectado con líneas de luz brillantes que van hacia un smartphone.",
          bgGradientStart: "#141416",
          bgGradientEnd: "#1F1F22"
        },
        {
          slideNumber: 2,
          title: "Seguridad Inteligente 24/7",
          body: "Cierra puertas, monitorea cámaras y recibe alertas críticas directamente en tu reloj o teléfono.",
          visualIdea: "Primer plano de una cerradura biométrica táctil elegante iluminándose en verde ante una huella.",
          bgGradientStart: "#0F1611",
          bgGradientEnd: "#1A2E1C"
        },
        {
          slideNumber: 3,
          title: "Confort que se Anticipa",
          body: "Configura ambientes según tu estado de ánimo: modo cine, modo descanso o modo concentración instantánea.",
          visualIdea: "Living de diseño con luces LED indirectas en tonos cálidos y una tablet mostrando los controles táctiles.",
          bgGradientStart: "#1A1510",
          bgGradientEnd: "#2F2315"
        },
        {
          slideNumber: 4,
          title: "Ahorra en Cada Factura",
          body: "La climatización y las luces se apagan automáticamente cuando no hay nadie en los ambientes.",
          visualIdea: "Pantalla flotante de un termostato digital inteligente mostrando un ícono de hoja verde y un porcentaje de ahorro.",
          bgGradientStart: "#0D1A1F",
          bgGradientEnd: "#152F38"
        },
        {
          slideNumber: 5,
          title: "15% OFF en tu Hub Central",
          body: "Empieza hoy mismo con nuestro kit inicial y obtén asesoramiento de instalación premium totalmente gratis.",
          visualIdea: "El Hub inteligente central (caja compacta de diseño sobrio) con un botón 'Comprar' en contraste amarillo.",
          bgGradientStart: "#1E1E12",
          bgGradientEnd: "#33331A"
        }
      ],
      landingPage: {
        headline: offer || "Consigue tu Asesoramiento de Instalación 100% GRATIS y Transforma tu Hogar Hoy",
        subheadline: `Disfruta del máximo confort, seguridad total y ahorro energético inteligente en tu casa o departamento sin complicaciones de cableado.`,
        benefits: [
          "Cerraduras y cámaras inteligentes controladas desde cualquier parte del mundo.",
          "Climatización adaptada de forma automática que disminuye hasta un 32% de consumo eléctrico.",
          "Luces, cortinas y audio integrados en escenas personalizables en un solo clic.",
          "Instalación premium limpia realizada en 24 horas por ingenieros especializados."
        ],
        ctaText: "QUIERO ASESORAMIENTO GRATUITO",
        leadFormTitle: "Completa tus datos para recibir tu diagnóstico gratuito",
        rawHtml: `<!-- Landing Page optimizada por AdTeam AI -->
<div class="bg-black text-white font-sans min-h-screen">
  <nav class="border-b border-zinc-800 py-4 px-6 flex justify-between items-center max-w-6xl mx-auto">
    <div class="flex items-center gap-2">
      <span class="text-lime-400 font-bold tracking-wider font-mono text-lg">SMART DOMO</span>
    </div>
    <span class="bg-lime-400/10 text-lime-400 border border-lime-400/30 text-xs px-3 py-1 rounded-full font-mono">Oferta Exclusiva Activa</span>
  </nav>

  <header class="max-w-6xl mx-auto px-6 py-12 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
    <div class="md:col-span-7 space-y-6">
      <h1 class="text-3xl md:text-5xl font-black tracking-tight leading-tight">
        ${offer || "La casa del futuro, hoy: Confort, Seguridad y Ahorro"}.
      </h1>
      <p class="text-zinc-400 text-lg md:text-xl font-light">
        ${audience || "Sincroniza cerraduras, luces y temperatura en un sistema centralizado que puedes gestionar directamente desde tu teléfono."}
      </p>
      
      <ul class="space-y-3.5 text-sm md:text-base text-zinc-300">
        <li class="flex items-center gap-3">
          <span class="text-lime-400">✔</span> Cerraduras biométricas y cámaras con alertas críticas en tiempo real.
        </li>
        <li class="flex items-center gap-3">
          <span class="text-lime-400">✔</span> Disminución garantizada de hasta 32% en facturas energéticas mediante sensores autónomos.
        </li>
        <li class="flex items-center gap-3">
          <span class="text-lime-400">✔</span> Instalación ultra-limpia sin romper paredes, lista en menos de 24 horas.
        </li>
      </ul>
    </div>

    <div class="md:col-span-5">
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-400 to-emerald-500"></div>
        <h3 class="text-lg font-bold text-white mb-2">Comienza Hoy Mismo</h3>
        <p class="text-xs text-zinc-400 mb-6">Completa tus datos para recibir tu diagnóstico de domótica y cotización 100% gratuita.</p>
        
        <form class="space-y-4" onsubmit="event.preventDefault(); alert('¡Datos de lead registrados con éxito! Simulación de base de datos capturada.');">
          <div>
            <label class="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Nombre Completo</label>
            <input type="text" placeholder="Ej: Carlos Pérez" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-lime-400" required />
          </div>
          <div>
            <label class="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Correo Electrónico</label>
            <input type="email" placeholder="Ej: carlos@gmail.com" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-lime-400" required />
          </div>
          <div>
            <label class="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1">Teléfono / WhatsApp</label>
            <input type="tel" placeholder="Ej: +54 9 11 1234 5678" class="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-lime-400" required />
          </div>
          <button type="submit" class="w-full bg-lime-400 text-black py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-lime-300 transition duration-300">
            SOLICITAR ASESORAMIENTO GRATIS
          </button>
        </form>
      </div>
    </div>
  </header>
</div>`
      },
      leadMagnet: {
        title: "La Guía Definitiva del Hogar Conectado: Confort, Seguridad y Ahorro sin obras",
        introduction: "Bienvenido a la guía práctica diseñada para ayudarte a entender la domótica real, alejada de mitos costosos, y orientada a mejorar la calidad de vida de tu familia ahorrando hasta un 32% de energía desde el primer mes.",
        chapters: [
          {
            chapterNumber: 1,
            chapterTitle: "La Tríada Dorada: Iluminación, Climatización y Accesos",
            chapterBrief: "Cómo conectar las tres áreas clave de tu casa que generan el 80% del impacto en confort y seguridad, sin necesidad de rehacer cañerías ni picar paredes."
          },
          {
            chapterNumber: 2,
            chapterTitle: "Eficiencia Energética en Piloto Automático",
            chapterBrief: "Estrategias de configuración para termostatos, sensores de presencia y cortinas inteligentes que impiden el desperdicio eléctrico sin sacrificar el bienestar térmico."
          },
          {
            chapterNumber: 3,
            chapterTitle: "Plan de Transición en 3 Pasos",
            chapterBrief: "Cómo elegir el Hub inteligente correcto, priorizar los dispositivos de inicio y escalar el sistema de forma modular según tu presupuesto."
          }
        ]
      }
    };
  };

  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    return res.json({ ...getMockAutopilot(), isMock: true });
  }

  try {
    const prompt = `You are a group of 6 autonomous marketing agents collaborating in AdTeam AI:
1. Santi (Estratega): Defines direct-response strategy and budget split.
2. Lauti (Guionista): Writes AIDA/PAS persuasive copies.
3. Cami (Diseñadora): Outlines carousel visual structures.
4. Sofi (Operaciones): Drafts a High-Converting landing page copy & layout.
5. Facu (Calendario): Suggests a lead magnet ebook layout to capture subscribers.
6. Mateo (Analista): Predicts and scores the copies for maximum ROI.

Analyze this product: "${product}"
Ideal Customer Persona (Audience): "${audience || "General Public"}"
Core Offer: "${offer || "Special limited discount"}"
Campaign Objective: "${objective || "Lead Generation"}"

Return a comprehensive Campaign Package inside a single JSON object conforming strictly to the responseSchema provided.
Ensure all written copy, advice, slides, and raw HTML mockups are crafted in persuasive Spanish of high commercial standard.
For the landing page rawHtml property, write a beautiful, self-contained, responsive responsive marketing HTML page utilizing standard modern Tailwind CSS utility classes inside the tags.`;

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategy: {
              type: Type.OBJECT,
              properties: {
                campaignName: { type: Type.STRING },
                targetAudience: { type: Type.STRING },
                marketingAngles: { type: Type.ARRAY, items: { type: Type.STRING } },
                distributionRecommendation: { type: Type.STRING }
              },
              required: ["campaignName", "targetAudience", "marketingAngles", "distributionRecommendation"]
            },
            copys: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hook: { type: Type.STRING },
                  body: { type: Type.STRING },
                  cta: { type: Type.STRING },
                  commentary: { type: Type.STRING },
                  estimatedCtr: { type: Type.STRING },
                  targetBuyerEmotion: { type: Type.STRING }
                },
                required: ["hook", "body", "cta", "commentary", "estimatedCtr", "targetBuyerEmotion"]
              }
            },
            carousel: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  slideNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  body: { type: Type.STRING },
                  visualIdea: { type: Type.STRING },
                  bgGradientStart: { type: Type.STRING },
                  bgGradientEnd: { type: Type.STRING }
                },
                required: ["slideNumber", "title", "body", "visualIdea", "bgGradientStart", "bgGradientEnd"]
              }
            },
            landingPage: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                subheadline: { type: Type.STRING },
                benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
                ctaText: { type: Type.STRING },
                leadFormTitle: { type: Type.STRING },
                rawHtml: { type: Type.STRING }
              },
              required: ["headline", "subheadline", "benefits", "ctaText", "leadFormTitle", "rawHtml"]
            },
            leadMagnet: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                introduction: { type: Type.STRING },
                chapters: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      chapterNumber: { type: Type.INTEGER },
                      chapterTitle: { type: Type.STRING },
                      chapterBrief: { type: Type.STRING }
                    },
                    required: ["chapterNumber", "chapterTitle", "chapterBrief"]
                  }
                }
              },
              required: ["title", "introduction", "chapters"]
            }
          },
          required: ["strategy", "copys", "carousel", "landingPage", "leadMagnet"]
        }
      }
    }, activeAi);

    const parsed = JSON.parse(response.text || "{}");
    res.json({ ...parsed, isMock: false });
  } catch (error: any) {
    console.error("Error generating autopilot package:", error);
    res.json({ ...getMockAutopilot(), isMock: true, error: error.message || error });
  }
});


// Media Description & Social Media Caption Generator
app.post("/api/generate-media-description", async (req, res) => {
  const { image, mediaType, productName, targetTone, additionalNotes } = req.body;

  const getMockDescription = () => {
    return {
      description: "Se visualiza un gráfico publicitario con curvas ascendentes verdes que indican un aumento considerable del ROI, acompañado de una interfaz móvil minimalista con notificaciones de nuevos leads registrados.",
      linkedin: {
        hook: "📈 El 80% de los presupuestos de pauta digital se desperdicia por falta de segmentación inteligente y copys planos.",
        body: "Como directores de marketing y fundadores, sabemos el dolor de ver capital consumirse sin un retorno claro. Es por eso que nuestro equipo diseñó AdTeam AI: un ecosistema donde 6 agentes de IA orquestan tus campañas de forma autónoma, analizando datos y re-escribiendo variantes en tiempo real.\n\nEstas son las ventajas principales de integrar automatización táctica:\n1. Split inteligente de presupuesto entre Meta e Instagram.\n2. Generación iterativa de hooks basados en las emociones del comprador.\n3. Optimización basada en el CTR proyectado.",
        hashtags: ["#MarketingDigital", "#SaaS", "#InteligenciaArtificial", "#B2BMarketing"],
        cta: "🔗 ¿Te gustaría optimizar tu distribución hoy? Comenta 'DEMO' abajo y te enviamos un acceso exclusivo."
      },
      instagram: {
        hook: "Lanza campañas ganadoras mientras te enfocas en crecer tu marca ✨",
        body: "¡Basta de pasar horas redactando copys y editando carruseles que nadie lee! Con AdTeam AI, tienes un equipo entero trabajando en piloto automático para crear, pulir y lanzar tus anuncios en segundos.\n\n✨ Menos horas de trabajo manual, más conversiones.\n✨ Diseño visual moderno y adaptado a tu estilo.\n✨ Métricas unificadas sin salir de tu cockpit principal.",
        hashtags: ["#GrowthMarketing", "#Emprendimiento", "#ConsejosDeMarketing", "#SocialMediaTips"],
        cta: "👉 Visita el enlace de nuestra bio y solicita tu cotización de instalación 100% gratuita hoy mismo."
      },
      facebook: {
        hook: "🔥 ¡No adivines qué anuncio vende más! Consigue 50 variantes optimizadas hoy.",
        body: "Diseña, segmenta y publica anuncios de conversión profesionales sin el costo elevado de una agencia tradicional. Ideal para pequeños negocios, prestadores de servicios y creadores que buscan maximizar el retorno de inversión de forma inmediata.",
        hashtags: ["#FacebookAds", "#Emprendedores", "#PublicidadDigital", "#VentasOnline"],
        cta: "🚀 Toca el botón de abajo y accede a tu diagnóstico gratuito ahora mismo."
      }
    };
  };

  const activeAi = getCustomAiClient(req) || ai;
  if (!activeAi) {
    return res.json({ ...getMockDescription(), isMock: true });
  }

  try {
    let parts: any[] = [];
    if (image && image.includes("base64,")) {
      const partsArr = image.split("base64,");
      const mimeType = partsArr[0].split(":")[1].split(";")[0];
      const base64Data = partsArr[1];
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }

    const textPrompt = `You are an elite multi-channel social media copywriter.
Analyze the following parameters:
- Media Type: ${mediaType || "image"}
- Related Product/Campaign: ${productName || "General marketing content"}
- Intended Tone of Voice: ${targetTone || "Professional"}
- Additional Notes / User instructions: ${additionalNotes || "None"}

${image ? "An image has also been uploaded for context. Analyze the visual elements of this image to craft contextual copy references." : "No image was uploaded, create content based on the provided notes and product info."}

Return a cohesive social media campaign description package conforming strictly to the responseSchema.
All hooks, bodies, hashtags, and CTAs must be in Spanish, written in a compelling, high-converting, professional marketing standard.
Customize each channel's content:
- LinkedIn: Focus on industry insights, professional tone, structured bullets, value props, B2B engagement.
- Instagram: Highly aesthetic, visual-focused, friendly, generous emoji usage, interactive CTA (e.g., link in bio, comment interaction).
- Facebook: Direct-response, benefits-focused, clear value proposition, action-oriented CTA.`;

    parts.push({ text: textPrompt });

    const response = await generateContentWithFallback({
      model: "gemini-2.5-flash",
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            linkedin: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING },
                body: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                cta: { type: Type.STRING }
              },
              required: ["hook", "body", "hashtags", "cta"]
            },
            instagram: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING },
                body: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                cta: { type: Type.STRING }
              },
              required: ["hook", "body", "hashtags", "cta"]
            },
            facebook: {
              type: Type.OBJECT,
              properties: {
                hook: { type: Type.STRING },
                body: { type: Type.STRING },
                hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                cta: { type: Type.STRING }
              },
              required: ["hook", "body", "hashtags", "cta"]
            }
          },
          required: ["description", "linkedin", "instagram", "facebook"]
        }
      }
    }, activeAi);

    const parsed = JSON.parse(response.text || "{}");
    res.json({ ...parsed, isMock: false });
  } catch (error: any) {
    console.error("Error generating media description:", error);
    res.json({ ...getMockDescription(), isMock: true, error: error.message || error });
  }
});
// AI recommendations ("repeat / kill / tweak") from a set of metrics.
app.post("/api/recommendations", async (req, res) => {
  const { metrics, niche } = req.body || {};
  const activeAi = getCustomAiClient(req) || ai;

  const getMock = () => ({
    recommendations: [
      { action: "repeat", title: "Repetir carruseles educativos con tips concretos", reason: "Suelen tener más guardados y comentarios; el algoritmo premia el tiempo de permanencia.", priority: "alta" },
      { action: "kill", title: "Reducir posts solo-texto sin gancho visual", reason: "Bajo alcance frente a piezas visuales: el primer segundo no retiene.", priority: "media" },
      { action: "tweak", title: "Agregar CTA de comentario en la última slide", reason: "Aumenta interacción y señal de relevancia.", priority: "media" },
    ],
  });

  if (!activeAi) return res.json({ ...getMock(), isMock: true });

  try {
    const prompt = `Eres Mateo, analista de performance de marketing. A partir de estas métricas de publicaciones (JSON), da recomendaciones accionables de qué REPETIR, qué MATAR y qué AJUSTAR para mejorar alcance y conversión${niche ? ` en el nicho ${niche}` : ""}.
Métricas: ${JSON.stringify(metrics || []).slice(0, 4000)}
Devuelve JSON con un array "recommendations" de 4-6 objetos { action: "repeat"|"kill"|"tweak", title, reason, priority: "alta"|"media"|"baja" }. En español, conciso y accionable.`;
    const response = await generateContentWithFallback(
      {
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    action: { type: Type.STRING },
                    title: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    priority: { type: Type.STRING },
                  },
                  required: ["action", "title", "reason", "priority"],
                },
              },
            },
            required: ["recommendations"],
          },
        },
      },
      activeAi
    );
    const parsed = JSON.parse(response.text || "{}");
    res.json({ ...parsed, isMock: false });
  } catch (error: any) {
    console.error("Error generating recommendations:", error);
    res.json({ ...getMock(), isMock: true, error: error.message || error });
  }
});
}
