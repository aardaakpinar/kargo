// Kargo Keyboard Shortcuts Manager
// Tüm kısayolları merkezi olarak yönetir

class ShortcutsManager {
  constructor() {
    this.shortcuts = new Map();
    this.handlers = {};
    this.init();
  }

  init() {
    this.registerTabShortcuts();
    this.registerNavigationShortcuts();
    this.registerBrowserShortcuts();
    this.registerUIShortcuts();
    this.setupEventListeners();
  }

  // ============================================================
  // KISAYOL REGISTRASYONU
  // ============================================================

  registerTabShortcuts() {
    this.register('Ctrl+T', 'Yeni sekme aç', () => {
      if (window.kargoTabs && window.kargoTabs.createTab) {
        window.kargoTabs.createTab();
      }
    });

    this.register('Ctrl+X', 'Sekmeyi kapat', () => {
      if (window.kargoTabs && window.kargoTabs.closeCurrentTab) {
        window.kargoTabs.closeCurrentTab();
      }
    });

    this.register('Ctrl+Shift+T', 'Tab bar göster/gizle', () => {
      if (window.kargoTabs && window.kargoTabs.toggleTabBar) {
        window.kargoTabs.toggleTabBar();
      }
    });

    this.register('Ctrl+Shift+ArrowLeft', 'Önceki sekme', () => {
      if (window.kargoTabs && window.kargoTabs.selectPreviousTab) {
        window.kargoTabs.selectPreviousTab();
      }
    });

    this.register('Ctrl+Shift+ArrowRight', 'Sonraki sekme', () => {
      if (window.kargoTabs && window.kargoTabs.selectNextTab) {
        window.kargoTabs.selectNextTab();
      }
    });

    this.register('Ctrl+0', 'Son sekmeye git', () => {
      if (window.kargoTabs && window.kargoTabs.selectLastTab) {
        window.kargoTabs.selectLastTab();
      }
    });

    for (let i = 1; i <= 9; i++) {
      this.register(`Ctrl+${i}`, `${i}. sekmeye git`, () => {
        if (window.kargoTabs && window.kargoTabs.selectTabByIndex) {
          window.kargoTabs.selectTabByIndex(i - 1);
        }
      });
    }
  }

  registerNavigationShortcuts() {
    this.register('Ctrl+ArrowLeft', 'Geri git', () => {
      if (window.kargoTabs && window.kargoTabs.goBack) {
        window.kargoTabs.goBack();
      }
    });

    this.register('Ctrl+ArrowRight', 'İleri git', () => {
      if (window.kargoTabs && window.kargoTabs.goForward) {
        window.kargoTabs.goForward();
      }
    });

    this.register('Ctrl+Shift+H', 'Ana sayfaya git', () => {
      window.location.href = 'index.html';
    });

    this.register('Ctrl+Shift+A', 'Hakkında sayfası', () => {
      window.location.href = 'about.html';
    });
  }

  registerBrowserShortcuts() {
    this.register('Ctrl+R', 'Sayfayı yenile', () => {
      if (window.kargoTabs && window.kargoTabs.refreshCurrentTab) {
        window.kargoTabs.refreshCurrentTab();
      }
    });

    this.register('F5', 'Sayfayı yenile', () => {
      if (window.kargoTabs && window.kargoTabs.refreshCurrentTab) {
        window.kargoTabs.refreshCurrentTab();
      }
    });
  }

  registerUIShortcuts() {
    this.register('F11', 'Tam ekran', () => {
      if (window.kargo && window.kargo.windowControl) {
        window.kargo.windowControl('toggle-fullscreen');
      }
    });

    this.register('Ctrl+Q', 'Uygulamayı kapat', () => {
      if (window.kargo && window.kargo.windowControl) {
        window.kargo.windowControl('close');
      }
    });

    this.register('Ctrl+M', 'Pencereyi küçült', () => {
      if (window.kargo && window.kargo.windowControl) {
        window.kargo.windowControl('minimize');
      }
    });

    this.register('Ctrl+Shift+M', 'Pencereyi büyüt', () => {
      if (window.kargo && window.kargo.windowControl) {
        window.kargo.windowControl('maximize');
      }
    });

    this.register('Escape', 'Kapat/İptal', () => {
      const overlay = document.querySelector('.overlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
      }
    });
  }

  // ============================================================
  // EVENT LISTENER SETUP
  // ============================================================

  setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.setupWebviewListeners();
  }

  // ============================================================
  // WEBVIEW LISTENER SETUP
  // ============================================================

  setupWebviewListeners() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.tagName === 'WEBVIEW') {
            this.attachWebviewListener(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.querySelectorAll('webview').forEach(webview => {
      this.attachWebviewListener(webview);
    });
  }

  attachWebviewListener(webview) {
    webview.addEventListener('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        const shortcut = this.buildShortcutStringFromInput(input);
        if (this.shortcuts.has(shortcut)) {
          event.preventDefault();
          const { handler } = this.shortcuts.get(shortcut);
          handler();
        }
      }
    });
  }

  // ============================================================
  // EVENT HANDLERS
  // ============================================================

  handleKeyDown(event) {
    const shortcut = this.buildShortcutString(event);
    if (this.shortcuts.has(shortcut)) {
      event.preventDefault();
      const { handler } = this.shortcuts.get(shortcut);
      handler();
    }
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  buildShortcutString(event) {
    const parts = [];
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');

    const keyMap = {
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown'
    };

    const key = keyMap[event.key] || event.key.toUpperCase();
    parts.push(key);
    return parts.join('+');
  }

  buildShortcutStringFromInput(input) {
    const parts = [];
    if (input.control) parts.push('Ctrl');
    if (input.shift) parts.push('Shift');
    if (input.alt) parts.push('Alt');

    const keyMap = {
      'Left': 'ArrowLeft',
      'Right': 'ArrowRight',
      'Up': 'ArrowUp',
      'Down': 'ArrowDown'
    };

    const key = keyMap[input.key] || input.key.toUpperCase();
    parts.push(key);
    return parts.join('+');
  }

  register(shortcut, description, handler) {
    this.shortcuts.set(shortcut, { description, handler });
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  getAllShortcuts() {
    return Array.from(this.shortcuts.entries()).map(([shortcut, { description }]) => ({
      shortcut,
      description
    }));
  }

  execute(shortcut) {
    if (this.shortcuts.has(shortcut)) {
      const { handler } = this.shortcuts.get(shortcut);
      handler();
    }
  }
}

// Global instance oluştur
window.kargoShortcuts = new ShortcutsManager();
