// Kargo görünüm yönlendiricisi.
//
// index.html bir "kabuk"tur: kenar çubuğu (aside#sidebar) ve içerik alanı
// (main#app-view). Ana sayfa, ayarlar, geçmiş ve hakkında sayfaları ayrı HTML
// dosyaları değil, pages/views/ altındaki parçalardır ve router.load("settings")
// gibi bir çağrıyla #app-view içine yüklenir.
//
// Geçerli görünüm URL'nin #hash kısmında tutulur (index.html#settings). Böylece
// geri/ileri düğmeleri çalışır, pencere yenilenince aynı görünüm açılır ve
// kabuk dışındaki sayfalar (search.html, error.html) "index.html#history" gibi
// bir adresle doğrudan bir görünüme gidebilir.
//
// Bir görünümün betiği router.register(ad, { mount }) ile kendini tanıtır.
// mount(kök) parça DOM'a eklendikten sonra çağrılır ve istenirse görünümden
// çıkılırken çalışacak bir cleanup fonksiyonu döndürür.
(function () {
	const outlet = document.getElementById("app-view");
	if (!outlet) return;

	const DEFAULT_ROUTE = "home";

	// file: pages/ altındaki parça, bodyClass: sayfaya özel CSS'in dayandığı
	// body sınıfları (eskiden her sayfanın kendi <body class="..."> değeri).
	const ROUTES = {
		home: {
			file: "views/home.html",
			title: "Kargo",
			bodyClass: "home-page index-page",
		},
		settings: {
			file: "views/settings.html",
			title: "Kargo - Ayarlar",
			bodyClass: "settings-page",
		},
		history: {
			file: "views/history.html",
			title: "Kargo - Geçmiş",
			bodyClass: "settings-page history-page",
		},
		about: {
			file: "views/about.html",
			title: "Kargo - Hakkında",
			bodyClass: "settings-page about-page",
		},
	};

	const ALIASES = { index: "home" };

	const modules = new Map();
	const htmlCache = new Map();
	const listeners = new Set();

	let currentName = null;
	let currentCleanup = null;
	let currentBodyClasses = [];
	let navigationToken = 0;
	let started = false;

	function resolve(name) {
		const key = String(name || "").toLowerCase();
		const route = ALIASES[key] || key;
		return ROUTES[route] ? route : null;
	}

	function routeFromHash() {
		return resolve(window.location.hash.slice(1)) || DEFAULT_ROUTE;
	}

	function readWithXhr(file) {
		return new Promise((resolveText, reject) => {
			const request = new XMLHttpRequest();
			request.open("GET", file);
			request.onload = () => {
				// file:// isteklerinde başarılı yanıt status 0 ile gelir.
				const ok = request.status === 0 || (request.status >= 200 && request.status < 300);
				if (ok && request.responseText) resolveText(request.responseText);
				else reject(new Error(`${file} okunamadı (${request.status})`));
			};
			request.onerror = () => reject(new Error(`${file} okunamadı`));
			request.send();
		});
	}

	async function fetchFragment(file) {
		if (htmlCache.has(file)) return htmlCache.get(file);

		let html;
		try {
			const response = await fetch(file);
			if (!response.ok) throw new Error(`${file}: ${response.status}`);
			html = await response.text();
		} catch (error) {
			html = await readWithXhr(file);
		}

		htmlCache.set(file, html);
		return html;
	}

	function teardown() {
		const cleanup = currentCleanup;
		currentCleanup = null;
		if (typeof cleanup !== "function") return;
		try {
			cleanup();
		} catch (error) {
			console.error("Görünüm temizlenirken hata:", error);
		}
	}

	function applyBodyClasses(route) {
		document.body.classList.remove(...currentBodyClasses);
		currentBodyClasses = route.bodyClass.split(" ").filter(Boolean);
		document.body.classList.add(...currentBodyClasses);
	}

	function renderFailure() {
		const wrapper = document.createElement("div");
		wrapper.className = "home-shell";
		wrapper.innerHTML =
			'<section class="home-hero"><p class="text">Bu sayfa yüklenemedi.</p>' +
			'<p class="home-hint">Ana sayfaya dönmek için kenar çubuğundaki ana sayfa düğmesini kullan.</p></section>';
		outlet.replaceChildren(wrapper);
	}

	function notify() {
		listeners.forEach((listener) => {
			try {
				listener(currentName);
			} catch (error) {
				console.error("Router dinleyicisi hatası:", error);
			}
		});
	}

	async function show(name) {
		// Önce sırayı yükselt: bekleyen eski bir yükleme varsa, aynı görünüme
		// geri dönülmüş olsa bile sonradan ekrana gelmesin.
		const token = ++navigationToken;
		if (name === currentName) return;

		const route = ROUTES[name];

		let html = null;
		try {
			html = await fetchFragment(route.file);
		} catch (error) {
			console.error("Görünüm yüklenemedi:", error);
		}

		// Yükleme sürerken başka bir görünüme geçildiyse bunu bırak.
		if (token !== navigationToken) return;

		teardown();
		applyBodyClasses(route);

		if (html === null) {
			renderFailure();
		} else {
			const template = document.createElement("template");
			template.innerHTML = html;
			outlet.replaceChildren(template.content);
		}

		outlet.scrollTop = 0;
		document.title = route.title;
		currentName = name;

		const view = modules.get(name);
		if (html !== null && view && typeof view.mount === "function") {
			try {
				currentCleanup = view.mount(outlet) || null;
			} catch (error) {
				console.error(`"${name}" görünümü başlatılamadı:`, error);
			}
		}

		// İçerik kartı klavye ile kaydırılabilsin (PageDown, Space, oklar).
		if (!outlet.contains(document.activeElement)) {
			outlet.focus({ preventScroll: true });
		}

		notify();
	}

	// Bir görünümü yükle ve adres çubuğundaki #hash'i güncelle.
	function load(name, { replace = false } = {}) {
		const target = resolve(name);
		if (!target) {
			console.warn(`Bilinmeyen görünüm: ${name}`);
			return Promise.resolve();
		}

		if (routeFromHash() !== target) {
			const method = replace ? "replaceState" : "pushState";
			window.history[method](null, "", `#${target}`);
		}
		return show(target);
	}

	// Geri/ileri veya dışarıdan değiştirilen #hash.
	function onLocationChange() {
		show(routeFromHash());
	}

	function start() {
		if (started) return Promise.resolve();
		started = true;

		window.addEventListener("popstate", onLocationChange);
		window.addEventListener("hashchange", onLocationChange);

		// Geçersiz ya da boş #hash'i gerçek görünüme sabitle (geçmişe yeni
		// kayıt eklemeden).
		const initial = routeFromHash();
		if (window.location.hash.slice(1) !== initial) {
			window.history.replaceState(null, "", `#${initial}`);
		}
		return show(initial);
	}

	function register(name, view) {
		const route = resolve(name);
		if (!route) throw new Error(`Bilinmeyen görünüm: ${name}`);
		modules.set(route, view);
	}

	function onChange(listener) {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}

	window.kargoRouter = {
		routes: Object.keys(ROUTES),
		get current() {
			return currentName;
		},
		has: (name) => Boolean(resolve(name)),
		register,
		load,
		start,
		onChange,
	};
})();
