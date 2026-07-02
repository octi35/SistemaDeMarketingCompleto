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
import { startScheduler } from "./server/scheduler";

dotenv.config();

const app = express();
// Port is configurable via the PORT env var so you can run on another port
// if 3000 is busy, e.g.  PORT=3001 npm run dev
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

// In production only allow the configured app origin (same-origin requests
// don't need CORS at all); in dev stay permissive for tooling.
app.use(isProduction ? cors({ origin: process.env.APP_URL || false }) : cors());
app.use(express.json({ limit: "25mb" }));

// Basic rate limit on the expensive AI generation endpoints.
app.use(
  ["/api/generate-", "/api/recommendations"].map((p) => `${p}*`),
  rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false })
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

// Serve static frontend assets in production or integrate Vite in dev
async function startServer() {
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
