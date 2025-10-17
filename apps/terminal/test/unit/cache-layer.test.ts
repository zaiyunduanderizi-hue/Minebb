import { beforeEach, describe, expect, it, vi } from "vitest";

import { LayeredCache, MemoryCacheLayer } from "@minebb/main/finance/services/cache";

describe("Cache layers", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("expires memory cache entries after ttl", async () => {
    vi.useFakeTimers();
    const cache = new MemoryCacheLayer<string>();

    await cache.set("foo", "bar", 1_000);
    expect(await cache.get("foo")).toBe("bar");

    vi.advanceTimersByTime(999);
    expect(await cache.get("foo")).toBe("bar");

    vi.advanceTimersByTime(2);
    expect(await cache.get("foo")).toBeUndefined();
  });

  it("rehydrates slower layers when faster cache has a miss", async () => {
    vi.useFakeTimers();
    const fast = new MemoryCacheLayer<number>();
    const slow = new MemoryCacheLayer<number>();
    const layered = new LayeredCache<number>([fast, slow]);

    await slow.set("answer", 42, 10_000);

    expect(await fast.get("answer")).toBeUndefined();

    const value = await layered.get("answer");
    expect(value).toBe(42);

    expect(await fast.get("answer")).toBe(42);

    vi.advanceTimersByTime(59_000);
    expect(await fast.get("answer")).toBe(42);

    vi.advanceTimersByTime(2_000);
    expect(await fast.get("answer")).toBeUndefined();
  });
});
