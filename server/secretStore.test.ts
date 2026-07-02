import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

// Isolate the store in a temp dir before importing the module under test.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "adteam-secrets-"));
beforeAll(() => {
  process.chdir(tmp);
});

describe("secretStore", () => {
  it("stores and resolves a secret through an opaque ref", async () => {
    const { storeSecret, resolveSecret, isSecretRef } = await import("./secretStore");
    const ref = storeSecret("mi-token-super-secreto");
    expect(isSecretRef(ref)).toBe(true);
    expect(ref).not.toContain("mi-token");
    expect(resolveSecret(ref)).toBe("mi-token-super-secreto");
  });

  it("is idempotent for the same value", async () => {
    const { storeSecret } = await import("./secretStore");
    const a = storeSecret("mismo-valor");
    const b = storeSecret("mismo-valor");
    expect(a).toBe(b);
  });

  it("never writes the plaintext to disk", async () => {
    const { storeSecret } = await import("./secretStore");
    storeSecret("PLAINTEXT_CANARY_12345");
    const raw = fs.readFileSync(path.join(tmp, ".data", "secrets.json"), "utf-8");
    expect(raw).not.toContain("PLAINTEXT_CANARY_12345");
  });

  it("seals and unseals token fields of a payload", async () => {
    const { sealPayloadTokens, unsealPayloadTokens, isSecretRef } = await import("./secretStore");
    const sealed = sealPayloadTokens({ pageId: "1", message: "hola", token: "EAAB_token_real" });
    expect(isSecretRef(sealed.token)).toBe(true);
    expect(sealed.pageId).toBe("1");
    const unsealed = unsealPayloadTokens(sealed);
    expect(unsealed.token).toBe("EAAB_token_real");
  });

  it("passes through non-ref values on resolve", async () => {
    const { resolveSecret } = await import("./secretStore");
    expect(resolveSecret("valor-plano")).toBe("valor-plano");
    expect(resolveSecret(undefined)).toBeUndefined();
  });
});
