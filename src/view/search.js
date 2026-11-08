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

// Adres çubuğundan gitme (Enter) artık search-popup.js içinde.

// Set initial query value if coming from home page
if (query) {
	queryInput.value = query;
}

// Load initial URL when tabs are ready
function loadInitialUrl() {
	if (!query) return;

	if (window.kargoTabs && window.kargoTabs.currentTab) {
		const url = normalizeUrl(query);
		const kargoPage = window.kargoPageFor ? window.kargoPageFor(url) : null;
		if (kargoPage) {
			// Kargo sayfaları webview yerine doğrudan açılır.
			window.location.replace(kargoPage);
			return;
		}
		if (isExternalUrl(url)) {
			queryInput.value = url;
			openExternalUrl(url);
			return;
		}
		window.kargoTabs.currentTab.url = url;
		window.kargoTabs.currentTab.webview.setAttribute("src", url);
		queryInput.value = url;
		if (window.kargoSearch) window.kargoSearch.refresh();
	} else {
		// Retry if tabs not ready yet
		setTimeout(loadInitialUrl, 50);
	}
}

// Start loading immediately
loadInitialUrl();
