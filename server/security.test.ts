import { describe, it, expect } from "vitest";
import { jsonForInlineScript } from "../oauthState";
import { isSafeWebhookUrl } from "./validate";

describe("jsonForInlineScript (XSS-safe inline <script> serialization)", () => {
  it("escapes </script> breakout attempts", () => {
    const out = jsonForInlineScript("</script><script>alert(1)</script>");
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });

  it("round-trips normal tokens unchanged through JSON.parse", () => {
    const token = "EAABsbCS1234|abc.def-ghi_jkl";
    expect(JSON.parse(jsonForInlineScript(token))).toBe(token);
  });

  it("escapes U+2028/U+2029 line separators (invalid in inline JS strings)", () => {
    const out = jsonForInlineScript("a\u2028b\u2029c");
    expect(out).toBe('"a\\u2028b\\u2029c"');
  });

  it("handles non-string values without crashing", () => {
    expect(jsonForInlineScript(5184000)).toBe("5184000");
    // undefined must serialize to valid JS ("null"), never crash the callback page
    expect(jsonForInlineScript(undefined)).toBe("null");
  });
});

describe("isSafeWebhookUrl (SSRF guard)", () => {
  it("accepts normal public https URLs", () => {
    expect(isSafeWebhookUrl("https://hooks.zapier.com/abc")).toBe(true);
    expect(isSafeWebhookUrl("http://example.com/webhook")).toBe(true);
  });

  it("rejects loopback and private ranges", () => {
    for (const bad of [
      "http://localhost:3000/x",
      "http://127.0.0.1/x",
      "http://0.0.0.0/x",
      "http://10.1.2.3/x",
      "http://192.168.1.10/x",
      "http://172.16.0.1/x",
      "http://172.31.255.255/x",
      "http://[::1]/x",
    ]) {
      expect(isSafeWebhookUrl(bad), bad).toBe(false);
    }
  });

  it("rejects the cloud metadata endpoint", () => {
    expect(isSafeWebhookUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
  });

  it("rejects non-http protocols and garbage", () => {
    expect(isSafeWebhookUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeWebhookUrl("ftp://example.com/x")).toBe(false);
    expect(isSafeWebhookUrl("no-es-una-url")).toBe(false);
  });

  it("does not block public 172.x outside 172.16-31", () => {
    expect(isSafeWebhookUrl("http://172.15.0.1/x")).toBe(true);
    expect(isSafeWebhookUrl("http://172.32.0.1/x")).toBe(true);
  });
});
