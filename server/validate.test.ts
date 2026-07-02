import { describe, it, expect } from "vitest";
import { scheduleSchema, calendarSchema, projectSchema, mailSchema } from "./validate";

describe("scheduleSchema", () => {
  it("accepts a valid schedule request", () => {
    const r = scheduleSchema.safeParse({
      network: "instagram",
      payload: { igAccountId: "1", imageUrl: "https://x/y.png", token: "t" },
      publishAt: "2099-01-01T10:00:00.000Z",
      label: "post",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown networks and invalid dates", () => {
    expect(scheduleSchema.safeParse({ network: "tiktok", payload: {}, publishAt: "2099-01-01" }).success).toBe(false);
    expect(scheduleSchema.safeParse({ network: "facebook", payload: {}, publishAt: "no-es-fecha" }).success).toBe(false);
  });

  it("requires payload", () => {
    expect(scheduleSchema.safeParse({ network: "facebook", publishAt: "2099-01-01T00:00:00Z" }).success).toBe(false);
  });
});

describe("calendarSchema", () => {
  it("requires an items array", () => {
    expect(calendarSchema.safeParse({ items: [{ day: 1 }] }).success).toBe(true);
    expect(calendarSchema.safeParse({ items: "nope" }).success).toBe(false);
    expect(calendarSchema.safeParse({}).success).toBe(false);
  });
});

describe("projectSchema", () => {
  it("requires at least one slide", () => {
    expect(projectSchema.safeParse({ slides: [] }).success).toBe(false);
    expect(projectSchema.safeParse({ slides: [{ title: "s" }] }).success).toBe(true);
  });
});

describe("mailSchema", () => {
  it("accepts optional fields and both port types", () => {
    expect(mailSchema.safeParse({}).success).toBe(true);
    expect(mailSchema.safeParse({ port: 465 }).success).toBe(true);
    expect(mailSchema.safeParse({ port: "465" }).success).toBe(true);
  });
});
