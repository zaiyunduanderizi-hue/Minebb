export class IpcError extends Error {
    code;
    details;
    constructor(payload) {
        super(payload.message);
        this.name = "IpcError";
        this.code = payload.code;
        this.details = payload.details;
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
        };
    }
}
export const createIpcErrorPayload = (code, message, details) => ({
    code,
    message,
    details,
});
