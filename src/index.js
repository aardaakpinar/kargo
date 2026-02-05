'use strict';
const electron = require('electron');
const isDev = require('electron-is-dev');
const window = require('./window');

require('events').EventEmitter.prototype._maxListeners = 100;

const app = electron.app;
const { ipcMain, globalShortcut } = electron;

app.commandLine.appendSwitch('--disable-cache');
app.commandLine.appendSwitch('--disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

app.setName('Kargo');
const ENABLE_DEBUG = false;

if (isDev && ENABLE_DEBUG) {
  const debug = require('electron-debug');
  if (typeof debug === 'function') debug();
  else if (debug.default) debug.default();
}

let mainWindow;

function onClosed() {
  mainWindow = null;
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = window(onClosed);
  }
});

app.on('ready', () => {
  mainWindow = window(onClosed);

  ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.on('toggle-fullscreen', () => {
    if (mainWindow) {
      const fs = !mainWindow.isFullScreen();
      mainWindow.setFullScreen(fs);
    }
  });

  ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  // Register global shortcuts
  globalShortcut.register('CommandOrControl+Tab', () => {
    mainWindow.webContents.send('tabs-toggle');
  });

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    mainWindow.webContents.send('dark-mode');
  });

  globalShortcut.register('CommandOrControl+M', () => {
    mainWindow.webContents.send('menu-toggle');
  });

  globalShortcut.register('CommandOrControl+H', () => {
    mainWindow.webContents.send('history-toggle');
  });

  globalShortcut.register('CommandOrControl+Shift+D', () => {
    mainWindow.webContents.send('webview-devtools');
  });

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    mainWindow.webContents.send('webview-about');
  });

  globalShortcut.register('CommandOrControl+Left', () => {
    mainWindow.webContents.send('webview-back');
  });

  globalShortcut.register('CommandOrControl+Right', () => {
    mainWindow.webContents.send('webview-forward');
  });

  globalShortcut.register('CommandOrControl+R', () => {
    mainWindow.webContents.send('webview-reload');
  });

  globalShortcut.register('F5', () => {
    mainWindow.webContents.send('webview-reload');
  });

  globalShortcut.register('CommandOrControl+Shift+H', () => {
    mainWindow.webContents.send('webview-home');
  });

  globalShortcut.register('CommandOrControl+T', () => {
    mainWindow.webContents.send('tabs-create');
  });

  globalShortcut.register('CommandOrControl+X', () => {
    mainWindow.webContents.send('tabs-remove-current');
  });

  globalShortcut.register('CommandOrControl+Shift+Left', () => {
    mainWindow.webContents.send('tabs-prev');
  });

  globalShortcut.register('CommandOrControl+Shift+Right', () => {
    mainWindow.webContents.send('tabs-next');
  });

  globalShortcut.register('CommandOrControl+0', () => {
    mainWindow.webContents.send('tabs-last');
  });

  // Number keys for tabs
  for (let i = 1; i <= 9; i++) {
    globalShortcut.register(`CommandOrControl+${i}`, () => {
      mainWindow.webContents.send('tabs-go-to', i - 1);
    });
  }
});
