const ensureBridge = () => {
    const bridge = window.minebb?.finance;
    if (!bridge) {
        throw new Error("Finance bridge is not available in the current context.");
    }
    return bridge;
};
export const getCandles = async (params) => {
    return ensureBridge().getCandles(params);
};
export const getQuote = async (params) => {
    return ensureBridge().getQuote(params);
};
export const searchSymbols = async (query, market) => {
    const trimmed = query.trim();
    if (!trimmed) {
        return [];
    }
    const request = { query: trimmed, market };
    return ensureBridge().search(request);
};
