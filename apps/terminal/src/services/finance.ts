import type {
  Candle,
  FactorSeriesPoint,
  PortfolioSnapshot,
  Quote,
} from "../../common/finance/types";
import type { IpcRequestEnvelope, IpcResponseEnvelope } from "../../common/ipc/dto";
import { IpcError } from "../../common/ipc/errors";

type FinanceRequestChannel =
  | "finance:candles"
  | "finance:quote"
  | "finance:portfolio"
  | "finance:factor-series";

interface FinanceRequestPayloads {
  "finance:candles": {
    adapterId: string;
    ticker: string;
    timeframe: string;
    range: { start: number; end: number };
  };
  "finance:quote": { adapterId: string; ticker: string };
  "finance:portfolio": { adapterId: string; accountId: string };
  "finance:factor-series": {
    adapterId: string;
    name: string;
    ticker: string;
    range: { start: number; end: number };
  };
}

interface FinanceResponsePayloads {
  "finance:candles": Candle[];
  "finance:quote": Quote;
  "finance:portfolio": PortfolioSnapshot;
  "finance:factor-series": FactorSeriesPoint[];
}

const invoke = async <TChannel extends FinanceRequestChannel>(
  channel: TChannel,
  payload: FinanceRequestPayloads[TChannel]
): Promise<FinanceResponsePayloads[TChannel]> => {
  const correlationId = crypto.randomUUID();
  const request: IpcRequestEnvelope<FinanceRequestPayloads[TChannel]> = {
    channel,
    correlationId,
    payload,
  };

  const response = (await window.electron.invoke(
    channel,
    request
  )) as IpcResponseEnvelope<FinanceResponsePayloads[TChannel]>;

  if (!response.success) {
    throw new IpcError(
      response.error ?? {
        code: "UNKNOWN_ERROR",
        message: "Finance service call failed.",
      }
    );
  }

  return response.payload as FinanceResponsePayloads[TChannel];
};

export const fetchCandles = (payload: FinanceRequestPayloads["finance:candles"]) =>
  invoke("finance:candles", payload);

export const fetchQuote = (payload: FinanceRequestPayloads["finance:quote"]) =>
  invoke("finance:quote", payload);

export const fetchPortfolio = (
  payload: FinanceRequestPayloads["finance:portfolio"]
) => invoke("finance:portfolio", payload);

export const fetchFactorSeries = (
  payload: FinanceRequestPayloads["finance:factor-series"]
) => invoke("finance:factor-series", payload);

declare global {
  interface Window {
    electron: {
      invoke(channel: string, payload: unknown): Promise<unknown>;
    };
  }
}
