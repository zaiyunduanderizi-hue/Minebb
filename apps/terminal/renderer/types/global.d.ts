export {};

declare global {
  interface Window {
    lx?: {
      fetch<T = unknown>(request: import("@minebb/common/ipc/dto").LxFetchRequest): Promise<
        import("@minebb/common/ipc/dto").LxFetchResponse<T>
      >;
    };
  }
}
