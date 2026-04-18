const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
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
		mainWindow.setMenuBarVisibility(false);
	}

	mainWindow.loadFile(path.join(__dirname, "pages", "index.html"));

	// Open DevTools only in development
	if (process.env.DEBUG || process.env.NODE_ENV === "development") {
		mainWindow.webContents.openDevTools();
	}

	ipcMain.handle("window-control", (_, action) => {
		switch (action) {
			case "minimize":
				mainWindow.minimize();
				break;
			case "maximize":
				mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
				break;
			case "close":
				mainWindow.close();
				break;
			case "toggle-fullscreen":
				mainWindow.setFullScreen(!mainWindow.isFullScreen());
				break;
			default:
				break;
		}
	});

	// Global keyboard shortcuts
	registerGlobalShortcuts(mainWindow);
}

function registerGlobalShortcuts(win) {
	const shortcuts = [
		// Tab shortcuts
		{ key: "ctrl+t", action: "createTab" },
		{ key: "ctrl+x", action: "closeTab" },
		{ key: "ctrl+shift+t", action: "toggleTabBar" },
		{ key: "ctrl+shift+left", action: "prevTab" },
		{ key: "ctrl+shift+right", action: "nextTab" },
		{ key: "ctrl+0", action: "lastTab" },
		// Navigation
		{ key: "ctrl+left", action: "goBack" },
		{ key: "ctrl+right", action: "goForward" },
		{ key: "ctrl+shift+h", action: "goHome" },
		{ key: "ctrl+shift+s", action: "goSearch" },
		{ key: "ctrl+shift+a", action: "goAbout" },
		// Browser
		{ key: "ctrl+r", action: "refresh" },
		{ key: "f5", action: "refresh" },
		// UI
		{ key: "f11", action: "toggleFullscreen" },
		{ key: "ctrl+q", action: "closeApp" },
		{ key: "ctrl+m", action: "minimize" },
		{ key: "ctrl+shift+m", action: "maximize" },
		{ key: "esc", action: "escape" },
	];

	// Tab shortcuts for 1-9
	for (let i = 1; i <= 9; i++) {
		shortcuts.push({ key: `ctrl+${i}`, action: `selectTab${i}` });
	}

	shortcuts.forEach(({ key, action }) => {
		globalShortcut.register(key, () => {
			win.webContents.send("global-shortcut", action);
		});
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
