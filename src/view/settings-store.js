const KARGO_DEFAULT_SETTINGS = {
	theme: "dark",
	homepage: "kargo://home",
	saveHistory: true,
};

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

	return {
		theme: theme === "light" ? "light" : "dark",
		homepage: homepage.trim() || KARGO_DEFAULT_SETTINGS.homepage,
		saveHistory: saveHistory !== "false",
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

	localStorage.setItem("theme", settings.theme);
	localStorage.setItem("homepage", settings.homepage);
	localStorage.setItem("saveHistory", String(settings.saveHistory));
	applyKargoTheme(settings.theme);

	return settings;
}

function getKargoHistory() {
	try {
		return JSON.parse(localStorage.getItem("kargoHistory") || "[]");
	} catch (error) {
		return [];
	}
}

function saveKargoHistory(historyItems) {
	localStorage.setItem("kargoHistory", JSON.stringify(historyItems.slice(0, 100)));
}

function recordKargoHistory(url, title = "") {
	const settings = getKargoSettings();
	const trimmedUrl = (url || "").trim();

	if (!settings.saveHistory || !trimmedUrl || trimmedUrl === "about:blank") {
		return;
	}

	if (window.isKargoScheme && window.isKargoScheme(trimmedUrl)) {
		return;
	}

	const historyItems = getKargoHistory().filter((item) => item.url !== trimmedUrl);
	historyItems.unshift({
		url: trimmedUrl,
		title: title || trimmedUrl,
		visitedAt: new Date().toISOString(),
	});
	saveKargoHistory(historyItems);
}

window.kargoSettings = {
	defaults: KARGO_DEFAULT_SETTINGS,
	get: getKargoSettings,
	save: saveKargoSettings,
	applyTheme: applyKargoTheme,
	getHistory: getKargoHistory,
	recordHistory: recordKargoHistory,
};

applyKargoTheme();
