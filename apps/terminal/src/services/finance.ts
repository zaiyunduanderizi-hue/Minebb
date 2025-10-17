import type { CandlesParams, LxFetchRes, QuoteParams } from "../../common/ipc/dto";
import type {
  Candle,
  Quote,
  SymbolSearchResult,
  Timeseries,
} from "../../common/finance/types";

interface LxApi {
  fetch<T = unknown>(req: {
    route: string;
    params?: Record<string, unknown>;
    timeoutMs?: number;
  }): Promise<LxFetchRes<T>>;
}

const ensureApi = (): LxApi => {
  const api = (window as unknown as { lx?: LxApi }).lx;
  if (!api) {
    throw new Error("Lixinger IPC bridge not available");
  }
  return api;
};

export const getCandles = async (
  params: CandlesParams
): Promise<Timeseries<Candle>> => {
  const api = ensureApi();
  const res = await api.fetch<Timeseries<Candle>>({
    route: "fin.candles/get",
    params,
  });
  if (!res.ok || !res.data) {
    throw new Error(res.err?.message ?? "Unable to fetch candles");
  }
  return res.data;
};

export const getQuote = async (params: QuoteParams): Promise<Quote> => {
  const api = ensureApi();
  const res = await api.fetch<Quote>({
    route: "fin.quote/get",
    params,
  });
  if (!res.ok || !res.data) {
    throw new Error(res.err?.message ?? "Unable to fetch quote");
  }
  return res.data;
};

export const searchSymbols = async (
  query: string,
  market?: CandlesParams["market"]
): Promise<SymbolSearchResult[]> => {
  const api = ensureApi();
  const res = await api.fetch<SymbolSearchResult[]>({
    route: "fin.search/symbols",
    params: { q: query, market },
  });
  if (!res.ok || !res.data) {
    throw new Error(res.err?.message ?? "Unable to search symbols");
  }
  return res.data;
};

declare global {
  interface Window {
    lx?: LxApi;
  }
}
