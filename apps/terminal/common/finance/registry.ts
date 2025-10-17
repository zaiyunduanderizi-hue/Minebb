import type { FinanceAdapter, FinanceAdapterMetadata } from "./types";

const adapterStore = new Map<string, FinanceAdapter>();

export const registerFinanceAdapter = (adapter: FinanceAdapter): void => {
  adapterStore.set(adapter.metadata.id, adapter);
};

export const unregisterFinanceAdapter = (adapterId: string): void => {
  adapterStore.delete(adapterId);
};

export const getFinanceAdapter = (adapterId: string): FinanceAdapter | undefined =>
  adapterStore.get(adapterId);

export const listFinanceAdapters = (): FinanceAdapterMetadata[] =>
  Array.from(adapterStore.values()).map(({ metadata }) => metadata);
