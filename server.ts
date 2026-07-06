// AdTeam AI server entrypoint. Route implementations live in ./server/*:
//   aiRoutes          — AI generation endpoints (Gemini/Claude + Nano Banana)
//   storeRoutes       — persistence (projects, posts, scheduled, calendar), mail, uploads
//   integrationRoutes — OAuth URLs, popup callbacks, integrations test proxy
//   socialRoutes      — real LinkedIn/Meta publishing + Instagram metrics
//   scheduler         — auto-publishing worker (direct function calls)
import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { ensureUploadsDir, UPLOADS_DIR } from "./imageStore";
import { setDefaultAiClient } from "./aiHelpers";
import type { ServerContext } from "./server/context";
import { registerAiRoutes } from "./server/aiRoutes";
import { registerStoreRoutes } from "./server/storeRoutes";
import { registerIntegrationRoutes } from "./server/integrationRoutes";
import { registerSocialRoutes } from "./server/socialRoutes";
import { registerBrandImageRoutes } from "./server/brandImageRoutes";
import { registerExternalApi } from "./server/externalApi";
import { startScheduler } from "./server/scheduler";
import { initCloudStore } from "./server/cloudStore";
import { exportStoreSnapshot, hasLocalStoreData, replaceStoreFromCloud } from "./serverStore";

dotenv.config();

const app = express();
// Port is configurable via the PORT env var so you can run on another port
// if 3000 is busy, e.g.  PORT=3001 npm run dev
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Behind a reverse proxy (Railway/Render/Fly/Cloud Run) this makes req.ip and
// the rate limiter see the real client IP instead of the proxy's.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security headers on every response (CSP is intentionally omitted: the OAuth
// popup pages use small inline scripts and Vite injects dev tooling).
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

// In production only allow the configured app origin (same-origin requests
// don't need CORS at all); in dev stay permissive for tooling.
app.use(isProduction ? cors({ origin: process.env.APP_URL || false }) : cors());
// 100mb: video uploads (IG Reels / FB video) travel as base64 data URLs.
app.use(express.json({ limit: "100mb" }));

// Layered rate limits (per IP): a global ceiling for the whole API, plus
// tighter budgets for the expensive AI endpoints and disk-writing uploads.
const limiter = (limit: number) => rateLimit({ windowMs: 60_000, limit, standardHeaders: true, legacyHeaders: false });
app.use("/api", limiter(300));
app.use("/api/upload-image", limiter(30));
app.use(
  ["/api/generate-", "/api/recommendations"].map((p) => `${p}*`),
  limiter(30)
);

// Serve uploaded carousel images publicly (needed for Instagram publishing).
ensureUploadsDir();
app.use("/uploads", express.static(UPLOADS_DIR));

// Public base URL used to build absolute image URLs for external APIs.
function publicBaseUrl(req: express.Request): string {
  return process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
}

// Initialize Gemini safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found, running in demo fallback mode.");
}

// Register the shared client with the AI helpers module.
setDefaultAiClient(ai);

// Initialize Anthropic safely
let anthropicClient: Anthropic | null = null;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (anthropicKey && anthropicKey !== "YOUR_ANTHROPIC_API_KEY" && anthropicKey.trim() !== "") {
  try {
    anthropicClient = new Anthropic({
      apiKey: anthropicKey.trim(),
    });
    console.log("Anthropic API initialized successfully for Claude Haiku.");
  } catch (err) {
    console.error("Failed to initialize Anthropic Client:", err);
  }
} else {
  console.log("No valid ANTHROPIC_API_KEY found, running Claude in demo fallback mode.");
}

// Helper to extract user-supplied Gemini API key from request headers
function getCustomAiClient(req: express.Request): GoogleGenAI | null {
  const userKey = (req.headers["x-gemini-key"] as string) || (req.headers["X-Gemini-Key"] as string);
  if (userKey && userKey.trim().length > 10) {
    try {
      return new GoogleGenAI({
        apiKey: userKey.trim(),
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build-custom",
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize custom user Gemini client:", err);
    }
  }
  return null;
}

const ctx: ServerContext = { ai, anthropicClient, getCustomAiClient, publicBaseUrl };

registerAiRoutes(app, ctx);
registerStoreRoutes(app, ctx);
registerIntegrationRoutes(app);
registerSocialRoutes(app);
registerBrandImageRoutes(app, ctx);
registerExternalApi(app, ctx);

// Serve static frontend assets in production or integrate Vite in dev
async function startServer() {
  // Optional Supabase persistence: restore/seed the store snapshot before
  // anything reads it (see server/cloudStore.ts and supabase/migration.sql).
  await initCloudStore({
    readLocal: exportStoreSnapshot,
    hasLocalData: hasLocalStoreData,
    replaceLocal: replaceStoreFromCloud,
  });

  if (!isProduction) {
    console.log("Setting up Vite Development Server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production build static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express custom server running at http://0.0.0.0:${PORT}`);
  });

  startScheduler();
}

startServer();
