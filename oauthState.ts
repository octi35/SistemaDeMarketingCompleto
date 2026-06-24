// OAuth CSRF protection helpers: short-lived random `state` tokens kept in
// memory, plus a sanitizer for echoing the `code` back into HTML safely.
import crypto from "crypto";

const oauthStates = new Map<string, number>(); // state -> expiry timestamp (ms)

export function issueOAuthState(): string {
  const state = crypto.randomBytes(16).toString("hex");
  oauthStates.set(state, Date.now() + 10 * 60 * 1000); // valid 10 min
  // Opportunistic cleanup of expired entries
  const now = Date.now();
  for (const [s, exp] of oauthStates) if (exp < now) oauthStates.delete(s);
  return state;
}

export function consumeOAuthState(state: unknown): boolean {
  if (!state || typeof state !== "string") return false;
  const exp = oauthStates.get(state);
  if (exp === undefined) return false;
  oauthStates.delete(state);
  return Date.now() < exp;
}

// Allow only safe characters when echoing an OAuth `code` back into HTML/JS,
// preventing script injection via the query string.
export function sanitizeOAuthCode(code: unknown): string {
  return typeof code === "string" ? code.replace(/[^A-Za-z0-9._\-]/g, "").slice(0, 512) : "";
}
