const path = require('path');
module.paths.push(path.resolve('../node_modules'));

const mitt = require('mitt');
const keyval = require('idb-keyval');
const { ipcRenderer } = require('electron');
// const Store = require('electron-store');

const webview = require('./view/webview');
const keyboard = require('./view/keyboard');
const menu = require('./view/menu');
const titlebar = require('./view/titlebar');
const tabs = require('./view/tabs');
const progress = require('./view/progress');
const history = require('./view/history');
// const onboarding = require('./view/onboarding');

const emitter = mitt();
// const store = new Store();

const state = {
  url: 'https://home.kargo',
  views: [],
  theme: 'light'
  // store
};

titlebar(emitter, state);
progress(emitter);
history(emitter);
webview(emitter, state);
menu(emitter, state);
keyboard(emitter, state);
// onboarding(emitter, state);

setTimeout(() => {
  tabs(emitter, state);
}, 200);

document.querySelector('.urlbar').focus();

keyval.get('tabs').then(val => {
  if (val == undefined) {
    keyval.set('tabs', []);
  }

  if (val.length == 0) {
    emitter.emit('webview-create');
  } else {
    for (let v of val) {
      emitter.emit('webview-create', v);
    }
  }
});

setInterval(() => {
  const tabs = [];

  for (let view of state.views) {
    tabs.push(document.querySelector('#' + view.id).getURL());
  }

  keyval.set('tabs', tabs);
}, 500);

emitter.on('tabs-db-flush', () => {
  keyval.set('tabs', []);
});

// IPC listeners for global shortcuts
ipcRenderer.on('tabs-toggle', () => {
  emitter.emit('tabs-toggle');
});

ipcRenderer.on('dark-mode', () => {
  emitter.emit('dark-mode');
});

ipcRenderer.on('menu-toggle', () => {
  emitter.emit('menu-toggle');
});

ipcRenderer.on('history-toggle', () => {
  emitter.emit('history-toggle');
});

ipcRenderer.on('webview-devtools', () => {
  emitter.emit('webview-devtools');
});

ipcRenderer.on('webview-about', () => {
  emitter.emit('webview-about');
});

ipcRenderer.on('webview-back', () => {
  emitter.emit('webview-back');
});

ipcRenderer.on('webview-forward', () => {
  emitter.emit('webview-forward');
});

ipcRenderer.on('webview-reload', () => {
  emitter.emit('webview-reload');
});

ipcRenderer.on('webview-home', () => {
  emitter.emit('webview-home');
});

ipcRenderer.on('tabs-create', () => {
  emitter.emit('tabs-create');
});

ipcRenderer.on('tabs-remove-current', () => {
  emitter.emit('tabs-remove-current');
});

ipcRenderer.on('tabs-prev', () => {
  emitter.emit('tabs-prev');
});

ipcRenderer.on('tabs-next', () => {
  emitter.emit('tabs-next');
});

ipcRenderer.on('tabs-last', () => {
  emitter.emit('tabs-last');
});

ipcRenderer.on('tabs-go-to', (event, index) => {
  emitter.emit('tabs-go-to', index);
});
