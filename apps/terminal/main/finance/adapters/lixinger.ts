import fetch, { type Response } from "node-fetch";
import { parseQuote, parseTimeseriesCandle } from "../codecs";
import type {
  Candle,
  FinanceAdapter,
  Market,
  Quote,
  SymbolCode,
  SymbolSearchResult,
  Timeframe,
  Timeseries,
} from "../../../common/finance/types";

const BASE_URL = "https://open.lixinger.com/api";
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000];
const MAX_RETRY_DELAY_MS = 30_000;

type AdapterError = Error & {
  code: string;
  ttl?: number;
  details?: unknown;
};

type PostJsonResult = { data: unknown; ttl: number };

type PostJsonOptions = {
  timeoutMs?: number;
  tokenId?: string;
};

const logEvent = (payload: { event: string; route: string; durMs: number; ok: boolean; code?: string }) => {
  try {
    console.info(JSON.stringify(payload));
  } catch (error) {
    console.info(payload);
  }
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createError = (
  code: string,
  message: string,
  options: { ttl?: number; details?: unknown } = {}
): AdapterError => {
  const error = new Error(message) as AdapterError;
  error.code = code;
  if (options.ttl !== undefined) {
    error.ttl = options.ttl;
  }
  if (options.details !== undefined) {
    error.details = options.details;
  }
  return error;
};

const getSecretToken = (tokenId?: string): string => {
  const envKey = tokenId
    ? `MINEBB_LIX_TOKEN_${tokenId.toUpperCase()}`
    : "MINEBB_LIX_TOKEN";
  const value = process.env[envKey];
  if (!value) {
    throw createError("40100", "Lixinger token not configured");
  }
  return value;
};

const normalizePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

const computeRetryDelay = (
  attempt: number,
  responseTtl?: number,
  headerValue?: string | null
): number => {
  const headerSeconds = headerValue ? Number(headerValue) : Number.NaN;
  const headerDelay = Number.isFinite(headerSeconds)
    ? headerSeconds * 1_000
    : Number.NaN;
  const backoffDelay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
  const computed = Number.isFinite(headerDelay)
    ? Math.max(backoffDelay, headerDelay)
    : backoffDelay;
  const hintDelay = responseTtl ? responseTtl * 1_000 : 0;
  return Math.min(
    MAX_RETRY_DELAY_MS,
    Math.max(computed, hintDelay)
  );
};

const extractJson = async (res: Response): Promise<any> => {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }
  try {
    return await res.json();
  } catch (error) {
    return undefined;
  }
};

const isAdapterError = (error: unknown): error is AdapterError =>
  Boolean(error && typeof error === "object" && "code" in error);

