import { describe, it, expect } from "vitest";
import { STORAGE_KEYS, getStored, setStored } from "./storageKeys";

describe("storageKeys", () => {
  it("exposes stable key names", () => {
    expect(STORAGE_KEYS.geminiApiKey).toBe("custom_gemini_api_key");
    expect(STORAGE_KEYS.metaPageId).toBe("meta_page_id");
  });

  it("returns empty string when localStorage is unavailable", () => {
    expect(getStored(STORAGE_KEYS.geminiApiKey)).toBe("");
  });

  it("round-trips through a localStorage mock", () => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };

    setStored(STORAGE_KEYS.metaPageId, "page_123");
    expect(getStored(STORAGE_KEYS.metaPageId)).toBe("page_123");

    delete (globalThis as any).localStorage;
  });
});
