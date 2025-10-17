import { z } from "zod";

export const tickerSchema = z.string().min(1);

export const candleSchema = z.object({
  ticker: tickerSchema,
  timeframe: z.string().min(1),
  timestamp: z.number().int().nonnegative(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nonnegative().optional(),
});

export const quoteSchema = z.object({
  ticker: tickerSchema,
  price: z.number(),
  bid: z.number().optional(),
  ask: z.number().optional(),
  timestamp: z.number().int().nonnegative(),
  currency: z.string().optional(),
});

export const positionSchema = z.object({
  ticker: tickerSchema,
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
  ticker: tickerSchema,
  timestamp: z.number().int().nonnegative(),
  value: z.number(),
  metadata: z.record(z.unknown()).optional(),
});

export const indicatorInputSchema = z.object({
  series: z.array(candleSchema),
  params: z.record(z.unknown()).optional(),
});

export const indicatorResultSchema = z.object({
  name: z.string().min(1),
  values: z.array(
    z.object({
      timestamp: z.number().int().nonnegative(),
      value: z.number(),
    })
  ),
  meta: z.record(z.unknown()).optional(),
});

export type CandleCodec = z.infer<typeof candleSchema>;
export type QuoteCodec = z.infer<typeof quoteSchema>;
export type PositionCodec = z.infer<typeof positionSchema>;
export type PortfolioSnapshotCodec = z.infer<typeof portfolioSnapshotSchema>;
export type FactorSeriesPointCodec = z.infer<typeof factorSeriesPointSchema>;
export type IndicatorInputCodec = z.infer<typeof indicatorInputSchema>;
export type IndicatorResultCodec = z.infer<typeof indicatorResultSchema>;
