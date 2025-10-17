export type Market = "CN" | "HK";

export type Timeframe = "1d" | "1w" | "1m";

export type SymbolCode = string;

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
  ts: number;
  currency?: string;
}

export interface IndicatorInput {
  series: Candle[];
  params?: Record<string, unknown>;
}

export interface IndicatorResult {
  name: string;
  values: Array<{ timestamp: number; value: number }>;
  meta?: Record<string, unknown>;
}

export interface FinanceAdapterMetadata {
  id: string;
  displayName: string;
  capabilities: {
    historical: boolean;
    realtime: boolean;
    fundamentals?: boolean;
  };
  rateLimits?: {
    maxRequestsPerMinute?: number;
    burstSize?: number;
  };
}

export interface FinanceAdapter {
  metadata: FinanceAdapterMetadata;
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
  ): Promise<Array<{ symbol: SymbolCode; market: Market; name?: string }>>;
}
