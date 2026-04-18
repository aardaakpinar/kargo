const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kargo", {
	windowControl: (action) => ipcRenderer.invoke("window-control", action),
	onGlobalShortcut: (callback) => ipcRenderer.on("global-shortcut", (_, action) => callback(action)),
});
