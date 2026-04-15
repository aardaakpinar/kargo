const tabBar = document.getElementById("tabBar");
const webviewShell = document.getElementById("webviewShell");
const queryInput = document.getElementById("queryInput");

let tabs = [];
let currentTabId = null;
let tabBarVisible = true;

function generateTabId() {
	return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

	let lastPopupOpen = { url: "", at: 0 };
	const openPopupInTab = (popupUrl) => {
		if (!popupUrl) return;
		const now = Date.now();
		if (lastPopupOpen.url === popupUrl && now - lastPopupOpen.at < 250) {
			return;
		}
		lastPopupOpen = { url: popupUrl, at: now };
		const newTab = createTab(popupUrl);
		switchTab(newTab.id);
	};

	webview.addEventListener("page-title-updated", () => {
		try {
			const title = webview.getTitle() || "Sekme";
			tab.title = title.length > 20 ? title.substring(0, 17) + "..." : title;
			updateTabButton(tab);
		} catch (e) {}
	});

	webview.addEventListener("did-fail-load", (event) => {
		if (event.errorCode !== -3) {
			console.error("Sayfa yükleme hatası:", event.errorCode);
		}
	});

	webview.addEventListener("new-window", (event) => {
		if (typeof event.preventDefault === "function") {
			event.preventDefault();
		}
		openPopupInTab(event.url);
	});

	webview.addEventListener("did-create-window", (event) => {
		openPopupInTab(event.url);
		if (event.window && !event.window.isDestroyed()) {
			event.window.close();
		}
	});

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
	tabBarVisible = !tabBarVisible;
	tabBar.classList.toggle("hidden", !tabBarVisible);
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
	switchTab,
	closeTab,
	closeCurrentTab,
	toggleTabBar,
	selectPreviousTab,
	selectNextTab,
	selectTabByIndex,
	selectLastTab,
	refreshCurrentTab,
	openDevTools,
	goBack,
	goForward,
	getCurrentTab,
};

const initialTab = createTab("");
switchTab(initialTab.id);
