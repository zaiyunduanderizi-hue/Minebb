import { contextBridge, ipcRenderer } from "electron";

import type { IpcChannels } from "@minebb/main/ipc/channels";
import { createRendererInvoker } from "@minebb/main/ipc/channels";

const ipc = createRendererInvoker(ipcRenderer);

const financeBridge = {
  getCandles(request: IpcChannels["finance:getCandles"]["req"]) {
    return ipc.invoke("finance:getCandles", request);
  },
  getQuote(request: IpcChannels["finance:getQuote"]["req"]) {
    return ipc.invoke("finance:getQuote", request);
  },
  search(request: IpcChannels["finance:search"]["req"]) {
    return ipc.invoke("finance:search", request);
  },
};

contextBridge.exposeInMainWorld("minebb", {
  finance: financeBridge,
});
