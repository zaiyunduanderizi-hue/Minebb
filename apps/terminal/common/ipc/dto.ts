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
