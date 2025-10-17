import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { registerAdapter, unregisterAdapter } from "@minebb/main/finance/registry";
import { createFinanceService } from "@minebb/main/finance/services/finance";
import { createMainRegistrar, createRendererInvoker } from "@minebb/main/ipc/channels";

class FakeIpcMain {
  readonly handlers = new Map<string, (event: unknown, request: unknown) => unknown>();

  handle(channel: string, handler: (event: unknown, request: unknown) => unknown) {
    this.handlers.set(channel, handler);
  }
}

class FakeIpcRenderer {
  constructor(private readonly main: FakeIpcMain) {}

  async invoke(channel: string, request: unknown) {
    const handler = this.main.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for ${channel}`);
    }
    try {
      const result = handler({}, request);
      return await Promise.resolve(result);
    } catch (error) {
      throw error;
    }
  }
}

describe("IPC round-trip", () => {
  const adapterId = "ipc-test";
  let candleCalls = 0;
  let quoteCalls = 0;

  beforeAll(() => {
    registerAdapter({
      id: adapterId,
      metadata: {
        displayName: "IPC Test",
        markets: ["CN"],
        timeframes: ["1d"],
        capabilities: ["candles", "quote", "search"],
        rateLimits: [{ intervalMs: 1_000, limit: 2 }],
      },
      async getCandles(params) {
        candleCalls += 1;
        return {
          symbol: params.symbol,
          market: params.market,
          timeframe: params.timeframe,
          points: [
            { t: 1_000, o: 1, h: 2, l: 0.5, c: 1.5 },
            { t: 2_000, o: 1.5, h: 2.5, l: 1.2, c: 2 },
          ],
        };
      },
      async getQuote(params) {
        quoteCalls += 1;
        if (params.symbol === "FAIL") {
          throw { code: "42901", message: "Rate limited", ttl: 5_000 };
        }
        return {
          symbol: params.symbol,
          market: params.market,
          price: 12.34,
          ts: Date.now(),
        };
      },
      async searchSymbols(query, market) {
        return [
          {
            symbol: query.toUpperCase(),
            market: market ?? "CN",
            name: `Result ${query}`,
          },
        ];
      },
    });
  });

  afterAll(() => {
    unregisterAdapter(adapterId);
  });

  it("returns quotes and candles via renderer invoker", async () => {
    const ipcMain = new FakeIpcMain();
    const registrar = createMainRegistrar(ipcMain as any);
    const renderer = createRendererInvoker(new FakeIpcRenderer(ipcMain) as any);
    const service = createFinanceService(adapterId);

    registrar.handle("finance:getCandles", (_event, request) => service.getCandles(request));
    registrar.handle("finance:getQuote", (_event, request) => service.getQuote(request));

    const candles = await renderer.invoke("finance:getCandles", {
      symbol: "000001",
      market: "CN",
      timeframe: "1d",
    });
    expect(candles.points).toHaveLength(2);
    expect(candles.points[0].t).toBeLessThan(candles.points[1].t);

    const quote = await renderer.invoke("finance:getQuote", { symbol: "000001", market: "CN" });
    expect(quote.symbol).toBe("000001");
    expect(typeof quote.price).toBe("number");

    const cachedQuote = await renderer.invoke("finance:getQuote", { symbol: "000001", market: "CN" });
    expect(cachedQuote).toEqual(quote);
    expect(quoteCalls).toBe(1);

    const cachedCandles = await renderer.invoke("finance:getCandles", {
      symbol: "000001",
      market: "CN",
      timeframe: "1d",
    });
    expect(cachedCandles).toEqual(candles);
    expect(candleCalls).toBe(1);
  });

  it("maps adapter errors to service errors", async () => {
    const ipcMain = new FakeIpcMain();
    const registrar = createMainRegistrar(ipcMain as any);
    const renderer = createRendererInvoker(new FakeIpcRenderer(ipcMain) as any);
    const service = createFinanceService(adapterId);

    registrar.handle("finance:getQuote", (_event, request) => service.getQuote(request));

    await expect(
      renderer.invoke("finance:getQuote", { symbol: "FAIL", market: "CN" })
    ).rejects.toMatchObject({ code: "42901", message: "Rate limited", ttl: 5_000 });
  });
});
