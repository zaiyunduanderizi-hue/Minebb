export type Ticker = string;

export interface Candle {
  ticker: Ticker;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Quote {
  ticker: Ticker;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: number;
  currency?: string;
}

export interface Position {
  ticker: Ticker;
  quantity: number;
  averageCost: number;
  marketValue?: number;
  currency?: string;
  updatedAt: number;
}

export interface PortfolioSnapshot {
  accountId: string;
  timestamp: number;
  cash: number;
  equity: number;
  positions: Position[];
}

export interface FactorSeriesPoint {
  name: string;
  ticker: Ticker;
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
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
  fetchCandles(params: {
    ticker: Ticker;
    timeframe: string;
    start: number;
    end: number;
  }): Promise<Candle[]>;
  fetchQuote(params: { ticker: Ticker }): Promise<Quote>;
  fetchPortfolio?(params: { accountId: string }): Promise<PortfolioSnapshot>;
  fetchFactorSeries?(
    params: { name: string; ticker: Ticker; range: { start: number; end: number } }
  ): Promise<FactorSeriesPoint[]>;
}
