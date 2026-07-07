// Single-password access gate for deployed instances. When APP_PASSWORD is
// set, every /api route requires a signed httpOnly session cookie obtained
// via POST /api/login. Without APP_PASSWORD the gate is a no-op (local dev).
//
// Why a cookie instead of HTTP Basic Auth: several routes already use the
// Authorization header for social-network Bearer tokens, which would collide
// with Basic credentials.
//
// Exemptions:
//  - /uploads/*     -> Instagram/Facebook/LinkedIn must fetch images publicly.
//  - /api/ext/*     -> protected by its own API keys (EXTERNAL_API_KEYS).
//  - /api/login and /api/auth-status -> needed to get in.
import express from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";

const COOKIE_NAME = "adteam_session";
const SESSION_DAYS = 30;

function appPassword(): string {
  return (process.env.APP_PASSWORD || "").trim();
}

export function isGateEnabled(): boolean {
  return appPassword().length >= 6;
}

// Stateless session token: HMAC over a fixed label, keyed by the password
// (+ APP_SECRET when present). Changing the password revokes every session.
function sessionToken(): string {
  const key = crypto
    .createHash("sha256")
    .update(`${appPassword()}::${process.env.APP_SECRET || ""}`)
    .digest();
  return crypto.createHmac("sha256", key).update("adteam-session-v1").digest("hex");
}

function timingSafeEq(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Minimal cookie-header parser (avoids the cookie-parser dependency). */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

function isAuthenticated(req: express.Request): boolean {
  const cookie = parseCookies(req.headers.cookie)[COOKIE_NAME];
  return !!cookie && timingSafeEq(cookie, sessionToken());
}

export function registerAuthGate(app: express.Express): void {
  // Always available so the frontend knows whether to show the lock screen.
  app.get("/api/auth-status", (req, res) => {
    res.json({ protected: isGateEnabled(), authenticated: !isGateEnabled() || isAuthenticated(req) });
  });

  // Strict budget against password brute force.
  const loginLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

  app.post("/api/login", loginLimiter, express.json(), (req, res) => {
    if (!isGateEnabled()) return res.json({ success: true, note: "Acceso sin contraseña (APP_PASSWORD no configurada)." });
    const provided = typeof req.body?.password === "string" ? req.body.password : "";
    if (!provided || !timingSafeEq(provided, appPassword())) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader(
      "Set-Cookie",
      `${COOKIE_NAME}=${sessionToken()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 24 * 3600}${secure}`
    );
    res.json({ success: true });
  });

  app.post("/api/logout", (_req, res) => {
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
    res.json({ success: true });
  });

  // The gate itself: everything under /api needs the session cookie.
  app.use("/api", (req, res, next) => {
    if (!isGateEnabled()) return next();
    const path = req.path; // relative to /api
    if (path === "/login" || path === "/auth-status" || path === "/logout" || path.startsWith("/ext/")) {
      return next();
    }
    if (isAuthenticated(req)) return next();
    res.status(401).json({ error: "Acceso protegido: inicia sesión.", authRequired: true });
  });
}
