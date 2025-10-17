import { contextBridge, ipcRenderer } from "electron";
import type { LxFetchReq, LxFetchRes } from "../../common/ipc/dto";

contextBridge.exposeInMainWorld("lx", {
  fetch: (req: LxFetchReq): Promise<LxFetchRes> => ipcRenderer.invoke("lx.fetch", req),
});
