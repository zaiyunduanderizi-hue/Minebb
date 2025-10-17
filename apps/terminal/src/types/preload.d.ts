import type { IpcChannels } from "@minebb/main/ipc/channels";

declare global {
  interface Window {
    minebb: {
      finance: {
        getCandles(request: IpcChannels["finance:getCandles"]["req"]): Promise<IpcChannels["finance:getCandles"]["res"]>;
        getQuote(request: IpcChannels["finance:getQuote"]["req"]): Promise<IpcChannels["finance:getQuote"]["res"]>;
        search(request: IpcChannels["finance:search"]["req"]): Promise<IpcChannels["finance:search"]["res"]>;
      };
    };
  }
}

export {};
