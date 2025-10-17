export class MemoryCacheLayer {
    store = new Map();
    async get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    async set(key, value, ttlMs) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }
    async invalidate(key) {
        this.store.delete(key);
    }
}
export class LayeredCache {
    layers;
    constructor(layers) {
        this.layers = layers;
    }
    async get(key) {
        for (const layer of this.layers) {
            const value = await layer.get(key);
            if (value !== undefined) {
                // Hydrate slower layers if faster ones had the data.
                await this.rehydrate(key, value, layer);
                return value;
            }
        }
        return undefined;
    }
    async set(key, value, ttlMs) {
        await Promise.all(this.layers.map((layer) => layer.set(key, value, ttlMs)));
    }
    async invalidate(key) {
        await Promise.all(this.layers.map((layer) => layer.invalidate(key)));
    }
    async rehydrate(key, value, sourceLayer) {
        const ttlMs = 60_000; // Default 1 minute TTL for rehydration.
        const sourceIndex = this.layers.indexOf(sourceLayer);
        if (sourceIndex === -1) {
            return;
        }
        const slowerLayers = this.layers.slice(0, sourceIndex);
        await Promise.all(slowerLayers.map((layer) => layer.set(key, value, ttlMs)));
    }
}