const postJson = async (
  path: string,
  body: Record<string, unknown>,
  { timeoutMs = 15_000, tokenId }: PostJsonOptions = {}
): Promise<PostJsonResult> => {
  const token = getSecretToken(tokenId);
  const url = `${BASE_URL}${normalizePath(path)}`;
  let attempt = 0;
  let ttl = 0;

  while (true) {
    attempt += 1;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token }),
        signal: controller.signal as any,
      });
      const durMs = Date.now() - startedAt;
      const json = await extractJson(response);

      if (response.status === 429) {
        ttl = computeRetryDelay(attempt, json?.ttl ?? json?.retryAfter, response.headers.get("retry-after"));
        logEvent({ event: "lixinger.request", route: path, durMs, ok: false, code: "429" });
        if (attempt <= RETRY_DELAYS_MS.length) {
          await wait(ttl);
          continue;
        }
        throw createError("42900", json?.msg ?? "Rate limited", {
          ttl,
          details: json,
        });
      }

      if (response.status === 401 || response.status === 403) {
        logEvent({ event: "lixinger.request", route: path, durMs, ok: false, code: "401" });
        throw createError("40100", json?.msg ?? "Unauthorized", { details: json });
      }

      if (!response.ok) {
        logEvent({ event: "lixinger.request", route: path, durMs, ok: false, code: `HTTP_${response.status}` });
        throw createError("UNEXPECTED", `HTTP ${response.status}`, { details: json });
      }

      if (json && json.code !== undefined && json.code !== 0) {
        const rawCode = String(json.code);
        const errCode = rawCode.startsWith("401")
          ? "40100"
          : rawCode.startsWith("429")
          ? "42900"
          : rawCode;
        const retryHint = json.ttl ?? json.retryAfter ?? json.data?.ttl;
        if (errCode.startsWith("429")) {
          ttl = computeRetryDelay(attempt, retryHint, response.headers.get("retry-after"));
          if (attempt <= RETRY_DELAYS_MS.length) {
            logEvent({ event: "lixinger.request", route: path, durMs, ok: false, code: errCode });
            await wait(ttl);
            continue;
          }
        }
        logEvent({ event: "lixinger.request", route: path, durMs, ok: false, code: errCode });
        throw createError(errCode, json.msg ?? "API error", {
          ttl: errCode.startsWith("429") ? ttl : undefined,
          details: json,
        });
      }

      logEvent({ event: "lixinger.request", route: path, durMs, ok: true });
      return { data: json?.data ?? json, ttl: 0 };
    } catch (error) {
      const durMs = Date.now() - startedAt;
      if ((error as any)?.name === "AbortError") {
        logEvent({ event: "lixinger.request", route: path, durMs, ok: false, code: "TIMEOUT" });
        throw createError("TIMEOUT", "Request timed out");
      }
      if (isAdapterError(error)) {
        throw error;
      }
      logEvent({ event: "lixinger.request", route: path, durMs, ok: false, code: "NETWORK" });
      throw createError("NETWORK", (error as Error)?.message ?? "Network error", {
        details: error,
      });
    } finally {
      clearTimeout(timer);
    }
  }
};

const timeframeToPeriod: Record<Timeframe, string> = {
  "1d": "day",
  "1w": "week",
  "1m": "month",
};

const marketToSource = (market: Market): string => {
  switch (market) {
    case "HK":
      return "hk";
    case "CN":
    default:
      return "a";
  }
};

const toDateParam = (value?: number): string | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return new Date(value).toISOString().slice(0, 10);
};

const parseNumeric = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseTimestamp = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return value > 10_000_000_000 ? Math.trunc(value) : Math.trunc(value * 1_000);
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 10_000_000_000 ? Math.trunc(numeric) : Math.trunc(numeric * 1_000);
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const extractCandles = (raw: unknown): Array<Record<string, unknown>> => {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw as Array<Record<string, unknown>>;
  }
  if (typeof raw === "object") {
    const candidate =
      (raw as Record<string, unknown>).klines ??
      (raw as Record<string, unknown>).candles ??
      (raw as Record<string, unknown>).items ??
      (raw as Record<string, unknown>).list ??
      (raw as Record<string, unknown>).results ??
      (raw as Record<string, unknown>).data;
    if (Array.isArray(candidate)) {
      return candidate as Array<Record<string, unknown>>;
    }
  }
  return [];
};

const toTimeseries = (
  symbol: SymbolCode,
  market: Market,
  timeframe: Timeframe,
  rows: Array<Record<string, unknown>>
): Timeseries<Candle> => {
  const points = rows
    .reduce<Candle[]>((acc, row) => {
      const t =
        parseTimestamp(
          row.date ??
            row.time ??
            row.timestamp ??
            row.t ??
            row.tradeTime ??
            row.tradingDate
        );
      const o = parseNumeric(row.open ?? row.o ?? row.startPrice);
      const h = parseNumeric(row.high ?? row.h ?? row.maxPrice);
      const l = parseNumeric(row.low ?? row.l ?? row.minPrice);
      const c = parseNumeric(row.close ?? row.c ?? row.endPrice ?? row.price);
      const v = parseNumeric(
        row.volume ??
          row.v ??
          row.turnoverVolume ??
          row.amount ??
          row.turnover
      );
      if (
        t === undefined ||
        o === undefined ||
        h === undefined ||
        l === undefined ||
        c === undefined
      ) {
        return acc;
      }
      const candle: Candle = {
        t,
        o,
        h,
        l,
        c,
        ...(v !== undefined ? { v } : {}),
      };
      acc.push(candle);
      return acc;
    }, [])
    .sort((a, b) => a.t - b.t);

  return parseTimeseriesCandle({ symbol, market, timeframe, points });
};

