const tabBar = document.getElementById("tabBar");
const webviewShell = document.getElementById("webviewShell");
const queryInput = document.getElementById("queryInput");

let tabs = [];
let currentTabId = null;
// Kenar çubuğu açık/kapalı durumu body üzerindeki "sidebar-collapsed"
// sınıfından okunur; ilk karede sidebar-markup.js ayarlara göre uygular.
let tabBarVisible = window.kargoSettings
	? window.kargoSettings.get().showTabBar
	: true;

// Sekme veya gezinme durumu değiştiğinde dinleyicileri (yer imleri, kenar
// çubuğu düğmeleri) haberdar et.
const tabListeners = new Set();

function notifyTabChange() {
	tabListeners.forEach((listener) => {
		try {
			listener();
		} catch (error) {
			console.error("Sekme dinleyicisi hatası:", error);
		}
	});
}

function onTabChange(listener) {
	tabListeners.add(listener);
	return () => tabListeners.delete(listener);
}

function isBlankUrl(url) {
	return !url || url === "about:blank";
}

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
		favicon: "",
		webview,
	};

	webview.addEventListener("page-title-updated", () => {
		try {
			const title = webview.getTitle() || "Sekme";
			// Başlık tam saklanır; kısaltmayı CSS (text-overflow) yapar.
			tab.title = title;
			updateTabButton(tab);
			if (window.kargoSettings) {
				window.kargoSettings.recordHistory(tab.url, title);
			}
			notifyTabChange();
		} catch (e) {}
	});

	webview.addEventListener("page-favicon-updated", (event) => {
		const icons = event.favicons || [];
		tab.favicon = (window.kargoSettings && window.kargoSettings.safeFavicon(icons[0])) || "";
		updateTabButton(tab);
		if (tab.favicon && window.kargoSettings) {
			window.kargoSettings.updateBookmark(tab.url, { favicon: tab.favicon });
		}
		notifyTabChange();
	});

	const handleNavigation = (event, { inPage }) => {
		// Ana çerçeve dışı (iframe) gezinmeleri sekme adresini değiştirmemeli.
		if (event.isMainFrame === false) return;

		const previousUrl = tab.url;
		tab.url = event.url;

		// Farklı bir siteye geçildiyse eski sitenin favicon'unu gösterme.
		if (!inPage && previousUrl !== event.url) {
			try {
				if (new URL(previousUrl).origin !== new URL(event.url).origin) {
					tab.favicon = "";
					updateTabButton(tab);
				}
			} catch (error) {
				tab.favicon = "";
				updateTabButton(tab);
			}
		}

		if (currentTabId === tab.id && document.activeElement !== queryInput) {
			queryInput.value = event.url;
		}
		if (window.kargoSettings) {
			window.kargoSettings.recordHistory(event.url, tab.title);
		}
		notifyTabChange();
	};

	webview.addEventListener("did-navigate", (event) =>
		handleNavigation(event, { inPage: false }),
	);
	webview.addEventListener("did-navigate-in-page", (event) =>
		handleNavigation(event, { inPage: true }),
	);

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

function updateTabCount() {
	const count = document.getElementById("tabCount");
	if (count) count.textContent = tabs.length ? String(tabs.length) : "";
}

function addTabButton(tab) {
	const button = document.createElement("div");
	button.className = "tab-item";
	button.dataset.tabId = tab.id;
	button.setAttribute("role", "button");
	button.tabIndex = -1;

	const icon = document.createElement("span");
	icon.className = "tab-icon";

	const titleSpan = document.createElement("span");
	titleSpan.className = "tab-title";

	const closeBtn = document.createElement("button");
	closeBtn.className = "tab-close";
	closeBtn.type = "button";
	closeBtn.title = "Sekmeyi kapat";
	closeBtn.setAttribute("aria-label", "Sekmeyi kapat");
	closeBtn.textContent = "×";
	closeBtn.addEventListener("click", (e) => {
		e.stopPropagation();
		closeTab(tab.id);
	});

	button.appendChild(icon);
	button.appendChild(titleSpan);
	button.appendChild(closeBtn);
	button.addEventListener("click", () => switchTab(tab.id));
	// Orta tuş: Chrome/Firefox gibi sekmeyi kapat.
	button.addEventListener("auxclick", (e) => {
		if (e.button === 1) {
			e.preventDefault();
			closeTab(tab.id);
		}
	});

	tabBar.appendChild(button);
	tab.buttonElement = button;
	updateTabButton(tab);
	updateTabCount();
}

