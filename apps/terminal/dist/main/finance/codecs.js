import { z } from "zod";
const friendlyErrorMap = (issue, ctx) => {
    const path = issue.path.join(".");
    const location = path ? ` at \`${path}\`` : "";
    switch (issue.code) {
        case z.ZodIssueCode.invalid_type:
            return {
                message: `Expected ${issue.expected} but received ${issue.received}${location}.`,
            };
        case z.ZodIssueCode.invalid_enum_value:
            return {
                message: `Value${location} must be one of: ${(issue.options ?? []).join(", ")}.`,
            };
        case z.ZodIssueCode.custom:
            return { message: issue.message ?? `Invalid value${location}.` };
        default:
            return { message: `${issue.message}${location}` };
    }
};
const number = () => z.number({ invalid_type_error: "Must be a number." }).finite("Must be a finite number.");
export const marketSchema = z.enum(["CN", "HK"], {
    errorMap: friendlyErrorMap,
});
export const timeframeSchema = z.enum(["1d", "1w", "1m"], {
    errorMap: friendlyErrorMap,
});
export const candlePointSchema = z
    .object({
    t: number().int().nonnegative("Timestamp must be a non-negative integer."),
    o: number(),
    h: number(),
    l: number(),
    c: number(),
    v: number().nonnegative("Volume must be non-negative.").optional(),
}, { errorMap: friendlyErrorMap })
    .strict();
export const timeseriesCandleSchema = z
    .object({
    symbol: z.string({ required_error: "Symbol is required." }).min(1, "Symbol cannot be empty."),
    market: marketSchema,
    timeframe: timeframeSchema,
    points: z
        .array(candlePointSchema, {
        invalid_type_error: "Points must be an array of candles.",
    })
        .superRefine((points, ctx) => {
        let prev = -Infinity;
        for (const [index, candle] of points.entries()) {
            if (!Number.isFinite(candle.t)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["points", index, "t"],
                    message: "Timestamp must be finite.",
                });
                continue;
            }
            if (candle.t < prev) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["points", index, "t"],
                    message: "Candles must be sorted by ascending timestamp.",
                });
                return;
            }
            prev = candle.t;
        }
    }),
    meta: z.record(z.unknown()).optional(),
}, { errorMap: friendlyErrorMap })
    .strict();
export const quoteSchema = z
    .object({
    symbol: z.string({ required_error: "Symbol is required." }).min(1, "Symbol cannot be empty."),
    market: marketSchema,
    price: number(),
    change: number().optional(),
    changePct: number().optional(),
    currency: z.string().min(1).optional(),
    ts: number().int().nonnegative("Timestamp must be a non-negative integer."),
}, { errorMap: friendlyErrorMap })
    .strict();
const formatIssues = (issues) => issues
    .map((issue) => {
    const path = issue.path.join(".");
    return path ? `${issue.message} (at \`${path}\`)` : issue.message;
})
    .join("; ");
export const parseTimeseriesCandle = (input) => {
    const result = timeseriesCandleSchema.safeParse(input, { errorMap: friendlyErrorMap });
    if (!result.success) {
        throw new Error(`Timeseries validation failed: ${formatIssues(result.error.issues)}`);
    }
    return result.data;
};
export const parseQuote = (input) => {
    const result = quoteSchema.safeParse(input, { errorMap: friendlyErrorMap });
    if (!result.success) {
        throw new Error(`Quote validation failed: ${formatIssues(result.error.issues)}`);
    }
    return result.data;
};
