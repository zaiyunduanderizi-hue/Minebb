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
  symbol: string;
  market: Market;
  timeframe: Timeframe;
  points: TPoint[];
  meta?: Record<string, unknown>;
}

export interface Quote {
  symbol: string;
  market: Market;
  price: number;
  change?: number;
  changePct?: number;
  ts: number;
}

export interface SymbolSearchResult {
  symbol: string;
  market: Market;
  name?: string;
}

export interface FinanceAdapter {
  id: string;
  getCandles(params: {
    symbol: string;
    market: Market;
    timeframe: Timeframe;
    from?: number;
    to?: number;
  }): Promise<Timeseries<Candle>>;
  getQuote(params: { symbol: string; market: Market }): Promise<Quote>;
  searchSymbols?(
    query: string,
    market?: Market
  ): Promise<SymbolSearchResult[]>;
}

export interface FinanceAdapterMetadata {
  id: string;
  displayName?: string;
  markets?: Market[];
  timeframes?: Timeframe[];
}
