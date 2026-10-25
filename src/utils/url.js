const KARGO_SEARCH_URLS = {
	duckduckgo: "https://duckduckgo.com/?q=",
	google: "https://www.google.com/search?q=",
	bing: "https://www.bing.com/search?q=",
	brave: "https://search.brave.com/search?q=",
};

function getSearchUrl(query) {
	const engine =
		window.kargoSettings && typeof window.kargoSettings.get === "function"
			? window.kargoSettings.get().searchEngine
			: "duckduckgo";
	const base = KARGO_SEARCH_URLS[engine] || KARGO_SEARCH_URLS.duckduckgo;
	return `${base}${encodeURIComponent(query)}`;
}

function normalizeUrl(input) {
	const trimmed = (input || "").trim();
	if (!trimmed) {
		return "kargo://home";
	}

	const isProtocolUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed);
	const hasSpaces = trimmed.includes(" ");
	const looksLikeHost =
		/^(?:https?:\/\/)?(?:[\w-]+\.)+[\w-]{2,}(?:\/.*)?$/i.test(trimmed);

	if (trimmed.toLowerCase().startsWith("kargo://")) {
		return trimmed;
	}

	if (isProtocolUrl) {
		return trimmed;
	}
	if (!hasSpaces && looksLikeHost) {
		return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
	}

	return getSearchUrl(trimmed);
}

function isKargoScheme(url) {
	return typeof url === "string" && url.toLowerCase().startsWith("kargo://");
}

window.normalizeUrl = normalizeUrl;
window.isKargoScheme = isKargoScheme;
