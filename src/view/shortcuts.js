// Kargo Keyboard Shortcuts Manager
// Tüm kısayolları merkezi olarak yönetir

class ShortcutsManager {
	constructor() {
		this.shortcuts = new Map();
		this.init();
	}

	init() {
		// Mousetrap'ı dinamik olarak yükle
		this.loadMousetrap().then(() => {
			this.registerAllShortcuts();
		}).catch((error) => {
			console.error("Mousetrap yüklenemedi:", error);
		});
	}

	registerAllShortcuts() {
		this.registerTabShortcuts();
		this.registerNavigationShortcuts();
		this.registerBrowserShortcuts();
		this.registerUIShortcuts();
		this.setupGlobalShortcutListener();
	}

	// Mousetrap kütüphanesini dinamik olarak yükle
	async loadMousetrap() {
		return new Promise((resolve, reject) => {
			if (window.Mousetrap) {
				this.mousetrap = window.Mousetrap;
				resolve();
				return;
			}

			// CDN'den yükle
			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mousetrap/1.6.5/mousetrap.min.js';
			script.onload = () => {
				this.mousetrap = window.Mousetrap;
				resolve();
			};
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	// ============================================================
	// KISAYOL REGISTRASYONU
	// ============================================================

	registerTabShortcuts() {
		window.Mousetrap.bind("ctrl+t", () => {
			if (window.kargoTabs && window.kargoTabs.createTab) {
				window.kargoTabs.createTab();
			}
		});
		this.shortcuts.set("ctrl+t", { description: "Yeni sekme aç", handler: () => {} });

		window.Mousetrap.bind("ctrl+x", () => {
			if (window.kargoTabs && window.kargoTabs.closeCurrentTab) {
				window.kargoTabs.closeCurrentTab();
			}
		});
		this.shortcuts.set("ctrl+x", { description: "Sekmeyi kapat", handler: () => {} });

		window.Mousetrap.bind("ctrl+shift+t", () => {
			if (window.kargoTabs && window.kargoTabs.toggleTabBar) {
				window.kargoTabs.toggleTabBar();
			}
		});
		this.shortcuts.set("ctrl+shift+t", { description: "Tab bar göster/gizle", handler: () => {} });

		window.Mousetrap.bind("ctrl+shift+left", () => {
			if (window.kargoTabs && window.kargoTabs.selectPreviousTab) {
				window.kargoTabs.selectPreviousTab();
			}
		});
		this.shortcuts.set("ctrl+shift+left", { description: "Önceki sekme", handler: () => {} });

		window.Mousetrap.bind("ctrl+shift+right", () => {
			if (window.kargoTabs && window.kargoTabs.selectNextTab) {
				window.kargoTabs.selectNextTab();
			}
		});
		this.shortcuts.set("ctrl+shift+right", { description: "Sonraki sekme", handler: () => {} });

	}

	registerNavigationShortcuts() {
		window.Mousetrap.bind("ctrl+left", () => {
			if (window.kargoTabs && window.kargoTabs.goBack) {
				window.kargoTabs.goBack();
			} else {
				history.back();
			}
		});
		this.shortcuts.set("ctrl+left", { description: "Geri git", handler: () => {} });

		window.Mousetrap.bind("ctrl+right", () => {
			if (window.kargoTabs && window.kargoTabs.goForward) {
				window.kargoTabs.goForward();
			} else {
				history.forward();
			}
		});
		this.shortcuts.set("ctrl+right", { description: "İleri git", handler: () => {} });

		window.Mousetrap.bind("ctrl+shift+h", () => {
			window.location.href = "index.html";
		});
		this.shortcuts.set("ctrl+shift+h", { description: "Ana sayfaya git", handler: () => {} });

		window.Mousetrap.bind("ctrl+shift+a", () => {
			window.location.href = "about.html";
		});
		this.shortcuts.set("ctrl+shift+a", { description: "Hakkında sayfası", handler: () => {} });
	}

	registerBrowserShortcuts() {
		window.Mousetrap.bind("ctrl+r", () => {
			if (window.kargoTabs && window.kargoTabs.refreshCurrentTab) {
				window.kargoTabs.refreshCurrentTab();
			} else {
				location.reload();
			}
		});
		this.shortcuts.set("ctrl+r", { description: "Sayfayı yenile", handler: () => {} });

		window.Mousetrap.bind("f5", () => {
			if (window.kargoTabs && window.kargoTabs.refreshCurrentTab) {
				window.kargoTabs.refreshCurrentTab();
			} else {
				location.reload();
			}
		});
		this.shortcuts.set("f5", { description: "Sayfayı yenile", handler: () => {} });
	}

	registerUIShortcuts() {
		window.Mousetrap.bind("ctrl+q", () => {
			if (window.kargo && window.kargo.windowControl) {
				window.kargo.windowControl("close");
			}
		});
		this.shortcuts.set("ctrl+q", { description: "Uygulamayı kapat", handler: () => {} });

		window.Mousetrap.bind("ctrl+m", () => {
			if (window.kargo && window.kargo.windowControl) {
				window.kargo.windowControl("minimize");
			}
		});
		this.shortcuts.set("ctrl+m", { description: "Pencereyi küçült", handler: () => {} });

		window.Mousetrap.bind("ctrl+shift+m", () => {
			if (window.kargo && window.kargo.windowControl) {
				window.kargo.windowControl("maximize");
			}
		});
		this.shortcuts.set("ctrl+shift+m", { description: "Pencereyi büyüt", handler: () => {} });
	}

	setupGlobalShortcutListener() {
		if (window.kargo && window.kargo.onGlobalShortcut) {
			window.kargo.onGlobalShortcut((action) => {
				this.handleGlobalShortcut(action);
			});
		}
	}

	handleGlobalShortcut(action) {
		// Tab shortcuts
		if (action === "createTab" && window.kargoTabs && window.kargoTabs.createTab) {
			window.kargoTabs.createTab();
		} else if (action === "closeTab" && window.kargoTabs && window.kargoTabs.closeCurrentTab) {
			window.kargoTabs.closeCurrentTab();
		} else if (action === "toggleTabBar" && window.kargoTabs && window.kargoTabs.toggleTabBar) {
			window.kargoTabs.toggleTabBar();
		} else if (action === "prevTab" && window.kargoTabs && window.kargoTabs.selectPreviousTab) {
			window.kargoTabs.selectPreviousTab();
		} else if (action === "nextTab" && window.kargoTabs && window.kargoTabs.selectNextTab) {
			window.kargoTabs.selectNextTab();
		} else if (action === "lastTab" && window.kargoTabs && window.kargoTabs.selectLastTab) {
			window.kargoTabs.selectLastTab();
		} else if (action.startsWith("selectTab") && window.kargoTabs && window.kargoTabs.selectTabByIndex) {
			const index = parseInt(action.replace("selectTab", "")) - 1;
			window.kargoTabs.selectTabByIndex(index);
		}
		// Navigation
		else if (action === "goBack") {
			if (window.kargoTabs && window.kargoTabs.goBack) {
				window.kargoTabs.goBack();
			} else {
				history.back();
			}
		} else if (action === "goForward") {
			if (window.kargoTabs && window.kargoTabs.goForward) {
				window.kargoTabs.goForward();
			} else {
				history.forward();
			}
		} else if (action === "goHome") {
			window.location.href = "index.html";
		} else if (action === "goAbout") {
			window.location.href = "about.html";
		}
		// Browser
		else if (action === "refresh") {
			if (window.kargoTabs && window.kargoTabs.refreshCurrentTab) {
				window.kargoTabs.refreshCurrentTab();
			} else {
				location.reload();
			}
		}
		// UI
		else if (action === "toggleFullscreen" && window.kargo && window.kargo.windowControl) {
			window.kargo.windowControl("toggle-fullscreen");
		} else if (action === "closeApp" && window.kargo && window.kargo.windowControl) {
			window.kargo.windowControl("close");
		} else if (action === "minimize" && window.kargo && window.kargo.windowControl) {
			window.kargo.windowControl("minimize");
		} else if (action === "maximize" && window.kargo && window.kargo.windowControl) {
			window.kargo.windowControl("maximize");
		} else if (action === "escape") {
			const overlay = document.querySelector(".overlay");
			if (overlay && !overlay.classList.contains("hidden")) {
				overlay.classList.add("hidden");
				overlay.innerHTML = "";
			}
		}
	}

	// ============================================================
	// PUBLIC API
	// ============================================================

	getAllShortcuts() {
		return Array.from(this.shortcuts.entries()).map(
			([shortcut, { description }]) => ({
				shortcut,
				description,
			})
		);
	}
}

// Global instance oluştur
window.kargoShortcuts = new ShortcutsManager();
