const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("kargo", {
	windowControl: (action) => ipcRenderer.invoke("window-control", action),
	setChromeZoom: (action) => ipcRenderer.invoke("chrome-zoom", action),
	openExternal: (url) => ipcRenderer.invoke("open-external", url),
	shortcuts: {
		list: () => ipcRenderer.invoke("shortcuts:list"),
		set: (id, keys) => ipcRenderer.invoke("shortcuts:set", { id, keys }),
		reset: (id = null) => ipcRenderer.invoke("shortcuts:reset", id),
		record: (active) => ipcRenderer.invoke("shortcuts:record", active),
		onCaptured: (callback) => {
			const listener = (_event, payload) => callback(payload);
			ipcRenderer.on("shortcut-captured", listener);
			return () => ipcRenderer.removeListener("shortcut-captured", listener);
		},
	},
	onGlobalShortcut: (callback) => ipcRenderer.on("global-shortcut", (_, action) => callback(action)),
	onOpenTab: (callback) => {
		const listener = (_event, payload) => {
			if (typeof payload === "string") {
				callback({ url: payload, background: false });
			} else if (payload && payload.url) {
				callback(payload);
			}
		};
		ipcRenderer.on("open-tab", listener);
		return () => ipcRenderer.removeListener("open-tab", listener);
	},
});
