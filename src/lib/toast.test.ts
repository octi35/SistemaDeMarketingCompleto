import { describe, it, expect, vi } from "vitest";
import { toast } from "./toast";

describe("toast store", () => {
  it("notifies subscribers when a toast is pushed and removed", () => {
    let latest: ReturnType<typeof Array.prototype.slice> = [];
    const unsub = toast.subscribe((t) => {
      latest = t;
    });

    const id = toast.success("hola");
    expect(latest.some((t: any) => t.id === id && t.type === "success" && t.message === "hola")).toBe(true);

    toast.dismiss(id);
    expect(latest.some((t: any) => t.id === id)).toBe(false);

    unsub();
  });

  it("auto-dismisses after its duration", () => {
    vi.useFakeTimers();
    let latest: any[] = [];
    const unsub = toast.subscribe((t) => {
      latest = t;
    });

    const id = toast.info("temporal");
    expect(latest.some((t) => t.id === id)).toBe(true);

    vi.advanceTimersByTime(4000);
    expect(latest.some((t) => t.id === id)).toBe(false);

    unsub();
    vi.useRealTimers();
  });
});
