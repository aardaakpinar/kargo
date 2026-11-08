// Kenar çubuğu iskeleti. Tüm sayfalar için kullanılır.
// Davranışlar sidebar.js içindedir.
(function () {
	// Arama popup'ı ve sağ taraftaki yer imleri paneli. İkisi de kenar çubuğundan
	// bağımsızdır; davranışları search-popup.js ve bookmarks.js içindedir.
	// Kimlikler (queryInput, bookmarkList, ...) eskisiyle aynı kaldığı için
	// tabs.js / bookmarks.js bu öğeleri aynı şekilde bulur.
	function buildOverlays(body) {
		if (document.getElementById("searchPopup")) return;

		const template = document.createElement("template");
		template.innerHTML = `
			<div id="searchPopup" class="search-popup" role="dialog" aria-modal="true" aria-label="Arama" hidden>
				<div class="search-popup-card">
					<div class="search-popup-field">
						<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
						<input
							id="queryInput"
							type="text"
							class="search-popup-input"
							placeholder="Ara veya site aç"
							autocomplete="off"
							spellcheck="false"
							role="combobox"
							aria-controls="searchResults"
							aria-autocomplete="list"
							aria-expanded="true"
						/>
						<kbd>Esc</kbd>
					</div>
					<div id="searchResults" class="search-results" role="listbox" aria-label="Geçmiş ve öneriler"></div>
				</div>
			</div>

			<aside id="bookmarkPanel" class="bookmark-panel" aria-label="Yer imleri" inert>
				<div class="bookmark-panel-inner">
					<div class="bookmark-panel-drag"></div>
					<div class="side-label">
						<span id="bookmarkLabel">Yer imleri</span>
						<span class="side-label-actions">
							<span id="bookmarkCount" class="side-count"></span>
							<button id="bookmarkCloseBtn" class="icon-btn small" type="button" title="Paneli kapat (Ctrl + Shift + B)" aria-label="Yer imleri panelini kapat">
								<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" /></svg>
							</button>
						</span>
					</div>
					<div class="sidebar-scroll">
						<ul id="bookmarkList" class="bookmark-list"></ul>
						<p id="bookmarkEmpty" class="side-empty">
							Henüz yer imi yok. Bir sayfadayken yıldız düğmesine ya da <kbd>Ctrl</kbd> <kbd>D</kbd> tuşlarına bas.
						</p>
					</div>
				</div>
			</aside>
		`;

		body.append(...template.content.children);

		// İlk karede panelin açık/kapalı sıçramasını önlemek için sınıfı hemen uygula.
		try {
			if (localStorage.getItem("kargoBookmarkPanel") === "true") {
				body.classList.add("bookmarks-open");
			}
		} catch (error) {}
	}

	const existingSidebar = document.getElementById("sidebar");
	if (existingSidebar) {
		const body = document.body;
		buildOverlays(body);

		if (!document.getElementById("sidebarHotzone")) {
			const hotzone = document.createElement("div");
			hotzone.id = "sidebarHotzone";
			hotzone.className = "sidebar-hotzone";
			body.appendChild(hotzone);
		}

		if (!document.querySelector(".window-drag-strip")) {
			const dragStrip = document.createElement("div");
			dragStrip.className = "window-drag-strip";
			body.appendChild(dragStrip);
		}

		if (window.kargoSettings && !window.kargoSettings.get().showTabBar) {
			body.classList.add("sidebar-collapsed");
		}

		requestAnimationFrame(() => {
			requestAnimationFrame(() => body.classList.add("sidebar-ready"));
		});
		return;
	}

	const body = document.body;
	// Sekme görünümünde içerik zaten yan yana durur; diğer sayfalarda sayfa
	// içeriğini yuvarlatılmış bir kartın içine alırız.
	const isTabView = body.classList.contains("search-page") && Boolean(body.querySelector(".content"));

	const template = document.createElement("template");
	template.innerHTML = `
		<aside id="sidebar" class="sidebar" aria-label="Kenar çubuğu">
			<div class="sidebar-drag"></div>

			<div class="url-row">
				<button id="addressBtn" class="address-btn" type="button" title="Ara veya site aç (Ctrl + K)" aria-haspopup="dialog">
					<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
					<span id="addressLabel" class="address-label is-placeholder">Ara veya site aç</span>
				</button>
			</div>

			<div class="sidebar-scroll">
				<div id="tabBar" class="tab-list"></div>
			</div>
		</aside>
	`;

	const sidebar = template.content.firstElementChild;
	body.insertBefore(sidebar, body.firstChild);

	if (!isTabView) {
		body.classList.add("has-sidebar");

		// Sayfa içeriğini (üst çubuk, kartlar, bildirimler) tek bir sütuna al.
		const pageView = document.createElement("div");
		pageView.className = "page-view";
		// Klavye ile kaydırma (PageDown, Space, oklar) için karta odaklanılabilir.
		pageView.tabIndex = -1;

		Array.from(body.children).forEach((node) => {
			if (node === sidebar || node.tagName === "SCRIPT") return;
			pageView.appendChild(node);
		});

		body.appendChild(pageView);
	}

	// Arama popup'ı ve sağ panel, içerik taşındıktan sonra eklenir ki
	// page-view'ın içine girmesinler.
	buildOverlays(body);

	// Daraltılmış kenar çubuğu için görünmez kenar alanı ve sürükleme şeridi.
	const hotzone = document.createElement("div");
	hotzone.id = "sidebarHotzone";
	hotzone.className = "sidebar-hotzone";

	const dragStrip = document.createElement("div");
	dragStrip.className = "window-drag-strip";

	body.append(hotzone, dragStrip);

	// İlk karede panelin açık/kapalı sıçramasını önlemek için sınıfı hemen uygula.
	if (window.kargoSettings && !window.kargoSettings.get().showTabBar) {
		body.classList.add("sidebar-collapsed");
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(() => body.classList.add("sidebar-ready"));
	});
})();
