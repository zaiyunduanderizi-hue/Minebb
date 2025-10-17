import { z } from "zod";

export const symbolSchema = z.string().min(1);
export const marketSchema = z.enum(["CN", "HK"]);
export const timeframeSchema = z.enum(["1d", "1w", "1m"]);

export const candlePointSchema = z.object({
  t: z.number().int().nonnegative(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number().nonnegative().optional(),
});

export const timeseriesSchema = z.object({
  symbol: symbolSchema,
  market: marketSchema,
  timeframe: timeframeSchema,
  points: z.array(candlePointSchema),
  meta: z.record(z.unknown()).optional(),
});

export const quoteSchema = z.object({
  symbol: symbolSchema,
  market: marketSchema,
  price: z.number(),
  change: z.number().optional(),
  changePct: z.number().optional(),
  ts: z.number().int().nonnegative(),
  currency: z.string().optional(),
});

export const positionSchema = z.object({
  symbol: symbolSchema,
  quantity: z.number(),
  averageCost: z.number(),
  marketValue: z.number().optional(),
  currency: z.string().optional(),
  updatedAt: z.number().int().nonnegative(),
});

export const portfolioSnapshotSchema = z.object({
  accountId: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
  cash: z.number(),
  equity: z.number(),
  positions: z.array(positionSchema),
});

export const factorSeriesPointSchema = z.object({
  name: z.string().min(1),
  symbol: symbolSchema,
  market: marketSchema,
  timestamp: z.number().int().nonnegative(),
  value: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export const indicatorInputSchema = z.object({
  series: z.array(candlePointSchema),
  params: z.record(z.unknown()).optional(),
});

export const indicatorResultSchema = z.object({
  name: z.string().min(1),
  values: z.array(
    z.object({
      t: z.number().int().nonnegative(),
      value: z.number(),
    })
  ),
  meta: z.record(z.unknown()).optional(),
});

export type CandlePointCodec = z.infer<typeof candlePointSchema>;
export type TimeseriesCodec = z.infer<typeof timeseriesSchema>;
export type QuoteCodec = z.infer<typeof quoteSchema>;
export type PositionCodec = z.infer<typeof positionSchema>;
export type PortfolioSnapshotCodec = z.infer<typeof portfolioSnapshotSchema>;
export type FactorSeriesPointCodec = z.infer<typeof factorSeriesPointSchema>;
export type IndicatorInputCodec = z.infer<typeof indicatorInputSchema>;
export type IndicatorResultCodec = z.infer<typeof indicatorResultSchema>;
