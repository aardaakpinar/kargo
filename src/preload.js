const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kargo", {
	windowControl: (action) => ipcRenderer.invoke("window-control", action),
});