function updateTabButton(tab) {
	const button = tab.buttonElement;
	if (!button) return;

	const titleSpan = button.querySelector(".tab-title");
	if (titleSpan) {
		titleSpan.textContent = tab.title;
	}
	button.title = tab.url ? `${tab.title}\n${tab.url}` : tab.title;

	const icon = button.querySelector(".tab-icon");
	if (icon) {
		fillFavicon(icon, tab.favicon, isBlankUrl(tab.url) ? "" : tab.title || tab.url);
	}
}

// Favicon varsa görseli, yoksa başlığın baş harfini gösterir.
function fillFavicon(container, faviconUrl, label) {
	if (container.dataset.src === (faviconUrl || "") && container.dataset.label === (label || "")) {
		return;
	}
	container.dataset.src = faviconUrl || "";
	container.dataset.label = label || "";
	container.textContent = "";

	const letter = ((label || "").trim().charAt(0) || "·").toUpperCase();
	if (!faviconUrl) {
		container.textContent = letter;
		container.classList.add("is-letter");
		return;
	}

	container.classList.remove("is-letter");
	const img = document.createElement("img");
	img.alt = "";
	img.draggable = false;
	img.addEventListener("error", () => {
		container.textContent = letter;
		container.classList.add("is-letter");
	});
	img.src = faviconUrl;
	container.appendChild(img);
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
	if (tab.buttonElement && tab.buttonElement.scrollIntoView) {
		tab.buttonElement.scrollIntoView({ block: "nearest" });
	}
	notifyTabChange();
}

function closeTab(tabId) {
	const index = tabs.findIndex((t) => t.id === tabId);
	if (index === -1) return;

	if (tabs.length === 1) {
		// Son sekme kapanınca boş sayfa yerine ana sayfaya dön.
		window.location.href = "index.html";
		return;
	}

	const tab = tabs[index];
	tab.webview.remove();
	if (tab.buttonElement) {
		tab.buttonElement.remove();
	}
	tabs.splice(index, 1);
	updateTabCount();

	if (currentTabId === tabId) {
		const nextTab = tabs[index] || tabs[index - 1];
		if (nextTab) {
			switchTab(nextTab.id);
		}
	}
	notifyTabChange();
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
	document.body.classList.remove("sidebar-collapsed", "sidebar-peek");
	if (window.kargoSettings) {
		window.kargoSettings.save({ showTabBar: true });
	}
}

function hideTabBar() {
	tabBarVisible = false;
	document.body.classList.add("sidebar-collapsed");
	document.body.classList.remove("sidebar-peek");
	if (window.kargoSettings) {
		window.kargoSettings.save({ showTabBar: false });
	}
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

function toggleDevTools() {
	const currentTab = getCurrentTab();
	if (!currentTab) return;

	const { webview } = currentTab;
	if (webview.isDevToolsOpened()) {
		webview.closeDevTools();
	} else {
		webview.openDevTools();
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
	onChange: onTabChange,
	fillFavicon,
	isBlankUrl,
	isSidebarVisible: () => tabBarVisible,
	showSidebar: showTabBar,
	hideSidebar: hideTabBar,
	toggleSidebar: toggleTabBar,
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
	toggleDevTools,
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

// Kenar çubuğunun açık/kapalı başlangıç durumu ve geçiş animasyonu artık
// sidebar-markup.js tarafından ilk karede uygulanıyor.

const initialTab = createTab("");
switchTab(initialTab.id);
