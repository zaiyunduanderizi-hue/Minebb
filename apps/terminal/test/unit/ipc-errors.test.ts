import { describe, expect, it } from "vitest";

import { IpcError, createIpcErrorPayload } from "@minebb/common/ipc/errors";

describe("IPC error helpers", () => {
  it("serializes IpcError instances", () => {
    const err = new IpcError({ code: "40101", message: "Unauthorized", details: { reason: "TOKEN" } });
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("40101");
    expect(err.message).toBe("Unauthorized");
    expect(err.details).toEqual({ reason: "TOKEN" });
    expect(err.toJSON()).toEqual({ code: "40101", message: "Unauthorized", details: { reason: "TOKEN" } });
  });

  it("creates payloads with helper", () => {
    const payload = createIpcErrorPayload("42901", "Rate limited", { retryAfter: 15 });
    expect(payload).toEqual({ code: "42901", message: "Rate limited", details: { retryAfter: 15 } });
  });
});
