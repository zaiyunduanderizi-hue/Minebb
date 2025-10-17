import { contextBridge, ipcRenderer } from "electron";
import { createRendererInvoker } from "@minebb/main/ipc/channels";
const ipc = createRendererInvoker(ipcRenderer);
const financeBridge = {
    getCandles(request) {
        return ipc.invoke("finance:getCandles", request);
    },
    getQuote(request) {
        return ipc.invoke("finance:getQuote", request);
    },
    search(request) {
        return ipc.invoke("finance:search", request);
    },
};
contextBridge.exposeInMainWorld("minebb", {
    finance: financeBridge,
});
