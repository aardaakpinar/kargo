const tabBar = document.getElementById("tabBar");
const webviewShell = document.getElementById("webviewShell");
const queryInput = document.getElementById("queryInput");

let tabs = [];
let currentTabId = null;
// HTML'de sekme çubuğu "hidden" sınıfıyla başlıyor; durumu DOM'dan al ki
// ilk Ctrl+Shift+T basışı çubuğu gizlemek yerine göstersin.
let tabBarVisible = !tabBar.classList.contains("hidden");

function generateTabId() {
	return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

let lastPopupOpen = { url: "", at: 0 };

// Popup isteklerini (target="_blank", window.open) yeni pencere yerine
// Kargo içinde sekme olarak aç. Arka plan istekleri odağı çalmaz.
function openPopupInTab(popupUrl, { background = false } = {}) {
	if (!popupUrl) return;
	const now = Date.now();
	if (lastPopupOpen.url === popupUrl && now - lastPopupOpen.at < 250) {
		return;
	}
	lastPopupOpen = { url: popupUrl, at: now };

	const tab = createTab(popupUrl);
	if (background) {
		// Reklamların/otomatik açılan bağlantıların odağı çalmasını engelle.
		return;
	}
	switchTab(tab.id);
}

function createTab(url = "") {
	const tabId = generateTabId();
	const webview = document.createElement("webview");
	webview.setAttribute("partition", "persist:kargo");
	webview.setAttribute("allowpopups", "");
	webview.style.width = "100%";
	webview.style.height = "100%";
	webview.style.border = "none";
	webview.style.display = "none";
	webview.className = "tab-webview";

	if (url) {
		webview.setAttribute("src", url);
	}

	const tab = {
		id: tabId,
		title: "Yeni Sekme",
		url: url || "",
		webview,
	};

	webview.addEventListener("page-title-updated", () => {
		try {
			const title = webview.getTitle() || "Sekme";
			tab.title = title.length > 20 ? title.substring(0, 17) + "..." : title;
			updateTabButton(tab);
			if (window.kargoSettings) {
				window.kargoSettings.recordHistory(tab.url, title);
			}
		} catch (e) {}
	});

	webview.addEventListener("did-navigate", (event) => {
		tab.url = event.url;
		if (currentTabId === tab.id) {
			queryInput.value = event.url;
		}
		if (window.kargoSettings) {
			window.kargoSettings.recordHistory(event.url, tab.title);
		}
	});

	webview.addEventListener("did-navigate-in-page", (event) => {
		tab.url = event.url;
		if (currentTabId === tab.id) {
			queryInput.value = event.url;
		}
		if (window.kargoSettings) {
			window.kargoSettings.recordHistory(event.url, tab.title);
		}
	});

	webview.addEventListener("did-fail-load", (event) => {
		if (event.errorCode !== -3) {
			console.error("Sayfa yükleme hatası:", event.errorCode);
		}
	});

	// HTML5 tam ekran (video, oyun) sırasında Kargo arayüzünü gizle.
	webview.addEventListener("enter-html-full-screen", () => {
		document.body.classList.add("html-fullscreen");
	});
	webview.addEventListener("leave-html-full-screen", () => {
		document.body.classList.remove("html-fullscreen");
	});

	// Varsayılan yakınlaştırma yalnızca sekme ilk yüklendiğinde uygulanır;
	// sonraki gezinmelerde kullanıcının kendi zoom tercihi korunur.
	webview.addEventListener(
		"dom-ready",
		() => {
			if (!window.kargoSettings) return;
			const factor = Number(window.kargoSettings.get().defaultZoom);
			if (!Number.isFinite(factor) || factor <= 0) return;
			try {
				webview.setZoomFactor(factor);
			} catch (error) {}
		},
		{ once: true },
	);

	tabs.push(tab);
	webviewShell.appendChild(webview);
	addTabButton(tab);

	return tab;
}

function addTabButton(tab) {
	const button = document.createElement("div");
	button.className = "tab-item";
	button.dataset.tabId = tab.id;

	const titleSpan = document.createElement("span");
	titleSpan.textContent = tab.title;

	const closeBtn = document.createElement("button");
	closeBtn.className = "tab-close";
	closeBtn.textContent = "×";
	closeBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		closeTab(tab.id);
	});

	button.appendChild(titleSpan);
	button.appendChild(closeBtn);
	button.addEventListener("click", () => switchTab(tab.id));

	tabBar.appendChild(button);
	tab.buttonElement = button;
}

function updateTabButton(tab) {
	if (tab.buttonElement) {
		const span = tab.buttonElement.querySelector("span");
		if (span) {
			span.textContent = tab.title;
		}
	}
}

function switchTab(tabId) {
	const tab = tabs.find((t) => t.id === tabId);
	if (!tab) return;

	if (currentTabId) {
		const currentTab = tabs.find((t) => t.id === currentTabId);
		if (currentTab) {
			currentTab.webview.style.display = "none";
			if (currentTab.buttonElement) {
				currentTab.buttonElement.classList.remove("active");
			}
		}
	}

	currentTabId = tabId;
	tab.webview.style.display = "flex";
	if (tab.buttonElement) {
		tab.buttonElement.classList.add("active");
	}
	tab.webview.focus();
	queryInput.value = tab.url;
}

