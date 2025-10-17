import { parseQuote, parseTimeseriesCandle } from "../codecs";
const buildTimeseries = (symbol, market, timeframe) => parseTimeseriesCandle({
    symbol,
    market,
    timeframe,
    points: [
        { t: Date.now() - 2 * 86_400_000, o: 10, h: 12, l: 9.5, c: 11, v: 1_000_000 },
        { t: Date.now() - 86_400_000, o: 11, h: 12.5, l: 10.5, c: 12, v: 900_000 },
        { t: Date.now(), o: 12, h: 13, l: 11.5, c: 12.8, v: 1_200_000 },
    ],
});
const buildQuote = (symbol, market) => parseQuote({
    symbol,
    market,
    price: 12.8,
    change: 0.8,
    changePct: 6.67,
    currency: market === "HK" ? "HKD" : "CNY",
    ts: Date.now(),
});
export const dummyAdapter = {
    id: "dummy",
    metadata: {
        displayName: "Dummy",
        markets: ["CN", "HK"],
        timeframes: ["1d"],
        capabilities: ["candles", "quote", "search"],
    },
    async getCandles({ symbol, market, timeframe }) {
        return buildTimeseries(symbol, market, timeframe);
    },
    async getQuote({ symbol, market }) {
        return buildQuote(symbol, market);
    },
    async searchSymbols(query, market) {
        const normalized = query.trim().toUpperCase();
        if (!normalized) {
            return [];
        }
        const markets = market ? [market] : ["CN", "HK"];
        return markets.map((mkt) => ({
            symbol: normalized,
            market: mkt,
            name: `Demo ${normalized}`,
        }));
    },
};
