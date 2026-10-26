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

// kargo:// adreslerinin hangi sayfaya karşılık geldiği.
const KARGO_PAGES = {
	home: "index.html",
	index: "index.html",
	settings: "settings.html",
	history: "history.html",
	about: "about.html",
	error: "error.html",
};

// Kargo sayfalarının adres çubuğunda görünen karşılığı.
const KARGO_ADDRESSES = {
	"index.html": "kargo://home",
	"settings.html": "kargo://settings",
	"history.html": "kargo://history",
	"about.html": "kargo://about",
	"error.html": "kargo://error",
};

// kargo://about gibi bir adresi açılacak sayfa dosyasına çevirir.
// Kargo şeması olmayan adresler için null döner.
function kargoPageFor(url) {
	if (!isKargoScheme(url)) return null;

	const name = url
		.trim()
		.toLowerCase()
		.slice("kargo://".length)
		.replace(/^\/+/, "")
		.split(/[/?#]/)[0];

	return KARGO_PAGES[name] || "about.html";
}

// Bir sayfa dosyasının kargo:// adresini verir (adres çubuğunu doldurmak için).
function kargoAddressForPage(page) {
	const file = (page || "").split(/[?#]/)[0].split("/").pop() || "index.html";
	return KARGO_ADDRESSES[file] || "";
}

window.normalizeUrl = normalizeUrl;
window.isKargoScheme = isKargoScheme;
window.kargoPageFor = kargoPageFor;
window.kargoAddressForPage = kargoAddressForPage;
