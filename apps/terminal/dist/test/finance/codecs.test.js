import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { parseQuote, parseTimeseriesCandle, } from "@minebb/main/finance/codecs";
const loadFixture = (name) => {
    const base = dirname(fileURLToPath(import.meta.url));
    const file = join(base, "../fixtures/lixinger", name);
    return JSON.parse(readFileSync(file, "utf-8"));
};
describe("Lixinger codecs", () => {
    it("parses daily kline payload", () => {
        const json = loadFixture("kline-daily.json");
        const series = parseTimeseriesCandle({
            symbol: "000001",
            market: "CN",
            timeframe: "1d",
            points: json.data.klines.map((row) => ({
                t: Date.parse(row.date),
                o: row.open,
                h: row.high,
                l: row.low,
                c: row.close,
                v: row.volume,
            })),
        });
        expect(series.points.length).toBeGreaterThan(0);
        expect(series.points[0].t).toBeLessThan(series.points.at(-1).t);
    });
    it("parses weekly kline payload", () => {
        const json = loadFixture("kline-weekly.json");
        const series = parseTimeseriesCandle({
            symbol: "000001",
            market: "CN",
            timeframe: "1w",
            points: json.data.klines.map((row) => ({
                t: Date.parse(row.date),
                o: row.open,
                h: row.high,
                l: row.low,
                c: row.close,
                v: row.volume,
            })),
        });
        expect(series.timeframe).toBe("1w");
        expect(series.points.every((p) => Number.isFinite(p.c))).toBe(true);
    });
    it("parses quote payload", () => {
        const json = loadFixture("quote.json");
        const quote = parseQuote({
            symbol: "000001",
            market: "CN",
            price: json.data.price,
            change: json.data.change,
            changePct: json.data.changePct,
            ts: Date.parse(json.data.time),
        });
        expect(quote.symbol).toBe("000001");
        expect(quote.price).toBeGreaterThan(0);
        expect(quote.ts).toBeGreaterThan(0);
    });
});
