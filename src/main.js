const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

function createWindow() {
	const win = new BrowserWindow({
		width: 1200,
		height: 820,
		minWidth: 900,
		minHeight: 650,
		title: "🚂🚋🚋 Kargo",
		frame: process.platform === "darwin",
		titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
		autoHideMenuBar: true,
		backgroundColor: "#111",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			webviewTag: true,
		},
	});

	if (process.platform !== "darwin") {
		win.setMenuBarVisibility(false);
	}

	win.loadFile(path.join(__dirname, "pages", "index.html"));

	// Open DevTools for debugging
	// win.webContents.openDevTools();

	ipcMain.handle("window-control", (_, action) => {
		switch (action) {
			case "minimize":
				win.minimize();
				break;
			case "maximize":
				win.isMaximized() ? win.unmaximize() : win.maximize();
				break;
			case "close":
				win.close();
				break;
			case "toggle-fullscreen":
				win.setFullScreen(!win.isFullScreen());
				break;
			default:
				break;
		}
	});
}

app.whenReady().then(createWindow);

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
