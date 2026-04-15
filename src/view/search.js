const params = new URLSearchParams(window.location.search);
const query = params.get("q") || "";

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
		window.location.href = "about.html";
		return;
	}

	if (window.kargoTabs) {
		const currentTab = window.kargoTabs.currentTab;
		if (currentTab) {
			currentTab.url = url;
			currentTab.webview.setAttribute("src", url);
		}
	}
}

function goToAboutPage() {
	window.location.href = "about.html";
}

function handleSearch(event) {
	const isEnter =
		event.key === "Enter" || event.code === "Enter" || event.keyCode === 13;
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

function handleGlobalShortcut(event) {
	if (
		(event.ctrlKey || event.metaKey) &&
		event.shiftKey &&
		event.key.toLowerCase() === "a"
	) {
		event.preventDefault();
		goToAboutPage();
	}

	if (
		(event.ctrlKey || event.metaKey) &&
		event.shiftKey &&
		event.key.toLowerCase() === "h"
	) {
		event.preventDefault();
		window.location.href = "index.html";
	}
}

queryInput.addEventListener("keydown", handleSearch);
queryInput.addEventListener("keypress", handleSearch);

// Set initial query value if coming from home page
if (query) {
	queryInput.value = query;
}

window.addEventListener("keydown", handleGlobalShortcut);

// Load initial URL when tabs are ready
function loadInitialUrl() {
	if (!query) return;

	if (window.kargoTabs && window.kargoTabs.currentTab) {
		const url = normalizeUrl(query);
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
