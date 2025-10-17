import type { Candle, Quote, SymbolSearchResult, Timeseries } from "@minebb/common/finance/types";
import type { IpcChannels } from "@minebb/main/ipc/channels";
import { getAdapter } from "@minebb/main/finance/registry";
import { MemoryCacheLayer } from "./cache";

export type ServiceError = Error & {
  code: string;
  ttl?: number;
  details?: unknown;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createServiceError = (
  code: string,
  message: string,
  options: { ttl?: number; details?: unknown } = {}
): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.code = code;
  if (options.ttl !== undefined) {
    error.ttl = options.ttl;
  }
  if (options.details !== undefined) {
    error.details = options.details;
  }
  return error;
};

const isAdapterError = (value: unknown): value is {
  code?: string;
  message?: string;
  details?: unknown;
  ttl?: number;
} => Boolean(value && typeof value === "object");

const normalizeError = (value: unknown, fallback: string): ServiceError => {
  if (isAdapterError(value)) {
    const code = typeof (value as any).code === "string" ? (value as any).code : "UNEXPECTED";
    const message = typeof (value as any).message === "string" ? (value as any).message : fallback;
    const ttl = typeof (value as any).ttl === "number" ? (value as any).ttl : undefined;
    const details = (value as any).details;
    return createServiceError(code, message, { ttl, details });
  }
  return createServiceError("UNEXPECTED", fallback, { details: value });
};

class RateLimiter {
  private readonly locks = new Map<string, Promise<void>>();
  private readonly lastRun = new Map<string, number>();

  async schedule<T>(key: string, intervalMs: number, task: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(key) ?? Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.locks.set(key, previous.then(() => current));

    await previous;

    const availableAt = (this.lastRun.get(key) ?? 0) + intervalMs;
    const waitMs = Math.max(0, availableAt - Date.now());
    if (waitMs > 0) {
      await wait(waitMs);
    }

    try {
      const result = await task();
      this.lastRun.set(key, Date.now());
      return result;
    } finally {
      release();
    }
  }
}

const DEFAULT_ADAPTER_ID = "lixinger";
const DEFAULT_MIN_INTERVAL_MS = 200;
const CANDLE_CACHE_TTL_MS = 60_000;
const QUOTE_CACHE_TTL_MS = 15_000;
const SEARCH_CACHE_TTL_MS = 5 * 60_000;

const candlesCache = new MemoryCacheLayer<Timeseries<Candle>>();
const quotesCache = new MemoryCacheLayer<Quote>();
const searchCache = new MemoryCacheLayer<SymbolSearchResult[]>();
const rateLimiter = new RateLimiter();

const computeMinInterval = (adapterId: string): number => {
  const adapter = getAdapter(adapterId);
  if (!adapter) {
    return DEFAULT_MIN_INTERVAL_MS;
  }
  const primary = adapter.metadata?.rateLimits?.[0];
  if (!primary || primary.limit <= 0) {
    return DEFAULT_MIN_INTERVAL_MS;
  }
  const interval = Math.ceil(primary.intervalMs / primary.limit);
  return Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_MIN_INTERVAL_MS;
};

const buildCandleCacheKey = (params: IpcChannels["finance:getCandles"]["req"]): string =>
  [
    params.symbol,
    params.market,
    params.timeframe,
    params.from ?? "",
    params.to ?? "",
  ].join(":");

const buildQuoteCacheKey = (params: IpcChannels["finance:getQuote"]["req"]): string =>
  [params.symbol, params.market].join(":");

const buildSearchCacheKey = (params: IpcChannels["finance:search"]["req"]): string =>
  [params.query.trim().toUpperCase(), params.market ?? "ALL"].join(":");

const ensureAdapter = (adapterId: string) => {
  const adapter = getAdapter(adapterId);
  if (!adapter) {
    throw createServiceError("ADAPTER_NOT_FOUND", `Adapter ${adapterId} is not registered.`);
  }
  return adapter;
};

export interface FinanceService {
  getCandles(
    params: IpcChannels["finance:getCandles"]["req"],
    options?: { adapterId?: string }
  ): Promise<Timeseries<Candle>>;
  getQuote(
    params: IpcChannels["finance:getQuote"]["req"],
    options?: { adapterId?: string }
  ): Promise<Quote>;
  search(
    params: IpcChannels["finance:search"]["req"],
    options?: { adapterId?: string }
  ): Promise<SymbolSearchResult[]>;
}

export const createFinanceService = (
  defaultAdapterId: string = DEFAULT_ADAPTER_ID
): FinanceService => {
  const minInterval = computeMinInterval(defaultAdapterId);

  return {
    async getCandles(params, options) {
      const adapterId = options?.adapterId ?? defaultAdapterId;
      const adapter = ensureAdapter(adapterId);
      const cacheKey = buildCandleCacheKey(params);
      const cached = await candlesCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const series = await rateLimiter.schedule(
          `${adapterId}:candles`,
          Math.max(minInterval, computeMinInterval(adapterId)),
          () => adapter.getCandles(params)
        );
        await candlesCache.set(cacheKey, series, CANDLE_CACHE_TTL_MS);
        return series;
      } catch (error) {
        throw normalizeError(error, "Failed to fetch candles.");
      }
    },

    async getQuote(params, options) {
      const adapterId = options?.adapterId ?? defaultAdapterId;
      const adapter = ensureAdapter(adapterId);
      const cacheKey = buildQuoteCacheKey(params);
      const cached = await quotesCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const quote = await rateLimiter.schedule(
          `${adapterId}:quote`,
          Math.max(minInterval, computeMinInterval(adapterId)),
          () => adapter.getQuote(params)
        );
        await quotesCache.set(cacheKey, quote, QUOTE_CACHE_TTL_MS);
        return quote;
      } catch (error) {
        throw normalizeError(error, "Failed to fetch quote.");
      }
    },

    async search(params, options) {
      const adapterId = options?.adapterId ?? defaultAdapterId;
      const adapter = ensureAdapter(adapterId);
      if (!adapter.searchSymbols) {
        return [];
      }
      const trimmed = params.query.trim();
      if (!trimmed) {
        return [];
      }
      const cacheKey = buildSearchCacheKey({ ...params, query: trimmed });
      const cached = await searchCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const results = await rateLimiter.schedule(
          `${adapterId}:search`,
          Math.max(minInterval, computeMinInterval(adapterId)),
          () => adapter.searchSymbols!(trimmed, params.market)
        );
        await searchCache.set(cacheKey, results, SEARCH_CACHE_TTL_MS);
        return results;
      } catch (error) {
        throw normalizeError(error, "Failed to search symbols.");
      }
    },
  };
};