const currencyByMarket: Record<Market, string> = {
  CN: "CNY",
  HK: "HKD",
};

const toQuote = (
  symbol: SymbolCode,
  market: Market,
  raw: Record<string, unknown>
): Quote => {
  const price =
    parseNumeric(raw.price ?? raw.close ?? raw.c ?? raw.last) ?? 0;
  const change = parseNumeric(raw.change ?? raw.chg ?? raw.delta);
  const changePct = parseNumeric(
    raw.changePct ?? raw.chgPct ?? raw.pctChange ?? raw.percent
  );
  const ts =
    parseTimestamp(
      raw.time ?? raw.timestamp ?? raw.ts ?? raw.date ?? raw.lastTime
    ) ?? Date.now();
  return parseQuote({
    symbol,
    market,
    price,
    change,
    changePct,
    currency: currencyByMarket[market],
    ts,
  });
};

const toSearchResults = (
  rows: Array<Record<string, unknown>>
): SymbolSearchResult[] => {
  const results: SymbolSearchResult[] = [];
  for (const row of rows) {
    const symbol =
      (row.symbol as string) ??
      (row.stockCode as string) ??
      (row.code as string);
    if (!symbol) {
      continue;
    }
    const market =
      (row.market as Market) ??
      ((row.areaCode as string)?.toUpperCase() === "HK" ? "HK" : "CN");
    const name = (row.name as string) ?? (row.cnName as string);
    const entry: SymbolSearchResult = {
      symbol,
      market,
      ...(name ? { name } : {}),
    };
    results.push(entry);
  }
  return results;
};

export const lixingerAdapter: FinanceAdapter = {
  id: "lixinger",
  metadata: {
    displayName: "Lixinger",
    markets: ["CN", "HK"],
    timeframes: ["1d", "1w", "1m"],
    capabilities: ["candles", "quote", "search"],
    rateLimits: [
      { intervalMs: 60_000, limit: 120, scope: "global" },
      { intervalMs: 1_000, limit: 6, scope: "burst" },
    ],
  },
  async getCandles({ symbol, market, timeframe, from, to }) {
    const body = {
      stockCode: symbol,
      stockCodes: [symbol],
      market: marketToSource(market),
      period: timeframeToPeriod[timeframe],
      startDate: toDateParam(from),
      endDate: toDateParam(to),
    };
    const { data } = await postJson("/a/stock/kline", body);
    const rows = extractCandles(data);
    const series = toTimeseries(symbol, market, timeframe, rows);
    return series;
  },
  async getQuote({ symbol, market }) {
    const body = {
      stockCode: symbol,
      stockCodes: [symbol],
      market: marketToSource(market),
    };
    const { data } = await postJson("/a/stock/quote", body);
    const payload = Array.isArray(data)
      ? (data[0] as Record<string, unknown> | undefined)
      : (data as Record<string, unknown> | undefined);
    if (!payload) {
      throw createError("UNEXPECTED", "Quote payload missing", { details: data });
    }
    return toQuote(symbol, market, payload);
  },
  async searchSymbols(query, market) {
    const body: Record<string, unknown> = {
      keyword: query,
      market: market ? marketToSource(market) : undefined,
    };
    const { data } = await postJson("/a/stock/search", body);
    const rows = extractCandles(data);
    if (rows.length === 0 && Array.isArray(data)) {
      return toSearchResults(data as Array<Record<string, unknown>>);
    }
    return toSearchResults(rows);
  },
};
