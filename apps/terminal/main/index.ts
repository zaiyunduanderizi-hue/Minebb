import { app, BrowserWindow, ipcMain } from "electron";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { dummyAdapter } from "./finance/adapters/dummy";
import { lixingerAdapter } from "./finance/adapters/lixinger";
import { createFinanceService } from "./finance/services/finance";
import { registerAdapter } from "./finance/registry";
import { createMainRegistrar } from "./ipc/channels";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const resolvePreloadPath = () => join(__dirname, "../electron/preload/index.js");
const resolveRendererEntry = () => join(__dirname, "../renderer/index.html");

const registerAdapters = () => {
  registerAdapter(lixingerAdapter);
  registerAdapter(dummyAdapter);
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: resolvePreloadPath(),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(resolveRendererEntry()).catch((error) => {
      console.error("Failed to load renderer", error);
    });
  }

  return win;
};

const bootstrapIpc = () => {
  const registrar = createMainRegistrar(ipcMain);
  const financeService = createFinanceService();

  registrar.handle("finance:getCandles", async (_event, request) => {
    return financeService.getCandles(request);
  });

  registrar.handle("finance:getQuote", async (_event, request) => {
    return financeService.getQuote(request);
  });

  registrar.handle("finance:search", async (_event, request) => {
    return financeService.search(request);
  });
};

app.whenReady().then(() => {
  registerAdapters();
  bootstrapIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
