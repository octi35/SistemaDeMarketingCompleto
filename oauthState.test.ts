import { describe, it, expect } from "vitest";
import { issueOAuthState, consumeOAuthState, sanitizeOAuthCode } from "./oauthState";

describe("oauthState", () => {
  it("issues a state that can be consumed exactly once", () => {
    const state = issueOAuthState();
    expect(typeof state).toBe("string");
    expect(state.length).toBeGreaterThan(16);
    expect(consumeOAuthState(state)).toBe(true);
    expect(consumeOAuthState(state)).toBe(false); // already consumed
  });

  it("rejects unknown or invalid states", () => {
    expect(consumeOAuthState("nope")).toBe(false);
    expect(consumeOAuthState("")).toBe(false);
    expect(consumeOAuthState(undefined)).toBe(false);
  });

  it("sanitizes the OAuth code, stripping unsafe characters", () => {
    expect(sanitizeOAuthCode("abc123_-.")).toBe("abc123_-.");
    expect(sanitizeOAuthCode("<script>x</script>")).toBe("scriptxscript");
    expect(sanitizeOAuthCode(123 as unknown)).toBe("");
  });
});
