const KARGO_SEARCH_URLS = {
	duckduckgo: "https://duckduckgo.com/?q=",
	google: "https://www.google.com/search?q=",
	brave: "https://search.brave.com/search?q=",
	vuhuv: "https://vuhuv.com/?k=1&p=1&d=1&q=",
	ecosia: "https://www.ecosia.org/search?method=index&q=",
};

function getSearchUrl(query) {
	const engine = window.kargoSettings && typeof window.kargoSettings.get === "function" ? window.kargoSettings.get().searchEngine : "duckduckgo";
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
	const looksLikeHost = /^(?:https?:\/\/)?(?:[\w-]+\.)+[\w-]{2,}(?:\/.*)?$/i.test(trimmed);

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

// index.html "kabuk"unun içinde (#app-view) yüklenen görünümler. Bunlar ayrı
// sayfa değil; adresleri index.html#<görünüm> olarak tutulur (bkz. router.js).
const KARGO_ROUTES = ["home", "settings", "history", "about"];
const KARGO_ROUTE_ALIASES = { index: "home" };

// Kabuğa taşınmayan, kendi dosyasında duran sayfalar.
const KARGO_STANDALONE_PAGES = { error: "error.html" };

// "kargo://about/x?y" -> "about". Kargo şeması değilse null.
function kargoNameFromUrl(url) {
	if (!isKargoScheme(url)) return null;

	return url.trim().toLowerCase().slice("kargo://".length).replace(/^\/+/, "").split(/[/?#]/)[0];
}

// kargo://about gibi bir adresin kabuk içindeki görünüm adı.
// Kargo şeması olmayan ya da ayrı sayfa olan (error) adresler için null döner.
function kargoRouteFor(url) {
	const name = kargoNameFromUrl(url);
	if (name === null || KARGO_STANDALONE_PAGES[name]) return null;

	const route = KARGO_ROUTE_ALIASES[name] || name;
	return KARGO_ROUTES.includes(route) ? route : "about";
}

// Kabuk dışındaki bir sayfadan (search.html, error.html) görünüme giden adres.
function kargoPageHref(route) {
	return `index.html#${route}`;
}

// kargo://about gibi bir adresi açılacak sayfaya çevirir. Kargo şeması
// olmayan adresler için null döner.
function kargoPageFor(url) {
	if (!isKargoScheme(url)) return null;

	const standalone = KARGO_STANDALONE_PAGES[kargoNameFromUrl(url)];
	return standalone || kargoPageHref(kargoRouteFor(url));
}

// Bir sayfanın (ya da index.html#görünüm adresinin) kargo:// karşılığı.
function kargoAddressForPage(page) {
	const [path, hash = ""] = (page || "").split("#");
	const file = path.split("?")[0].split("/").pop() || "index.html";

	if (file === "index.html") {
		const route = KARGO_ROUTE_ALIASES[hash] || hash;
		return `kargo://${KARGO_ROUTES.includes(route) ? route : "home"}`;
	}

	const standalone = Object.keys(KARGO_STANDALONE_PAGES).find((name) => KARGO_STANDALONE_PAGES[name] === file);
	return standalone ? `kargo://${standalone}` : "";
}

// Bir görünüme geç: kabuktaysak içeriği yükle, değilsek kabuğu o görünümle aç.
function kargoGo(route) {
	if (window.kargoRouter) {
		window.kargoRouter.load(route);
		return;
	}
	window.location.href = kargoPageHref(route);
}

// kargo:// adresini uygun yerde aç. Adres Kargo'nun değilse false döner.
function kargoOpen(url) {
	if (!isKargoScheme(url)) return false;

	const route = kargoRouteFor(url);
	if (route) {
		kargoGo(route);
	} else {
		window.location.href = kargoPageFor(url);
	}
	return true;
}

window.normalizeUrl = normalizeUrl;
window.isKargoScheme = isKargoScheme;
window.kargoRouteFor = kargoRouteFor;
window.kargoPageHref = kargoPageHref;
window.kargoPageFor = kargoPageFor;
window.kargoAddressForPage = kargoAddressForPage;
window.kargoGo = kargoGo;
window.kargoOpen = kargoOpen;
