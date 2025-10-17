export interface IpcRequestEnvelope<TPayload = unknown> {
  channel: string;
  correlationId: string;
  payload: TPayload;
}

export interface IpcResponseEnvelope<TPayload = unknown> {
  correlationId: string;
  success: boolean;
  payload?: TPayload;
  error?: IpcErrorPayload;
}

export interface IpcErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type IpcHandler<TRequest = unknown, TResponse = unknown> = (
  request: IpcRequestEnvelope<TRequest>
) => Promise<IpcResponseEnvelope<TResponse>>;

export type IpcSubscriptionHandler<TEvent = unknown> = (
  event: IpcRequestEnvelope<TEvent>
) => void;

export type LxRoute = "fin.candles/get" | "fin.quote/get";

export type LxSource = "network" | "cache" | "mock";

export interface LxFetchRequest<TParams = Record<string, unknown>> {
  route: LxRoute;
  params?: TParams;
  tokenId?: string;
  timeoutMs?: number;
}

export interface LxResponseMeta {
  cacheHit: boolean;
  ttl: number;
  source: LxSource;
  receivedAt?: number;
}

export interface LxErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export type LxFetchResponse<TData = unknown> =
  | { ok: true; data: TData; meta: LxResponseMeta }
  | { ok: false; err: LxErrorShape; meta: LxResponseMeta };
