import { describe, expect, expectTypeOf, it } from "vitest";

import type { CandlesParams, LxFetchReq, LxFetchRes, QuoteParams } from "@minebb/common/ipc/dto";

describe("IPC DTO contracts", () => {
  it("accepts optional params and timeout", () => {
    const request: LxFetchReq = {
      route: "fin.candles/get",
      params: { symbol: "000001", timeframe: "1d" },
      timeoutMs: 2_000,
    };
    expect(request.route).toBe("fin.candles/get");
    expect(request.timeoutMs).toBe(2000);
  });

  it("enforces strong typing for responses", () => {
    const success: LxFetchRes<number> = {
      ok: true,
      data: 42,
      meta: { cacheHit: false, ttl: 1_000, source: "network" },
    };
    const failure: LxFetchRes = {
      ok: false,
      err: { code: "40101", message: "Token missing" },
      meta: { cacheHit: true, ttl: 500, source: "cache" },
    };

    expect(success.ok).toBe(true);
    expect(success.meta.ttl).toBe(1000);
    expect(failure.ok).toBe(false);
    expect(failure.meta.cacheHit).toBe(true);
    expectTypeOf(success.data).toEqualTypeOf<number>();
    expectTypeOf(failure.err).toMatchTypeOf<{ code: string; message: string }>();
  });

  it("reuses shared parameter DTOs", () => {
    const candleParams: CandlesParams = {
      symbol: "600519",
      market: "CN",
      timeframe: "1d",
      from: Date.now() - 86_400_000,
      to: Date.now(),
    };
    const quoteParams: QuoteParams = { symbol: "00700", market: "HK" };

    expect(candleParams.symbol).toBe("600519");
    expect(quoteParams.market).toBe("HK");
  });
});
