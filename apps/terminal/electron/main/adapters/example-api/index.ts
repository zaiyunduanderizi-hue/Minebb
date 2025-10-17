import type {
  Candle,
  FinanceAdapter,
  FinanceAdapterMetadata,
  FactorSeriesPoint,
  PortfolioSnapshot,
  Quote,
} from "../../../../common/finance/types";

const metadata: FinanceAdapterMetadata = {
  id: "example-api",
  displayName: "Example Market Data API",
  capabilities: {
    historical: true,
    realtime: false,
    fundamentals: false,
  },
  rateLimits: {
    maxRequestsPerMinute: 60,
  },
};

const adapter: FinanceAdapter = {
  metadata,
  async fetchCandles(): Promise<Candle[]> {
    // TODO: Replace with API integration logic.
    return [];
  },
  async fetchQuote(): Promise<Quote> {
    // TODO: Replace with API integration logic.
    return {
      ticker: "DEMO",
      price: 0,
      timestamp: Date.now(),
    };
  },
  async fetchPortfolio(): Promise<PortfolioSnapshot> {
    // TODO: Replace with API integration logic.
    return {
      accountId: "demo",
      timestamp: Date.now(),
      cash: 0,
      equity: 0,
      positions: [],
    };
  },
  async fetchFactorSeries(): Promise<FactorSeriesPoint[]> {
    // TODO: Replace with API integration logic.
    return [];
  },
};

export default adapter;
