export type SymbolCode = string;

export type Market = "CN" | "HK";
export type Timeframe = "1d" | "1w" | "1m";

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export interface Timeseries<TPoint> {
  symbol: SymbolCode;
  market: Market;
  timeframe: Timeframe;
  points: TPoint[];
  meta?: Record<string, unknown>;
}

export interface Quote {
  symbol: SymbolCode;
  market: Market;
  price: number;
  change?: number;
  changePct?: number;
  currency?: string;
  ts: number;
}

export interface SymbolSearchResult {
  symbol: SymbolCode;
  market: Market;
  name?: string;
}

export interface FinanceAdapterMetadata {
  displayName?: string;
  markets?: Market[];
  timeframes?: Timeframe[];
  capabilities?: string[];
  rateLimits?: Array<{
    intervalMs: number;
    limit: number;
    scope?: string;
  }>;
}

export interface FinanceAdapter {
  id: string;
  metadata?: FinanceAdapterMetadata;
  getCandles(params: {
    symbol: SymbolCode;
    market: Market;
    timeframe: Timeframe;
    from?: number;
    to?: number;
  }): Promise<Timeseries<Candle>>;
  getQuote(params: { symbol: SymbolCode; market: Market }): Promise<Quote>;
  searchSymbols?(
    query: string,
    market?: Market
  ): Promise<SymbolSearchResult[]>;
}
