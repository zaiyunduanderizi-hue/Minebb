const indicatorStore = new Map();
export const registerIndicator = (name, compute) => {
    indicatorStore.set(name, compute);
};
export const unregisterIndicator = (name) => {
    indicatorStore.delete(name);
};
export const getIndicator = (name) => indicatorStore.get(name);
export const listIndicators = () => Array.from(indicatorStore.keys());
// Example indicator to illustrate usage.
registerIndicator("sma", ({ series, params }) => {
    const period = Number(params?.period ?? 5);
    const values = series.points
        .map((candle, index) => {
        if (index + 1 < period) {
            return undefined;
        }
        const slice = series.points.slice(index + 1 - period, index + 1);
        const avg = slice.reduce((sum, { c }) => sum + c, 0) / slice.length;
        return { t: candle.t, value: avg };
    })
        .filter((entry) => Boolean(entry));
    return {
        name: "sma",
        values,
        meta: { period },
    };
});
