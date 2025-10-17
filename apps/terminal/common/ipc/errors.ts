import type { IpcErrorPayload } from "./dto";

export class IpcError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

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
  details?: Record<string, unknown>
): IpcErrorPayload => ({
  code,
  message,
  details,
});
