import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import type { Candle, Quote, Timeseries } from "../../common/finance/types";
import {
  type FinanceError,
  type FinanceResponse,
  fetchCandles,
  fetchQuote,
} from "../services/finance";

const defaultRetry = (failureCount: number, error: unknown) => {
  if (error instanceof Error && "category" in error) {
    const category = (error as FinanceError).category;
    if (category === "401" || category === "UNEXPECTED") {
      return false;
    }
    if (category === "429") {
      return failureCount < 1;
    }
  }
  return failureCount < 2;
};

export const useCandles = (
  params: Parameters<typeof fetchCandles>[0],
  options?: Partial<UseQueryOptions<FinanceResponse<Timeseries<Candle>>, FinanceError>>
): UseQueryResult<FinanceResponse<Timeseries<Candle>>, FinanceError> => {
  const { retry, staleTime, ...rest } = options ?? {};
  return useQuery<FinanceResponse<Timeseries<Candle>>, FinanceError>({
    queryKey: ["fin.candles/get", params],
    queryFn: () => fetchCandles(params),
    staleTime: staleTime ?? 60_000,
    retry: retry ?? defaultRetry,
    ...rest,
  });
};

export const useQuote = (
  params: Parameters<typeof fetchQuote>[0],
  options?: Partial<UseQueryOptions<FinanceResponse<Quote>, FinanceError>>
): UseQueryResult<FinanceResponse<Quote>, FinanceError> => {
  const { retry, staleTime, ...rest } = options ?? {};
  return useQuery<FinanceResponse<Quote>, FinanceError>({
    queryKey: ["fin.quote/get", params],
    queryFn: () => fetchQuote(params),
    staleTime: staleTime ?? 15_000,
    retry: retry ?? defaultRetry,
    ...rest,
  });
};
