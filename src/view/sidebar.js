// Kenar çubuğu davranışları: gezinme düğmeleri, daraltma ve (Zen'deki gibi)
// daraltılmışken sol kenara gelince geçici olarak açılma.
// Sekme görünümünde (search.html) window.kargoTabs vardır. index.html
// kabuğunda window.kargoRouter vardır: ana sayfa, ayarlar, geçmiş ve hakkında
// düğmeleri sayfa değiştirmez, router.load(...) ile #app-view içeriğini yükler.
// Kabuk dışındaki sayfalarda (error.html) bu düğmeler index.html#<görünüm>
// adresine gider.
(function () {
	const tabsApi = window.kargoTabs || null;
	const router = window.kargoRouter || null;
	const store = window.kargoSettings || null;
	const body = document.body;
	const sidebar = document.getElementById("sidebar");
	const hotzone = document.getElementById("sidebarHotzone");
	const queryField = document.getElementById("queryInput");
	const pageFile = window.location.pathname.split("/").pop() || "index.html";

	if (!sidebar) return;

	// macOS'ta pencere kontrol düğmeleri (trafik ışıkları) sol üstte durur.
	if (/Mac/i.test(navigator.platform || navigator.userAgent)) {
		body.classList.add("platform-mac");
	}

	let pointerInside = false;
	let hideTimer = null;

	function isCollapsed() {
		return body.classList.contains("sidebar-collapsed");
	}

	function peek() {
		if (!isCollapsed()) return;
		clearTimeout(hideTimer);
		body.classList.add("sidebar-peek");
	}

	function unpeek({ force = false, delay = 220 } = {}) {
		clearTimeout(hideTimer);
		hideTimer = setTimeout(
			() => {
				if (!force && (pointerInside || sidebar.contains(document.activeElement))) {
					return;
				}
				body.classList.remove("sidebar-peek");
			},
			force ? 0 : delay,
		);
	}

	// Fare kenara değip hiç içeri girmezse panel açık kalmasın.
	if (hotzone) {
		hotzone.addEventListener("mouseenter", () => {
			peek();
			unpeek({ delay: 700 });
		});
	}
	sidebar.addEventListener("mouseenter", () => {
		pointerInside = true;
		if (hideTimer) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
		peek();
	});
	sidebar.addEventListener("mouseleave", () => {
		pointerInside = false;
		unpeek({ delay: 150 });
	});

	// Ctrl+K veya Tab ile kenar çubuğuna odaklanınca paneli göster.
	sidebar.addEventListener("focusin", peek);
	sidebar.addEventListener("focusout", () => unpeek());

	function saveSidebarState() {
		if (store) store.save({ showTabBar: !isCollapsed() });
	}

	function toggleSidebar() {
		if (tabsApi) {
			// Sekme görünümünde durum tabs.js tarafından yönetilir.
			tabsApi.toggleSidebar();
			return;
		}
		const collapsed = body.classList.toggle("sidebar-collapsed");
		body.classList.remove("sidebar-peek");
		if (store) store.save({ showTabBar: !collapsed });
	}

	// Klavye kısayolları (Ctrl + B) sekme görünümü dışındaki
	// sayfalarda da aynı daraltma davranışını kullanabilsin.
	window.kargoSidebar = { toggle: toggleSidebar, isCollapsed };

	if (queryField) {
		queryField.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				const current = tabsApi ? tabsApi.currentTab : null;
				if (current) {
					queryField.value = current.url;
					if (current.webview) current.webview.focus();
				} else {
					// Kargo sayfasında adresi temizlemek yerine sayfanın
					// kendi kargo:// adresine geri dön.
					queryField.value = currentAddress();
				}
				queryField.blur();
				unpeek({ force: true });
				return;
			}

			// Sekme görünümü dışındaki sayfalarda adres kutusu doğrudan
			// hedefe yönlendirir. Kargo adresleri kendi sayfalarında açılır.
			if (!tabsApi && (event.key === "Enter" || event.code === "Enter")) {
				event.preventDefault();
				const query = queryField.value.trim();
				if (!query) {
					window.location.href = "search.html";
					return;
				}
				const normalized = window.normalizeUrl
					? window.normalizeUrl(query)
					: query;
				// Kargo adresleri kendi görünümünde (ya da sayfasında) açılır.
				if (window.kargoOpen && window.kargoOpen(normalized)) return;
				window.location.href = `search.html?q=${encodeURIComponent(query)}`;
			}
		});

		// Adres alanına odaklanınca tüm adresi seç (tek tıkla kopyalama/değiştirme).
		queryField.addEventListener("focus", () => queryField.select());
	}

	// Gezinme düğmeleri
	const bind = (id, handler) => {
		const element = document.getElementById(id);
		if (element) element.addEventListener("click", handler);
	};

	// Kabukta içeriği router yükler; kabuk dışındaki sayfalarda index.html#<görünüm>
	// adresine gidilir.
	function goTo(route) {
		if (router) {
			router.load(route);
			return;
		}
		window.location.href = window.kargoPageHref
			? window.kargoPageHref(route)
			: `index.html#${route}`;
	}

	bind("backBtn", () => (tabsApi ? tabsApi.goBack() : history.back()));
	bind("forwardBtn", () => (tabsApi ? tabsApi.goForward() : history.forward()));
	bind("reloadBtn", () =>
		tabsApi ? tabsApi.refreshCurrentTab() : window.location.reload(),
	);
	bind("collapseBtn", toggleSidebar);
	bind("newTabBtn", () =>
		tabsApi ? tabsApi.newTab() : (window.location.href = "search.html"),
	);
	bind("homeBtn", () => goTo("home"));
	bind("historyBtn", () => goTo("history"));
	bind("settingsBtn", () => goTo("settings"));
	bind("aboutBtn", () => goTo("about"));

	// Şu an gösterilen Kargo sayfasının kargo:// adresi. Kabukta router'ın
	// geçerli görünümü, error.html gibi ayrı sayfalarda dosya adı belirler;
	// sekme görünümünde (search.html) boştur.
	function currentAddress() {
		if (router) return router.current ? `kargo://${router.current}` : "";
		return window.kargoAddressForPage
			? window.kargoAddressForPage(pageFile)
			: "";
	}

	// Hangi sayfada olduğumuzu alt çubukta işaretle.
	const footerButtons = {
		home: "homeBtn",
		history: "historyBtn",
		settings: "settingsBtn",
		about: "aboutBtn",
	};
	const activeButtonFor = { ...footerButtons, error: "homeBtn" };

	function markActivePage() {
		const page = currentAddress().replace("kargo://", "");
		const activeId = activeButtonFor[page] || "";

		Object.values(footerButtons).forEach((id) => {
			const button = document.getElementById(id);
			if (!button) return;
			const isActive = id === activeId;
			button.classList.toggle("active", isActive);
			if (isActive) button.setAttribute("aria-current", "page");
			else button.removeAttribute("aria-current");
		});
	}

	// Sekme görünümü dışındaki sayfalarda adres kutusunda sayfanın
	// kargo:// karşılığını göster; yazılan adres kaybolmasın.
	function showCurrentAddress() {
		if (queryField && !tabsApi) queryField.value = currentAddress();
	}

	markActivePage();
	showCurrentAddress();

	// Görünüm değişince işaret ve adres çubuğu da güncellensin.
	if (router) {
		router.onChange(() => {
			markActivePage();
			showCurrentAddress();
		});
	}

	// Sayfa içeriği kaydırılabilir kartın kendisidir. Klavye ile
	// (PageDown, Space, ok tuşları) kaydırma için odağı karta ver.
	const pageView = document.querySelector(".page-view");
	if (pageView && (!document.activeElement || document.activeElement === document.body)) {
		pageView.focus({ preventScroll: true });
	}

	// İçeriğe tıklandığında odak gövdeye dönebiliyor. Bu durumda da klavye
	// ile kaydırma çalışsın diye kartı hedefleyen bir tuş dinleyicisi ekle.
	if (!tabsApi && pageView) {
		const interactiveSelector =
			"input, textarea, select, button, a, [contenteditable='true'], [role='button']";

		document.addEventListener("keydown", (event) => {
			if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
				return;
			}
			if (
				event.target instanceof Element &&
				event.target.closest(interactiveSelector)
			) {
				return;
			}

			const maxScroll = pageView.scrollHeight - pageView.clientHeight;
			if (maxScroll <= 0) return;

			const step = pageView.clientHeight * 0.9;
			let delta = 0;

			if (event.key === "PageDown") {
				delta = step;
			} else if (event.key === "PageUp") {
				delta = -step;
			} else if (event.key === " " || event.key === "Spacebar") {
				delta = event.shiftKey ? -step : step;
			} else if (event.key === "ArrowDown") {
				delta = 48;
			} else if (event.key === "ArrowUp") {
				delta = -48;
			} else if (event.key === "Home") {
				delta = -pageView.scrollTop;
			} else if (event.key === "End") {
				delta = maxScroll - pageView.scrollTop;
			} else {
				return;
			}

			event.preventDefault();
			pageView.scrollTop = Math.max(
				0,
				Math.min(maxScroll, pageView.scrollTop + delta),
			);
		});
	}

	// Sekme listesi yalnızca sekme görünümünde doldurulur; diğer sayfalarda
	// kullanıcıya nasıl geri döneceğini söyle.
	if (!tabsApi) {
		const tabEmpty = document.getElementById("tabEmpty");
		if (tabEmpty) tabEmpty.hidden = false;
		const tabCount = document.getElementById("tabCount");
		if (tabCount) tabCount.textContent = "";
	}

	// Geri/ileri düğmelerini sekmenin gerçek durumuna göre etkinleştir.
	const backButton = document.getElementById("backBtn");
	const forwardButton = document.getElementById("forwardBtn");

	function updateNavState() {
		if (!tabsApi) {
			// Tarayıcı geçmişinin uçlarını önceden bilemeyiz; düğmeler açık kalır.
			if (backButton) backButton.disabled = false;
			if (forwardButton) forwardButton.disabled = false;
			return;
		}

		const tab = tabsApi.currentTab;
		let canBack = false;
		let canForward = false;
		try {
			canBack = Boolean(tab && tab.webview.canGoBack());
			canForward = Boolean(tab && tab.webview.canGoForward());
		} catch (error) {
			// webview henüz DOM'a bağlanıp hazır değilse düğmeler pasif kalır.
		}
		if (backButton) backButton.disabled = !canBack;
		if (forwardButton) forwardButton.disabled = !canForward;
	}

	if (tabsApi) {
		tabsApi.onChange(updateNavState);
	}
	updateNavState();

	// Kenar çubuğunda tarayıcının "Geri/Yenile" sağ tık menüsü anlamsız;
	// yalnızca adres alanında kes/kopyala/yapıştır menüsü kalsın.
	sidebar.addEventListener("contextmenu", (event) => {
		if (!event.target.closest("input")) {
			event.preventDefault();
		}
	});

	// Daraltma düğmesinin ipucunu duruma göre güncelle.
	const collapseButton = document.getElementById("collapseBtn");
	if (collapseButton) {
		new MutationObserver(() => {
			const collapsed = isCollapsed();
			collapseButton.title = collapsed
				? "Kenar çubuğunu sabitle (Ctrl + B)"
				: "Kenar çubuğunu gizle (Ctrl + B)";
			collapseButton.setAttribute("aria-pressed", String(collapsed));
		}).observe(body, { attributes: true, attributeFilter: ["class"] });
	}
})();
