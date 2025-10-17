import { app, BrowserWindow, ipcMain } from "electron";
import { getAdapter, registerAdapter } from "../../common/finance/registry";
import type { CandlesParams, LxFetchReq, LxFetchRes, QuoteParams } from "../../common/ipc/dto";
import type { SymbolSearchResult, Timeseries, Candle, Quote } from "../../common/finance/types";
import { lixingerAdapter } from "./adapters/lixinger";

registerAdapter(lixingerAdapter);

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      preload: `${__dirname}/../preload/index.js`,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(`${__dirname}/../renderer/index.html`).catch((error) => {
      console.error("Failed to load renderer", error);
    });
  }
};

const buildMeta = (ttl = 0) => ({
  cacheHit: false,
  ttl,
  source: "network" as const,
});

type AdapterMethod =
  | (() => Promise<unknown>)
  | (() => Promise<Timeseries<Candle>>)
  | (() => Promise<Quote>)
  | (() => Promise<SymbolSearchResult[]>);

const invokeAdapter = async <T>(fn: AdapterMethod): Promise<T> => {
  return (await fn()) as T;
};

ipcMain.handle("lx.fetch", async (_event, req: LxFetchReq): Promise<LxFetchRes> => {
  const meta = buildMeta();
  try {
    const adapter = getAdapter("lixinger");
    if (!adapter) {
      return {
        ok: false,
        err: { code: "UNEXPECTED", message: "Adapter not registered" },
        meta,
      };
    }

    switch (req.route) {
      case "fin.candles/get": {
        const params = (req.params ?? {}) as CandlesParams;
        const data = await invokeAdapter<Timeseries<Candle>>(() =>
          adapter.getCandles(params)
        );
        return { ok: true, data, meta };
      }
      case "fin.quote/get": {
        const params = (req.params ?? {}) as QuoteParams;
        const data = await invokeAdapter<Quote>(() =>
          adapter.getQuote(params)
        );
        return { ok: true, data, meta };
      }
      case "fin.search/symbols": {
        const params = req.params ?? {};
        const q = String((params as Record<string, unknown>).q ?? "").trim();
        if (!q) {
          return { ok: true, data: [], meta };
        }
        const market = (params as Record<string, unknown>).market as CandlesParams["market"] | undefined;
        const data = adapter.searchSymbols
          ? await invokeAdapter<SymbolSearchResult[]>(() =>
              adapter.searchSymbols!(q, market)
            )
          : [];
        return { ok: true, data, meta };
      }
      default:
        return {
          ok: false,
          err: { code: "UNEXPECTED", message: `Unknown route ${req.route}` },
          meta,
        };
    }
  } catch (error) {
    const errObj = error as { code?: string; message?: string; details?: unknown; ttl?: number };
    if (typeof errObj.ttl === "number") {
      meta.ttl = errObj.ttl;
    }
    return {
      ok: false,
      err: {
        code: typeof errObj.code === "string" ? errObj.code : "UNEXPECTED",
        message: errObj.message ?? "Unexpected error",
        details: errObj.details,
      },
      meta,
    };
  }
});

app.whenReady().then(() => {
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
