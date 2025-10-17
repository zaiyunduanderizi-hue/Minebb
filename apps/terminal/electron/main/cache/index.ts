type CacheKey = string;

interface CacheEntry<TValue> {
  value: TValue;
  expiresAt: number;
}

export interface CacheLayer<TValue = unknown> {
  get(key: CacheKey): Promise<TValue | undefined>;
  set(key: CacheKey, value: TValue, ttlMs: number): Promise<void>;
  invalidate(key: CacheKey): Promise<void>;
}

export class MemoryCacheLayer<TValue = unknown> implements CacheLayer<TValue> {
  private readonly store = new Map<CacheKey, CacheEntry<TValue>>();

  async get(key: CacheKey): Promise<TValue | undefined> {
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

  async set(key: CacheKey, value: TValue, ttlMs: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async invalidate(key: CacheKey): Promise<void> {
    this.store.delete(key);
  }
}

export class LayeredCache<TValue = unknown> implements CacheLayer<TValue> {
  constructor(private readonly layers: CacheLayer<TValue>[]) {}

  async get(key: CacheKey): Promise<TValue | undefined> {
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

  async set(key: CacheKey, value: TValue, ttlMs: number): Promise<void> {
    await Promise.all(this.layers.map((layer) => layer.set(key, value, ttlMs)));
  }

  async invalidate(key: CacheKey): Promise<void> {
    await Promise.all(this.layers.map((layer) => layer.invalidate(key)));
  }

  private async rehydrate(
    key: CacheKey,
    value: TValue,
    sourceLayer: CacheLayer<TValue>
  ): Promise<void> {
    const ttlMs = 60_000; // Default 1 minute TTL for rehydration.
    const sourceIndex = this.layers.indexOf(sourceLayer);
    if (sourceIndex === -1) {
      return;
    }
    const slowerLayers = this.layers.slice(0, sourceIndex);
    await Promise.all(slowerLayers.map((layer) => layer.set(key, value, ttlMs)));
  }
}
