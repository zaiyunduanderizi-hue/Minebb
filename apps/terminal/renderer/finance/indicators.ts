import type { IndicatorInput, IndicatorResult } from "@minebb/common/finance/types";

export type IndicatorComputeFn = (input: IndicatorInput) => IndicatorResult;

const indicatorStore = new Map<string, IndicatorComputeFn>();

export const registerIndicator = (name: string, compute: IndicatorComputeFn): void => {
  indicatorStore.set(name, compute);
};

export const unregisterIndicator = (name: string): void => {
  indicatorStore.delete(name);
};

export const getIndicator = (name: string): IndicatorComputeFn | undefined =>
  indicatorStore.get(name);

export const listIndicators = (): string[] => Array.from(indicatorStore.keys());

// Example indicator to illustrate usage.
registerIndicator("sma", ({ series, params }): IndicatorResult => {
  const period = Number(params?.period ?? 5);
  const values = series
    .map((candle, index) => {
      if (index + 1 < period) {
        return undefined;
      }
      const slice = series.slice(index + 1 - period, index + 1);
      const avg = slice.reduce((sum, { c }) => sum + c, 0) / slice.length;
      return { t: candle.t, value: avg };
    })
    .filter((entry): entry is { t: number; value: number } => Boolean(entry));

  return {
    name: "sma",
    values,
    meta: { period },
  };
});