function closeTab(tabId) {
	const index = tabs.findIndex((t) => t.id === tabId);
	if (index === -1) return;

	if (tabs.length === 1) {
		tabs[0].webview.loadURL("about:blank");
		tabs[0].title = "Yeni Sekme";
		updateTabButton(tabs[0]);
		queryInput.value = "";
		return;
	}

	const tab = tabs[index];
	tab.webview.remove();
	if (tab.buttonElement) {
		tab.buttonElement.remove();
	}
	tabs.splice(index, 1);

	if (currentTabId === tabId) {
		const nextTab = tabs[index] || tabs[index - 1];
		if (nextTab) {
			switchTab(nextTab.id);
		}
	}
}

function toggleTabBar() {
	if (tabBarVisible) {
		hideTabBar();
	} else {
		showTabBar();
	}
}

function showTabBar() {
	tabBarVisible = true;
	tabBar.classList.remove("hidden");
}

function hideTabBar() {
	tabBarVisible = false;
	tabBar.classList.add("hidden");
}

function newTab(url = "") {
	const tab = createTab(url);
	switchTab(tab.id);
	if (!url) {
		queryInput.focus();
		queryInput.select();
	}
	return tab;
}

function selectPreviousTab() {
	const index = tabs.findIndex((t) => t.id === currentTabId);
	if (index > 0) {
		switchTab(tabs[index - 1].id);
	}
}

function selectNextTab() {
	const index = tabs.findIndex((t) => t.id === currentTabId);
	if (index < tabs.length - 1) {
		switchTab(tabs[index + 1].id);
	}
}

function selectTabByIndex(index) {
	if (index >= 0 && index < tabs.length) {
		switchTab(tabs[index].id);
	}
}

function selectLastTab() {
	if (tabs.length > 0) {
		switchTab(tabs[tabs.length - 1].id);
	}
}

function getCurrentTab() {
	if (!currentTabId || !tabs.length) return null;
	return tabs.find((t) => t.id === currentTabId);
}

// Tab yönetimi fonksiyonları (shortcuts.js için)
function closeCurrentTab() {
	if (currentTabId) {
		closeTab(currentTabId);
	}
}

function refreshCurrentTab() {
	const currentTab = getCurrentTab();
	if (currentTab) {
		currentTab.webview.reload();
	}
}

// Chromium zoom seviyesi aynı origin için tüm sekmelerde geçerlidir.
const MIN_ZOOM_LEVEL = -6;
const MAX_ZOOM_LEVEL = 8;
const ZOOM_STEP = 0.5;

function applyZoom(delta) {
	const currentTab = getCurrentTab();
	if (!currentTab) return;

	const webview = currentTab.webview;
	const current =
		typeof webview.getZoomLevel === "function" ? webview.getZoomLevel() : 0;
	const level =
		delta === 0
			? 0
			: Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, current + delta));

	webview.setZoomLevel(level);
}

function zoomIn() {
	applyZoom(ZOOM_STEP);
}

function zoomOut() {
	applyZoom(-ZOOM_STEP);
}

function zoomReset() {
	applyZoom(0);
}

function openDevTools() {
	const currentTab = getCurrentTab();
	if (currentTab) {
		currentTab.webview.openDevTools();
	}
}

function goBack() {
	const currentTab = getCurrentTab();
	if (currentTab && currentTab.webview.canGoBack()) {
		currentTab.webview.goBack();
	}
}

function goForward() {
	const currentTab = getCurrentTab();
	if (currentTab && currentTab.webview.canGoForward()) {
		currentTab.webview.goForward();
	}
}

window.kargoTabs = {
	get tabs() {
		return tabs;
	},
	get currentTabId() {
		return currentTabId;
	},
	get currentTab() {
		return getCurrentTab();
	},
	createTab,
	newTab,
	switchTab,
	closeTab,
	closeCurrentTab,
	toggleTabBar,
	selectPreviousTab,
	selectNextTab,
	selectTabByIndex,
	selectLastTab,
	refreshCurrentTab,
	zoomIn,
	zoomOut,
	zoomReset,
	openDevTools,
	goBack,
	goForward,
	getCurrentTab,
};

// Ana süreçte (main.js) yakalanan popup istekleri burada sekmeye dönüşür.
if (window.kargo && window.kargo.onOpenTab) {
	window.kargo.onOpenTab(({ url, background }) =>
		openPopupInTab(url, { background })
	);
}

// Sekme çubuğu varsayılan olarak gizli; kullanıcı ayarlardan açtıysa görünür başlat.
if (window.kargoSettings && window.kargoSettings.get().showTabBar) {
	showTabBar();
}

const initialTab = createTab("");
switchTab(initialTab.id);
