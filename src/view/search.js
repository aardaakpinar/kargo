const params = new URLSearchParams(window.location.search);
const query = params.get("q") || "";

// Tarayıcıda açılamayan, işletim sistemine ait adresler.
function isExternalUrl(url) {
	return /^(mailto|tel|sms|webcal):/i.test(url || "");
}

function openExternalUrl(url) {
	if (window.kargo && window.kargo.openExternal) {
		window.kargo.openExternal(url);
	}
}

function openUrl(url) {
	if (window.isKargoScheme && window.isKargoScheme(url)) {
		const parsed = url.toLowerCase();
		if (parsed === "kargo://about") {
			window.location.href = "about.html";
			return;
		}
		if (parsed === "kargo://error") {
			window.location.href = "error.html";
			return;
		}
		if (parsed === "kargo://home" || parsed === "kargo://index") {
			window.location.href = "index.html";
			return;
		}
		if (parsed === "kargo://settings") {
			window.location.href = "settings.html";
			return;
		}
		if (parsed === "kargo://history") {
			window.location.href = "history.html";
			return;
		}
		window.location.href = "about.html";
		return;
	}

	if (isExternalUrl(url)) {
		openExternalUrl(url);
		return;
	}

	if (window.kargoTabs) {
		const currentTab = window.kargoTabs.currentTab;
		if (currentTab) {
			currentTab.url = url;
			currentTab.webview.setAttribute("src", url);
			if (window.kargoSettings) {
				window.kargoSettings.recordHistory(url);
			}
		}
	}
}

function goToAboutPage() {
	window.location.href = "about.html";
}

function handleSearch(event) {
	const isEnter = event.key === "Enter" || event.code === "Enter" || event.keyCode === 13;
	if (!isEnter) return;
	event.preventDefault();

	const search = queryInput.value.trim();
	const lowerSearch = search.toLowerCase();
	if (["about", "hakkında", "hakkinda"].includes(lowerSearch)) {
		goToAboutPage();
		return;
	}

	openUrl(normalizeUrl(search));
}

queryInput.addEventListener("keydown", handleSearch);

// Set initial query value if coming from home page
if (query) {
	queryInput.value = query;
}

// Load initial URL when tabs are ready
function loadInitialUrl() {
	if (!query) return;

	if (window.kargoTabs && window.kargoTabs.currentTab) {
		const url = normalizeUrl(query);
		if (isExternalUrl(url)) {
			queryInput.value = url;
			openExternalUrl(url);
			return;
		}
		window.kargoTabs.currentTab.url = url;
		window.kargoTabs.currentTab.webview.setAttribute("src", url);
		queryInput.value = url;
	} else {
		// Retry if tabs not ready yet
		setTimeout(loadInitialUrl, 50);
	}
}

// Start loading immediately
loadInitialUrl();
