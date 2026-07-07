import { describe, it, expect } from "vitest";
import { parseCookies } from "./authGate";

describe("parseCookies", () => {
  it("parses a simple cookie header", () => {
    expect(parseCookies("a=1; b=hola")).toEqual({ a: "1", b: "hola" });
  });

  it("handles url-encoded values and extra whitespace", () => {
    expect(parseCookies(" token=abc%20def ;x=1")).toEqual({ token: "abc def", x: "1" });
  });

  it("keeps '=' inside values", () => {
    expect(parseCookies("sig=aGVsbG8=")).toEqual({ sig: "aGVsbG8=" });
  });

  it("returns empty object for missing header", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("")).toEqual({});
  });

  it("ignores malformed fragments", () => {
    expect(parseCookies("novalue; a=1")).toEqual({ a: "1" });
  });
});
