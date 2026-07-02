import type express from "express";
import type { GoogleGenAI } from "@google/genai";
import type Anthropic from "@anthropic-ai/sdk";

/** Shared server dependencies handed to each route module. */
export interface ServerContext {
  /** Default Gemini client from GEMINI_API_KEY (null in demo mode). */
  ai: GoogleGenAI | null;
  /** Default Anthropic client from ANTHROPIC_API_KEY (null in demo mode). */
  anthropicClient: Anthropic | null;
  /** Builds a per-request Gemini client from the X-Gemini-Key header. */
  getCustomAiClient: (req: express.Request) => GoogleGenAI | null;
  /** Public base URL used for absolute links handed to external APIs. */
  publicBaseUrl: (req: express.Request) => string;
}
