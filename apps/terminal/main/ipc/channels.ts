import type { IpcMain, IpcMainInvokeEvent, IpcRenderer } from "electron";
import type {
  Candle,
  Market,
  Quote,
  SymbolCode,
  Timeframe,
  Timeseries,
} from "@minebb/common/finance/types";

export interface IpcChannels {
  "finance:getCandles": {
    req: { symbol: SymbolCode; market: Market; timeframe: Timeframe; from?: number; to?: number };
    res: Timeseries<Candle>;
  };
  "finance:getQuote": {
    req: { symbol: SymbolCode; market: Market };
    res: Quote;
  };
  "finance:search": {
    req: { query: string; market?: Market };
    res: Array<{ symbol: SymbolCode; market: Market; name?: string }>;
  };
}

export type ChannelKey = keyof IpcChannels;

export type ChannelRequest<TChannel extends ChannelKey> = IpcChannels[TChannel]["req"];
export type ChannelResponse<TChannel extends ChannelKey> = IpcChannels[TChannel]["res"];

export type ChannelHandler<TChannel extends ChannelKey> = (
  event: IpcMainInvokeEvent,
  request: ChannelRequest<TChannel>
) => Promise<ChannelResponse<TChannel>> | ChannelResponse<TChannel>;

export const registerMainHandler = <TChannel extends ChannelKey>(
  ipcMain: IpcMain,
  channel: TChannel,
  handler: ChannelHandler<TChannel>
): void => {
  ipcMain.handle(channel, async (event, request: ChannelRequest<TChannel>) => handler(event, request));
};

export const createMainRegistrar = (ipcMain: IpcMain) => ({
  handle<TChannel extends ChannelKey>(
    channel: TChannel,
    handler: ChannelHandler<TChannel>
  ): void {
    registerMainHandler(ipcMain, channel, handler);
  },
});

export type RendererInvoker = {
  invoke<TChannel extends ChannelKey>(
    channel: TChannel,
    request: ChannelRequest<TChannel>
  ): Promise<ChannelResponse<TChannel>>;
};

export const createRendererInvoker = (ipcRenderer: IpcRenderer): RendererInvoker => ({
  invoke<TChannel extends ChannelKey>(channel: TChannel, request: ChannelRequest<TChannel>) {
    return ipcRenderer.invoke(channel, request) as Promise<ChannelResponse<TChannel>>;
  },
});
