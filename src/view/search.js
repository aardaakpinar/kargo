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
	// Kargo'nun kendi sayfaları webview'a verilmemeli; aksi halde Chromium
	// bilinmeyen şema uyarısı gösterir. Doğrudan sayfaya yönlendir.
	const kargoPage = window.kargoPageFor ? window.kargoPageFor(url) : null;
	if (kargoPage) {
		// replace: Geri tuşu arama sayfasına dönüp yeniden yönlendirme döngüsü
		// oluşturmasın.
		window.location.replace(kargoPage);
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
	// about.html artık ayrı bir sayfa değil; kabuğun "about" görünümü.
	window.location.replace(
		window.kargoPageHref ? window.kargoPageHref("about") : "index.html#about",
	);
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
	} else {
		// Retry if tabs not ready yet
		setTimeout(loadInitialUrl, 50);
	}
}

// Start loading immediately
loadInitialUrl();
