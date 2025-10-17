import type {
  Candle,
  Market,
  Quote,
  Timeframe,
  Timeseries,
} from "@minebb/common/finance/types";
import type {
  LxFetchRequest,
  LxFetchResponse,
  LxResponseMeta,
} from "@minebb/common/ipc/dto";

export type FinanceRouteParams = {
  "fin.candles/get": { symbol: string; market: Market; timeframe: Timeframe; from?: number; to?: number };
  "fin.quote/get": { symbol: string; market: Market };
};

export interface FinanceResponse<T> {
  data: T;
  meta: LxResponseMeta;
}

export type FinanceRoute = keyof FinanceRouteParams;

export type FinanceErrorCategory = "401" | "429" | "NETWORK" | "TIMEOUT" | "UNEXPECTED" | "UNKNOWN";

export class FinanceError extends Error {
  readonly code: string;
  readonly category: FinanceErrorCategory;
  readonly meta?: LxResponseMeta;
  readonly details?: unknown;

  constructor(code: string, message: string, category: FinanceErrorCategory, meta?: LxResponseMeta, details?: unknown) {
    super(message);
    this.name = "FinanceError";
    this.code = code;
    this.category = category;
    this.meta = meta;
    this.details = details;
  }
}

const mapToCategory = (code: string): FinanceErrorCategory => {
  if (code.startsWith("401")) return "401";
  if (code.startsWith("429")) return "429";
  if (code.toUpperCase() === "NETWORK") return "NETWORK";
  if (code.toUpperCase() === "TIMEOUT") return "TIMEOUT";
  if (code.toUpperCase() === "UNEXPECTED") return "UNEXPECTED";
  return "UNKNOWN";
};

const ensureMeta = (meta?: LxResponseMeta): LxResponseMeta => ({
  cacheHit: meta?.cacheHit ?? false,
  ttl: meta?.ttl ?? 0,
  source: meta?.source ?? "mock",
  receivedAt: meta?.receivedAt ?? Date.now(),
});

const withMockFallback = async <TRoute extends FinanceRoute>(
  route: TRoute,
  params: FinanceRouteParams[TRoute]
): Promise<FinanceResponse<TRoute extends "fin.candles/get" ? Timeseries<Candle> : Quote>> => {
  if (typeof window !== "undefined" && window.lx?.fetch) {
    const response = (await window.lx.fetch({
      route,
      params,
    } satisfies LxFetchRequest<FinanceRouteParams[TRoute]>)) as LxFetchResponse<
      TRoute extends "fin.candles/get" ? Timeseries<Candle> : Quote
    >;

    if (!response.ok) {
      const meta = ensureMeta(response.meta);
      const category = mapToCategory(response.err.code ?? "UNKNOWN");
      throw new FinanceError(response.err.code, response.err.message, category, meta, response.err.details);
    }

    return { data: response.data, meta: ensureMeta(response.meta) };
  }

  const mock = await loadFixture(route);
  return mock as FinanceResponse<TRoute extends "fin.candles/get" ? Timeseries<Candle> : Quote>;
};

async function loadFixture(route: FinanceRoute): Promise<FinanceResponse<any>> {
  if (route === "fin.candles/get") {
    const fixtureModule = await import("../../test/fixtures/lixinger/candles.600036.SH.1d.json");
    const fixture = fixtureModule.default ?? fixtureModule;
    return {
      data: fixture.data as Timeseries<Candle>,
      meta: ensureMeta({ ...fixture.meta, source: "mock" }),
    };
  }

  if (route === "fin.quote/get") {
    const fixtureModule = await import("../../test/fixtures/lixinger/quote.600036.SH.json");
    const fixture = fixtureModule.default ?? fixtureModule;
    return {
      data: fixture.data as Quote,
      meta: ensureMeta({ ...fixture.meta, source: "mock" }),
    };
  }

  throw new FinanceError("UNEXPECTED", "Unsupported fixture route", "UNEXPECTED");
}

export const fetchCandles = (params: FinanceRouteParams["fin.candles/get"]) =>
  withMockFallback("fin.candles/get", params);

export const fetchQuote = (params: FinanceRouteParams["fin.quote/get"]) =>
  withMockFallback("fin.quote/get", params);

declare global {
  interface Window {
    lx?: {
      fetch<T = unknown>(request: LxFetchRequest): Promise<LxFetchResponse<T>>;
    };
  }
}
