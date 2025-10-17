const registry = new Map();
export const registerAdapter = (adapter) => {
    registry.set(adapter.id, adapter);
};
export const unregisterAdapter = (adapterId) => {
    registry.delete(adapterId);
};
export const getAdapter = (adapterId) => registry.get(adapterId);
export const listAdapters = () => Array.from(registry.keys());
