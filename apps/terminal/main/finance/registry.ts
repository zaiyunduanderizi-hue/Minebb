import type { FinanceAdapter } from "../../common/finance/types";

const registry = new Map<string, FinanceAdapter>();

export const registerAdapter = (adapter: FinanceAdapter): void => {
  registry.set(adapter.id, adapter);
};

export const unregisterAdapter = (adapterId: string): void => {
  registry.delete(adapterId);
};

export const getAdapter = (adapterId: string): FinanceAdapter | undefined =>
  registry.get(adapterId);

export const listAdapters = (): string[] => Array.from(registry.keys());
