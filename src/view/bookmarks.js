// Kargo yer imleri: kenar çubuğundaki liste, yıldız düğmesi ve Ctrl+D.
// Veri localStorage'da (settings-store.js) tutulur; sekmelerle tabs.js
// üzerindeki window.kargoTabs aracılığıyla konuşur.
(function () {
	const store = window.kargoSettings;
	const tabsApi = window.kargoTabs;
	const list = document.getElementById("bookmarkList");
	const emptyHint = document.getElementById("bookmarkEmpty");
	const countLabel = document.getElementById("bookmarkCount");
	const starButton = document.getElementById("bookmarkBtn");

	if (!store || !list) return;

	// Sekme görünümü dışındaki sayfalarda da yer imleri listelenir; burada
	// tabs.js'in favicon yardımcısı yoksa aynı davranışı yerel olarak uygularız.
	function fillFavicon(container, faviconUrl, label) {
		if (tabsApi && tabsApi.fillFavicon) {
			tabsApi.fillFavicon(container, faviconUrl, label);
			return;
		}

		container.textContent = "";
		const letter = ((label || "").trim().charAt(0) || "·").toUpperCase();
		if (!faviconUrl) {
			container.textContent = letter;
			container.classList.add("is-letter");
			return;
		}

		container.classList.remove("is-letter");
		const img = document.createElement("img");
		img.alt = "";
		img.draggable = false;
		img.addEventListener("error", () => {
			container.textContent = letter;
			container.classList.add("is-letter");
		});
		img.src = faviconUrl;
		container.appendChild(img);
	}

	let renderedSignature = "";
	let draggedId = null;
	let toastTimer = null;

	function stripSlash(url) {
		return (url || "").trim().replace(/\/+$/, "");
	}

	function sameUrl(a, b) {
		return Boolean(a) && Boolean(b) && stripSlash(a) === stripSlash(b);
	}

	function showToast(message) {
		let toast = document.getElementById("kargoToast");
		if (!toast) {
			toast = document.createElement("div");
			toast.id = "kargoToast";
			toast.className = "toast";
			toast.setAttribute("role", "status");
			document.body.appendChild(toast);
		}
		toast.textContent = message;
		// Aynı öğe yeniden gösterilirken geçiş animasyonu tekrar başlasın.
		void toast.offsetWidth;
		toast.classList.add("show");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
	}

	function openBookmark(url, { newTab = false } = {}) {
		if (!tabsApi) {
			// Sekme görünümüne dön ve adresi orada aç.
			window.location.href = `search.html?q=${encodeURIComponent(url)}`;
			return;
		}

		if (!newTab) {
			const existing = tabsApi.tabs.find((tab) => sameUrl(tab.url, url));
			if (existing) {
				tabsApi.switchTab(existing.id);
				return;
			}

			// Boş sekmedeyken yeni sekme açmak yerine onu kullan.
			const current = tabsApi.currentTab;
			if (current && tabsApi.isBlankUrl(current.url)) {
				current.url = url;
				current.webview.setAttribute("src", url);
				const input = document.getElementById("queryInput");
				if (input) input.value = url;
				current.webview.focus();
				return;
			}
		}
		tabsApi.newTab(url);
	}

	function signatureOf(items) {
		return items.map((item) => `${item.id}|${item.title}|${item.favicon}`).join("\n");
	}

	function createItem(bookmark) {
		const item = document.createElement("li");
		item.className = "bookmark-item";
		item.dataset.id = bookmark.id;
		item.dataset.url = bookmark.url;
		item.draggable = true;
		item.tabIndex = 0;
		item.setAttribute("role", "link");
		item.title = `${bookmark.title}\n${bookmark.url}`;

		const icon = document.createElement("span");
		icon.className = "tab-icon";
		fillFavicon(icon, bookmark.favicon, bookmark.title || bookmark.url);

		const title = document.createElement("span");
		title.className = "bookmark-title";
		title.textContent = bookmark.title;

		const remove = document.createElement("button");
		remove.type = "button";
		remove.className = "tab-close bookmark-remove";
		remove.title = "Yer imini kaldır";
		remove.setAttribute("aria-label", "Yer imini kaldır");
		remove.textContent = "×";
		remove.addEventListener("click", (event) => {
			event.stopPropagation();
			store.removeBookmark(bookmark.url);
			render();
			updateMarks();
		});

		item.append(icon, title, remove);

		item.addEventListener("click", () => openBookmark(bookmark.url));
		item.addEventListener("auxclick", (event) => {
			if (event.button === 1) {
				event.preventDefault();
				openBookmark(bookmark.url, { newTab: true });
			}
		});
		item.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				openBookmark(bookmark.url);
			} else if (event.key === "Delete" || event.key === "Backspace") {
				event.preventDefault();
				remove.click();
			}
		});

		// Sürükle-bırak ile sıralama.
		item.addEventListener("dragstart", (event) => {
			draggedId = bookmark.id;
			item.classList.add("dragging");
			event.dataTransfer.effectAllowed = "move";
			event.dataTransfer.setData("text/plain", bookmark.id);
		});
		item.addEventListener("dragend", () => {
			draggedId = null;
			clearDropMarks();
		});
		item.addEventListener("dragover", (event) => {
			if (!draggedId || draggedId === bookmark.id) return;
			event.preventDefault();
			event.dataTransfer.dropEffect = "move";
			const rect = item.getBoundingClientRect();
			const after = event.clientX > rect.left + rect.width / 2;
			clearDropMarks();
			item.classList.add(after ? "drop-after" : "drop-before");
		});
		item.addEventListener("dragleave", () => {
			item.classList.remove("drop-before", "drop-after");
		});
		item.addEventListener("drop", (event) => {
			if (!draggedId) return;
			event.preventDefault();
			const after = item.classList.contains("drop-after");
			store.moveBookmark(draggedId, bookmark.id, after);
			draggedId = null;
			render();
			updateMarks();
		});

		return item;
	}

	function clearDropMarks() {
		list.querySelectorAll(".dragging, .drop-before, .drop-after").forEach((node) => {
			node.classList.remove("dragging", "drop-before", "drop-after");
		});
	}

	function render() {
		const items = store.getBookmarks();
		renderedSignature = signatureOf(items);

		list.textContent = "";
		const fragment = document.createDocumentFragment();
		items.forEach((bookmark) => fragment.appendChild(createItem(bookmark)));
		list.appendChild(fragment);

		emptyHint.classList.toggle("hidden", items.length > 0);
		countLabel.textContent = items.length ? String(items.length) : "";
	}

	// Aktif sekmeyi ve açık sekmesi olan yer imlerini işaretle, yıldızı güncelle.
	function updateMarks() {
		const currentUrl = tabsApi && tabsApi.currentTab ? tabsApi.currentTab.url : "";
		const openUrls = tabsApi ? tabsApi.tabs.map((tab) => tab.url).filter(Boolean) : [];

		list.querySelectorAll(".bookmark-item").forEach((item) => {
			const url = item.dataset.url;
			item.classList.toggle("active", sameUrl(url, currentUrl));
			item.classList.toggle(
				"open",
				openUrls.some((openUrl) => sameUrl(openUrl, url)),
			);
		});

		if (!starButton) return;
		starButton.hidden = !tabsApi;
		const bookmarkable = Boolean(tabsApi) && store.isBookmarkable(currentUrl);
		const bookmarked = bookmarkable && store.isBookmarked(currentUrl);
		starButton.classList.toggle("active", bookmarked);
		starButton.disabled = !bookmarkable;
		starButton.setAttribute("aria-pressed", String(bookmarked));
		starButton.title = bookmarked ? "Yer imini kaldır (Ctrl + D)" : "Yer imi ekle (Ctrl + D)";
	}

	function toggleBookmark() {
		if (!tabsApi) {
			showToast("Yer imi eklemek için sekme görünümüne geç.");
			return;
		}

		const tab = tabsApi.currentTab;
		const url = tab ? tab.url : "";

		if (!store.isBookmarkable(url)) {
			showToast("Bu sayfa yer imi olarak eklenemez.");
			return;
		}

		if (store.isBookmarked(url)) {
			store.removeBookmark(url);
			showToast("Yer iminden kaldırıldı.");
		} else {
			const hasRealTitle = tab.title && tab.title !== "Yeni Sekme";
			store.addBookmark({
				url,
				title: hasRealTitle ? tab.title : "",
				favicon: tab.favicon,
			});
			showToast("Yer imi eklendi.");
		}
		render();
		updateMarks();
	}

	if (starButton) starButton.addEventListener("click", toggleBookmark);

	// Favicon/başlık sonradan geldiğinde ya da başka bir pencere listeyi
	// değiştirdiğinde yalnızca gerçekten değişmişse yeniden çiz.
	function refresh() {
		if (signatureOf(store.getBookmarks()) !== renderedSignature) {
			render();
		}
		updateMarks();
	}

	if (tabsApi) tabsApi.onChange(refresh);
	window.addEventListener("storage", (event) => {
		if (event.key === null || event.key === "kargoBookmarks") refresh();
	});

	render();
	updateMarks();

	window.kargoBookmarks = {
		toggle: toggleBookmark,
		open: openBookmark,
		render,
	};
})();
