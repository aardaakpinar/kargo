// Kargo Keyboard Shortcuts Manager
// Tuşları ana süreç (main.js) before-input-event ile yakalar ve
// "global-shortcut" kanalıyla buraya gönderir. Bu sınıf gelen aksiyonları
// yürütür. Kısayol listesi ve özelleştirme ayarlar sayfasında ele alınır.

class ShortcutsManager {
	constructor() {
		this.setupGlobalShortcutListener();
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
		if (action === "createTab") {
			if (window.kargoTabs && window.kargoTabs.newTab) {
				window.kargoTabs.newTab();
			} else {
				// Sekme arayüzü olmayan sayfalardan (ana sayfa, ayarlar, hakkında)
				// yeni sekme açmak için sekme görünümüne geç.
				window.location.href = "search.html";
			}
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
		} else if (action === "goSettings") {
			window.location.href = "settings.html";
		} else if (action === "goHistory") {
			window.location.href = "history.html";
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
		} else if (action === "focusSearch") {
			const searchInput = document.getElementById("queryInput") || document.getElementById("destInput");
			if (searchInput) {
				searchInput.focus();
				searchInput.select();
			}
		} else if (action === "zoomIn" || action === "zoomOut" || action === "zoomReset") {
			if (window.kargoTabs && window.kargoTabs[action]) {
				window.kargoTabs[action]();
			} else if (window.kargo && window.kargo.setChromeZoom) {
				window.kargo.setChromeZoom(action);
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
}

// Global instance oluştur
window.kargoShortcuts = new ShortcutsManager();
