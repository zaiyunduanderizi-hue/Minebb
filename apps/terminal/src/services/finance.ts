import type { Candle, Market, Quote, SymbolSearchResult, Timeframe, Timeseries } from "@minebb/common/finance/types";
import type { IpcChannels } from "@minebb/main/ipc/channels";

type CandlesRequest = IpcChannels["finance:getCandles"]["req"];
type QuoteRequest = IpcChannels["finance:getQuote"]["req"];
type SearchRequest = IpcChannels["finance:search"]["req"];

type FinanceBridge = Window["minebb"]["finance"];

const ensureBridge = (): FinanceBridge => {
  const bridge = window.minebb?.finance;
  if (!bridge) {
    throw new Error("Finance bridge is not available in the current context.");
  }
  return bridge;
};

export const getCandles = async (
  params: CandlesRequest
): Promise<Timeseries<Candle>> => {
  return ensureBridge().getCandles(params);
};

export const getQuote = async (params: QuoteRequest): Promise<Quote> => {
  return ensureBridge().getQuote(params);
};

export const searchSymbols = async (
  query: string,
  market?: Market
): Promise<SymbolSearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const request: SearchRequest = { query: trimmed, market };
  return ensureBridge().search(request);
};

export type FinanceTimeseries = Timeseries<Candle>;
export type FinanceTimeframe = Timeframe;
