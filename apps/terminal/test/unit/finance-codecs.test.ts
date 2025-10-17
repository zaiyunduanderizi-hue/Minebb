import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseQuote,
  parseTimeseriesCandle,
} from "@minebb/main/finance/codecs";

const loadFixture = (name: string) => {
  const base = dirname(fileURLToPath(import.meta.url));
  const file = join(base, "../fixtures/lixinger", name);
  return JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
};

describe("Finance codecs", () => {
  it("parses daily kline payload", () => {
    const json = loadFixture("kline-daily.json");
    const series = parseTimeseriesCandle({
      symbol: "000001",
      market: "CN",
      timeframe: "1d",
      points: (json.data as any).klines.map((row: any) => ({
        t: Date.parse(row.date),
        o: row.open,
        h: row.high,
        l: row.low,
        c: row.close,
        v: row.volume,
      })),
    });
    expect(series.points.length).toBeGreaterThan(0);
    expect(series.points[0].t).toBeLessThan(series.points.at(-1)!.t);
  });

  it("parses weekly kline payload", () => {
    const json = loadFixture("kline-weekly.json");
    const series = parseTimeseriesCandle({
      symbol: "000001",
      market: "CN",
      timeframe: "1w",
      points: (json.data as any).klines.map((row: any) => ({
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
      price: (json.data as any).price,
      change: (json.data as any).change,
      changePct: (json.data as any).changePct,
      ts: Date.parse((json.data as any).time),
    });
    expect(quote.symbol).toBe("000001");
    expect(quote.price).toBeGreaterThan(0);
    expect(quote.ts).toBeGreaterThan(0);
  });

  it("rejects unsorted candle payloads", () => {
    expect(() =>
      parseTimeseriesCandle({
        symbol: "000001",
        market: "CN",
        timeframe: "1d",
        points: [
          { t: 1000, o: 1, h: 2, l: 0.5, c: 1.5 },
          { t: 500, o: 1.1, h: 2.1, l: 0.6, c: 1.6 },
        ],
      })
    ).toThrow(/sorted by ascending timestamp/i);
  });

  it("rejects quotes with invalid timestamp", () => {
    expect(() =>
      parseQuote({
        symbol: "000001",
        market: "CN",
        price: 12.34,
        ts: -1,
      })
    ).toThrow(/non-negative integer/i);
  });
});
