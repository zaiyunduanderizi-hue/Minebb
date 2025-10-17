export {};

declare global {
  interface Window {
    lx?: {
      fetch<T = unknown>(request: import("../../common/ipc/dto").LxFetchRequest): Promise<
        import("../../common/ipc/dto").LxFetchResponse<T>
      >;
    };
  }
}
