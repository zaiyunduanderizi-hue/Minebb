export const registerMainHandler = (ipcMain, channel, handler) => {
    ipcMain.handle(channel, async (event, request) => handler(event, request));
};
export const createMainRegistrar = (ipcMain) => ({
    handle(channel, handler) {
        registerMainHandler(ipcMain, channel, handler);
    },
});
export const createRendererInvoker = (ipcRenderer) => ({
    invoke(channel, request) {
        return ipcRenderer.invoke(channel, request);
    },
});
