// Arama popup'ı (açılır/kapanır). Ctrl + K ya da kenar çubuğundaki adres
// düğmesiyle açılır; Esc ya da dışına tıklamayla kapanır.
//
// - Boşken (ya da adres değiştirilmeden) son gezinilen sayfalar listelenir.
// - Yazarken geçmiş kayıtları sorguya göre süzülür ve "Ara / Git" satırının
//   altında öneri olarak gösterilir.
// - ↑ ↓ ile satırlar arasında gezilir, Enter seçili satırı açar.
//
// Giriş alanı (#queryInput) tabs.js ve search.js tarafından eskisi gibi
// kullanılır; yalnızca artık bu popup'ın içinde durur.
(function () {
	const popup = document.getElementById("searchPopup");
	const input = document.getElementById("queryInput");
	const resultsEl = document.getElementById("searchResults");
	if (!popup || !input || !resultsEl) return;

	const store = window.kargoSettings || null;
	const tabsApi = window.kargoTabs || null;
	const router = window.kargoRouter || null;
	const addressBtn = document.getElementById("addressBtn");
	const addressLabel = document.getElementById("addressLabel");
	const pageFile = window.location.pathname.split("/").pop() || "index.html";

	// Aramanın altında gösterilecek en fazla geçmiş kaydı (5 ya da 10 gibi).
	const HISTORY_LIMIT = 10;
	const PLACEHOLDER = "Ara veya site aç";

	let pristine = true; // Kullanıcı henüz bir şey yazmadı: tüm adres seçili.
	let activeIndex = -1;
	let rows = [];
	let lastFocus = null;

	function isOpen() {
		return !popup.hidden;
	}

	function isExternalUrl(url) {
		return /^(mailto|tel|sms|webcal):/i.test(url || "");
	}

	// Şu an gösterilen sayfanın adresi (boş sekme için boş metin).
	function currentAddress() {
		if (tabsApi) {
			const tab = tabsApi.currentTab;
			const url = tab ? tab.url : "";
			return tabsApi.isBlankUrl(url) ? "" : url;
		}
		if (router) return router.current ? `kargo://${router.current}` : "";
		return window.kargoAddressForPage ? window.kargoAddressForPage(pageFile) : "";
	}

	function prettyAddress(url) {
		return (url || "").replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, "");
	}

	function hostOf(url) {
		try {
			return new URL(url).hostname.replace(/^www\./, "");
		} catch (error) {
			return url;
		}
	}

	// Kenar çubuğundaki adres düğmesinin yazısını güncelle.
	function syncAddress() {
		const address = currentAddress();
		if (addressLabel) {
			addressLabel.textContent = prettyAddress(address) || PLACEHOLDER;
			addressLabel.classList.toggle("is-placeholder", !address);
		}
		if (addressBtn) {
			addressBtn.title = (address ? `${address}\n` : "") + "Ara veya site aç (Ctrl + K)";
		}
		if (!isOpen()) input.value = address;
	}

	// ---------- Geçmiş ----------

	function matchHistory(query) {
		const items = store ? store.getHistory() : [];
		const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
		const matched = terms.length
			? items.filter((item) => {
					const haystack = `${item.title || ""} ${item.url}`.toLowerCase();
					return terms.every((term) => haystack.includes(term));
				})
			: items;
		return matched.slice(0, HISTORY_LIMIT);
	}

	// ---------- Çizim ----------

	function iconSvg(path) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("viewBox", "0 0 16 16");
		svg.setAttribute("aria-hidden", "true");
		const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
		shape.setAttribute("d", path);
		svg.appendChild(shape);
		return svg;
	}

	function createGroupLabel(text) {
		const label = document.createElement("div");
		label.className = "search-group";
		label.setAttribute("role", "presentation");
		label.textContent = text;
		return label;
	}

	function createRow(row, index) {
		const element = document.createElement("div");
		element.className = "search-row";
		element.id = `searchRow${index}`;
		element.setAttribute("role", "option");
		element.dataset.index = String(index);

		const icon = document.createElement("span");
		icon.className = "tab-icon";

		const title = document.createElement("span");
		title.className = "search-row-title";
		const sub = document.createElement("span");
		sub.className = "search-row-sub";
		const hint = document.createElement("span");
		hint.className = "search-row-hint";

		if (row.type === "query") {
			const isSearch = window.normalizeUrl && window.getSearchUrl ? window.normalizeUrl(row.value) === window.getSearchUrl(row.value) : true;
			icon.appendChild(iconSvg(isSearch ? "M7 11.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM10.5 10.5l3 3" : "M3 8h9M8.5 4.5 12 8l-3.5 3.5"));
			title.textContent = row.value;
			hint.textContent = isSearch ? "Ara" : "Git";
			element.classList.add("is-query");
			element.append(icon, title, hint);
		} else {
			icon.classList.add("is-letter");
			icon.textContent = (hostOf(row.item.url).charAt(0) || "·").toUpperCase();
			title.textContent = row.item.title && row.item.title !== row.item.url ? row.item.title : prettyAddress(row.item.url);
			sub.textContent = hostOf(row.item.url);
			element.title = row.item.url;
			element.append(icon, title, sub);
		}

		element.addEventListener("mouseenter", () => setActive(index, false));
		element.addEventListener("click", () => activate(index));
		return element;
	}

	function render() {
		const query = pristine ? "" : input.value.trim();
		const history = matchHistory(query);

		rows = [];
		if (query) rows.push({ type: "query", value: query });
		history.forEach((item) => rows.push({ type: "history", item }));

		resultsEl.textContent = "";
		const fragment = document.createDocumentFragment();

		if (!rows.length) {
			const empty = document.createElement("p");
			empty.className = "search-empty";
			empty.textContent = store && !store.get().saveHistory ? "Geçmiş kaydı kapalı." : "Henüz geçmiş yok.";
			fragment.appendChild(empty);
		}

		let index = 0;
		if (query) fragment.appendChild(createRow(rows[index], index++));
		if (history.length) {
			fragment.appendChild(createGroupLabel(query ? "Geçmişten" : "Son gezinilenler"));
			history.forEach(() => fragment.appendChild(createRow(rows[index], index++)));
		}

		resultsEl.appendChild(fragment);
		setActive(query ? 0 : -1, false);
	}

	function setActive(index, scroll = true) {
		activeIndex = index;
		resultsEl.querySelectorAll(".search-row").forEach((element) => {
			const active = Number(element.dataset.index) === index;
			element.classList.toggle("active", active);
			element.setAttribute("aria-selected", String(active));
			if (active && scroll) element.scrollIntoView({ block: "nearest" });
		});
		if (index >= 0) input.setAttribute("aria-activedescendant", `searchRow${index}`);
		else input.removeAttribute("aria-activedescendant");
	}

	function moveActive(step) {
		if (!rows.length) return;
		const next = activeIndex === -1 ? (step > 0 ? 0 : rows.length - 1) : (activeIndex + step + rows.length) % rows.length;
		setActive(next);
	}

	// ---------- Açma / kapama ----------

	function open() {
		if (isOpen()) {
			input.focus();
			input.select();
			return;
		}
		lastFocus = document.activeElement;
		// Daraltılmış kenar çubuğu yüzer panel olarak açıksa kapat.
		document.body.classList.remove("sidebar-peek");

		input.value = currentAddress();
		pristine = true;
		popup.hidden = false;
		render();
		input.focus();
		input.select();
	}

	function close(restoreFocus = true) {
		if (!isOpen()) return;
		popup.hidden = true;
		input.value = currentAddress();
		input.blur();
		if (!restoreFocus) return;

		const tab = tabsApi ? tabsApi.currentTab : null;
		if (tab && tab.webview) {
			try {
				tab.webview.focus();
			} catch (error) {}
		} else if (lastFocus && lastFocus !== document.body && document.contains(lastFocus)) {
			lastFocus.focus();
		} else {
			const pageView = document.querySelector(".page-view");
			if (pageView) pageView.focus({ preventScroll: true });
		}
	}

	function toggle() {
		if (isOpen()) close();
		else open();
	}

	// ---------- Gitme ----------

	function submit(raw) {
		const text = (raw || "").trim();
		const lower = text.toLowerCase();
		let url = window.normalizeUrl ? window.normalizeUrl(text) : text;
		if (["about", "hakkında", "hakkinda"].includes(lower)) url = "kargo://about";

		// Kargo'nun kendi sayfaları webview'a verilmemeli (bilinmeyen şema uyarısı).
		if (window.isKargoScheme && window.isKargoScheme(url)) {
			close(false);
			if (tabsApi && window.kargoPageFor) {
				// replace: geri tuşu yönlendirme döngüsü oluşturmasın.
				window.location.replace(window.kargoPageFor(url));
			} else if (window.kargoOpen) {
				window.kargoOpen(url);
			}
			return;
		}

		if (isExternalUrl(url)) {
			if (window.kargo && window.kargo.openExternal) window.kargo.openExternal(url);
			close();
			return;
		}

		if (tabsApi) {
			const tab = tabsApi.currentTab;
			if (tab) {
				tab.url = url;
				tab.webview.setAttribute("src", url);
				if (store) store.recordHistory(url);
			}
			close();
			syncAddress();
			return;
		}

		// Sekme görünümü dışındaki sayfalarda adres, sekme görünümünde açılır.
		close(false);
		window.location.href = text ? `search.html?q=${encodeURIComponent(text)}` : "search.html";
	}

	function activate(index) {
		const row = rows[index];
		if (!row) return;
		submit(row.type === "query" ? row.value : row.item.url);
	}

	// ---------- Olaylar ----------

	input.addEventListener("input", () => {
		pristine = false;
		render();
	});

	input.addEventListener("keydown", (event) => {
		if (event.isComposing) return;

		if (event.key === "Enter" || event.code === "Enter") {
			event.preventDefault();
			if (activeIndex >= 0) activate(activeIndex);
			else submit(input.value);
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			moveActive(1);
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			moveActive(-1);
		} else if (event.key === "Tab") {
			// Odak popup'ın dışına kaçmasın; Tab öneriler arasında gezdirir.
			event.preventDefault();
			moveActive(event.shiftKey ? -1 : 1);
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && isOpen()) {
			event.preventDefault();
			close();
		}
	});

	// Popup'ın dışına (karartılmış alana) tıklayınca kapat.
	popup.addEventListener("mousedown", (event) => {
		if (event.target === popup) close();
	});

	if (addressBtn) addressBtn.addEventListener("click", open);

	if (tabsApi) tabsApi.onChange(syncAddress);
	if (router) router.onChange(syncAddress);

	syncAddress();

	window.kargoSearch = { open, close, toggle, isOpen, refresh: syncAddress };
})();
