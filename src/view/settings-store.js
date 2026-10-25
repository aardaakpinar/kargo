const KARGO_DEFAULT_SETTINGS = {
	theme: "dark",
	homepage: "kargo://home",
	saveHistory: true,
	searchEngine: "duckduckgo",
	showTabBar: false,
	defaultZoom: "1",
};

const KARGO_SEARCH_ENGINES = ["duckduckgo", "google", "bing", "brave"];
const KARGO_ZOOM_FACTORS = ["0.8", "0.9", "1", "1.1", "1.25", "1.5"];

function getStoredSetting(key, fallback) {
	const value = localStorage.getItem(key);
	return value === null ? fallback : value;
}

function getKargoSettings() {
	const theme = getStoredSetting("theme", KARGO_DEFAULT_SETTINGS.theme);
	const homepage = getStoredSetting("homepage", KARGO_DEFAULT_SETTINGS.homepage);
	const saveHistory = getStoredSetting(
		"saveHistory",
		String(KARGO_DEFAULT_SETTINGS.saveHistory),
	);
	const searchEngine = getStoredSetting(
		"searchEngine",
		KARGO_DEFAULT_SETTINGS.searchEngine,
	);
	const showTabBar = getStoredSetting(
		"showTabBar",
		String(KARGO_DEFAULT_SETTINGS.showTabBar),
	);
	const defaultZoom = getStoredSetting(
		"defaultZoom",
		KARGO_DEFAULT_SETTINGS.defaultZoom,
	);

	return {
		theme: theme === "light" ? "light" : "dark",
		homepage: homepage.trim() || KARGO_DEFAULT_SETTINGS.homepage,
		saveHistory: saveHistory !== "false",
		searchEngine: KARGO_SEARCH_ENGINES.includes(searchEngine)
			? searchEngine
			: KARGO_DEFAULT_SETTINGS.searchEngine,
		showTabBar: showTabBar === "true",
		defaultZoom: KARGO_ZOOM_FACTORS.includes(defaultZoom)
			? defaultZoom
			: KARGO_DEFAULT_SETTINGS.defaultZoom,
	};
}

function applyKargoTheme(theme = getKargoSettings().theme) {
	document.documentElement.setAttribute(
		"data-theme",
		theme === "light" ? "light" : "dark",
	);
}

function saveKargoSettings(nextSettings) {
	const settings = {
		...getKargoSettings(),
		...nextSettings,
	};

	settings.theme = settings.theme === "light" ? "light" : "dark";
	settings.homepage =
		(settings.homepage || "").trim() || KARGO_DEFAULT_SETTINGS.homepage;
	settings.saveHistory = Boolean(settings.saveHistory);
	settings.searchEngine = KARGO_SEARCH_ENGINES.includes(settings.searchEngine)
		? settings.searchEngine
		: KARGO_DEFAULT_SETTINGS.searchEngine;
	settings.showTabBar = Boolean(settings.showTabBar);
	settings.defaultZoom = KARGO_ZOOM_FACTORS.includes(String(settings.defaultZoom))
		? String(settings.defaultZoom)
		: KARGO_DEFAULT_SETTINGS.defaultZoom;

	localStorage.setItem("theme", settings.theme);
	localStorage.setItem("homepage", settings.homepage);
	localStorage.setItem("saveHistory", String(settings.saveHistory));
	localStorage.setItem("searchEngine", settings.searchEngine);
	localStorage.setItem("showTabBar", String(settings.showTabBar));
	localStorage.setItem("defaultZoom", settings.defaultZoom);
	applyKargoTheme(settings.theme);

	return settings;
}

function getKargoHistory() {
	try {
		const parsed = JSON.parse(localStorage.getItem("kargoHistory") || "[]");
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		return [];
	}
}

let pendingHistoryEntry = null;
let historyWriteTimer = null;

function saveKargoHistory(historyItems) {
	localStorage.setItem("kargoHistory", JSON.stringify(historyItems.slice(0, 100)));
}

function removeKargoHistory(url) {
	const historyItems = getKargoHistory().filter((item) => item.url !== url);
	saveKargoHistory(historyItems);
	return historyItems;
}

function clearKargoHistory() {
	localStorage.removeItem("kargoHistory");
	pendingHistoryEntry = null;
	if (historyWriteTimer) {
		clearTimeout(historyWriteTimer);
		historyWriteTimer = null;
	}
}

// Geçmişi her gezinmede (özellikle SPA'larda did-navigate-in-page sık tetiklenir)
// senkron localStorage yazımıyla kaydetmek ana iş parçacığını yoruyordu.
// Yazımı kısa bir süre geciktirip son gezinmeyi tek seferde kaydediyoruz.
function flushKargoHistory() {
	if (historyWriteTimer) {
		clearTimeout(historyWriteTimer);
		historyWriteTimer = null;
	}
	if (!pendingHistoryEntry) return;

	const { url, title } = pendingHistoryEntry;
	pendingHistoryEntry = null;

	if (!getKargoSettings().saveHistory) {
		return;
	}

	const historyItems = getKargoHistory().filter((item) => item.url !== url);
	historyItems.unshift({
		url,
		title: title || url,
		visitedAt: new Date().toISOString(),
	});
	saveKargoHistory(historyItems);
}

function recordKargoHistory(url, title = "") {
	const trimmedUrl = (url || "").trim();
	if (!trimmedUrl || trimmedUrl === "about:blank") {
		return;
	}

	if (window.isKargoScheme && window.isKargoScheme(trimmedUrl)) {
		return;
	}

	pendingHistoryEntry = { url: trimmedUrl, title };
	if (historyWriteTimer) {
		clearTimeout(historyWriteTimer);
	}
	historyWriteTimer = setTimeout(flushKargoHistory, 400);
}

window.addEventListener("pagehide", flushKargoHistory);

window.kargoSettings = {
	defaults: KARGO_DEFAULT_SETTINGS,
	searchEngines: KARGO_SEARCH_ENGINES,
	zoomFactors: KARGO_ZOOM_FACTORS,
	get: getKargoSettings,
	save: saveKargoSettings,
	applyTheme: applyKargoTheme,
	getHistory: getKargoHistory,
	clearHistory: clearKargoHistory,
	removeHistory: removeKargoHistory,
	recordHistory: recordKargoHistory,
};

applyKargoTheme();
