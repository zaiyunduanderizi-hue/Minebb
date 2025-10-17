export interface IpcErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class IpcError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(payload: IpcErrorPayload) {
    super(payload.message);
    this.name = "IpcError";
    this.code = payload.code;
    this.details = payload.details;
  }

  toJSON(): IpcErrorPayload {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export const createIpcErrorPayload = (
  code: string,
  message: string,
  details?: unknown
): IpcErrorPayload => ({
  code,
  message,
  details,
});
