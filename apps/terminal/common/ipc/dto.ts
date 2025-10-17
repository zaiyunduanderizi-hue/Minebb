import type { Market, Timeframe } from "../finance/types";

export type LxRoute =
  | "fin.candles/get"
  | "fin.quote/get"
  | "fin.search/symbols";

export type LxFetchReq = {
  route: LxRoute;
  params?: Record<string, unknown>;
  tokenId?: string;
  timeoutMs?: number;
};

export type LxFetchRes<T = unknown> =
  | {
      ok: true;
      data: T;
      meta: { cacheHit: boolean; ttl: number; source: "network" | "cache" | "mock" };
    }
  | {
      ok: false;
      err: { code: string; message: string; details?: unknown };
      meta: { cacheHit: boolean; ttl: number; source: "network" | "cache" | "mock" };
    };

export type CandlesParams = {
  symbol: string;
  market: Market;
  timeframe: Timeframe;
  from?: number;
  to?: number;
};

export type QuoteParams = { symbol: string; market: Market };
