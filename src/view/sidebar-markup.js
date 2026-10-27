// Kenar çubuğu iskeleti. Tüm sayfalar için kullanılır.
// Davranışlar sidebar.js içindedir.
(function () {
	const existingSidebar = document.getElementById("sidebar");
	if (existingSidebar) {
		const body = document.body;

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

			<div class="sidebar-nav">
				<button id="homeBtn" class="icon-btn" type="button" title="Ana sayfa" aria-label="Ana sayfa">
					<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 7.5 8 3l5.5 4.5M4 6.5V13h8V6.5" /></svg>
				</button>
				<span class="sidebar-nav-spacer"></span>
				<button id="collapseBtn" class="icon-btn" type="button" title="Kenar çubuğunu gizle" aria-label="Kenar çubuğunu gizle">
					<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="2" /><path d="M6 3v10" /></svg>
				</button>
			</div>

			<div class="url-row">
				<input
					id="queryInput"
					type="text"
					class="dest"
					placeholder="Ara veya site aç"
					autocomplete="off"
					spellcheck="false"
				/>
				<button id="bookmarkBtn" class="icon-btn bookmark-star" type="button" title="Yer imi ekle" aria-label="Yer imi ekle" aria-pressed="false">
					<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m8 2 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.8 4.2 13.8l.7-4.3-3.1-3 4.3-.6z" /></svg>
				</button>
			</div>

			<div class="sidebar-scroll">
				<section class="side-section" aria-labelledby="bookmarkLabel">
					<div class="side-label">
						<span id="bookmarkLabel">Yer imleri</span>
						<span id="bookmarkCount" class="side-count"></span>
					</div>
					<ul id="bookmarkList" class="bookmark-list"></ul>
					<p id="bookmarkEmpty" class="side-empty">
						Yer imlerini yönetmek için yer imi düğmesini kullan.
					</p>
				</section>

				<div class="side-sep" role="separator"></div>

				<section class="side-section" aria-labelledby="tabsLabel">
					<div class="side-label">
						<span id="tabsLabel">Sekmeler</span>
						<span class="side-label-actions">
							<span id="tabCount" class="side-count"></span>
							<button id="newTabBtn" class="icon-btn small" type="button" title="Yeni sekme" aria-label="Yeni sekme">
								<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
							</button>
						</span>
					</div>
					<div id="tabBar" class="tab-list"></div>
					<p id="tabEmpty" class="side-empty" hidden>
						Sekmeleri görmek için yeni sekme aç.
					</p>
				</section>
			</div>

			<div class="sidebar-footer">
				<button id="settingsBtn" class="icon-btn" type="button" title="Ayarlar" aria-label="Ayarlar">
					<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" /><circle cx="10" cy="4.5" r="1.5" /><circle cx="6" cy="11.5" r="1.5" /></svg>
				</button>
				<button id="historyBtn" class="icon-btn" type="button" title="Geçmiş" aria-label="Geçmiş">
					<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2 1.3" /></svg>
				</button>
				<button id="aboutBtn" class="icon-btn" type="button" title="Hakkında" aria-label="Hakkında">
					<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d="M8 7.2v3.6M8 5.2v.2" /></svg>
				</button>
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
