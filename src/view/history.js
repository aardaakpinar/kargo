// Geçmiş görünümü. views/history.html parçası #app-view içine yüklenince
// router tarafından mount edilir.
(function () {
	function mount(root) {
		const historyList = root.querySelector("#historyList");
		const historyEmpty = root.querySelector("#historyEmpty");
		const historyEmptyTitle = root.querySelector("#historyEmptyTitle");
		const historyEmptyText = root.querySelector("#historyEmptyText");
		const historyCount = root.querySelector("#historyCount");
		const historyFilter = root.querySelector("#historyFilter");
		const clearHistoryBtn = root.querySelector("#clearHistoryBtn");
		const historyToast = root.querySelector("#historyToast");

		let historyItems = window.kargoSettings.getHistory();

		let historyToastTimer = null;

		function showToast(message) {
			if (!historyToast) return;

			historyToast.textContent = message;
			historyToast.classList.add("show");

			if (historyToastTimer) clearTimeout(historyToastTimer);
			historyToastTimer = setTimeout(() => {
				historyToast.classList.remove("show");
				historyToastTimer = null;
			}, 2500);
		}

		function formatVisitedAt(value) {
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return "";

			return date.toLocaleString("tr-TR", {
				day: "2-digit",
				month: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
			});
		}

		function isOpenableUrl(url) {
			return typeof url === "string" && /^https?:\/\//i.test(url);
		}

		function openHistoryItem(url) {
			if (!isOpenableUrl(url)) {
				showToast("Bu adres açılamıyor.");
				return;
			}

			window.location.href = `search.html?q=${encodeURIComponent(url)}`;
		}

		function createHistoryItem(item) {
			const listItem = document.createElement("li");
			listItem.className = "history-item";

			const openButton = document.createElement("button");
			openButton.type = "button";
			openButton.className = "history-open";
			openButton.title = item.url || "";

			const title = document.createElement("span");
			title.className = "history-title";
			title.textContent = item.title || item.url || "Başlıksız sayfa";

			const url = document.createElement("span");
			url.className = "history-url";
			url.textContent = item.url || "";

			openButton.append(title, url);
			openButton.addEventListener("click", () => openHistoryItem(item.url));

			const time = document.createElement("time");
			time.className = "history-time";
			time.textContent = formatVisitedAt(item.visitedAt);
			if (item.visitedAt) time.dateTime = item.visitedAt;

			const removeButton = document.createElement("button");
			removeButton.type = "button";
			removeButton.className = "history-remove";
			removeButton.textContent = "×";
			removeButton.title = "Geçmişten kaldır";
			removeButton.setAttribute("aria-label", "Geçmişten kaldır");
			removeButton.addEventListener("click", () => {
				historyItems = window.kargoSettings.removeHistory(item.url);
				renderHistory();
				showToast("Kayıt geçmişten kaldırıldı.");
			});

			listItem.append(openButton, time, removeButton);
			return listItem;
		}

		function renderHistory() {
			const query = historyFilter.value.trim().toLowerCase();
			const visibleItems = query ? historyItems.filter((item) => `${item.title || ""} ${item.url || ""}`.toLowerCase().includes(query)) : historyItems;

			historyList.innerHTML = "";
			visibleItems.forEach((item) => {
				historyList.appendChild(createHistoryItem(item));
			});

			const hasItems = visibleItems.length > 0;
			historyList.hidden = !hasItems;
			historyEmpty.hidden = hasItems;

			if (!hasItems) {
				historyEmptyTitle.textContent = historyItems.length ? "Eşleşen kayıt yok." : "Henüz geçmiş yok.";
				historyEmptyText.textContent = historyItems.length ? "Farklı bir arama deneyebilirsin." : "Ziyaret ettiğin sayfalar burada listelenir.";
			}

			historyCount.textContent = query
				? `${visibleItems.length} / ${historyItems.length} kayıt`
				: `${historyItems.length} kayıt`;
			clearHistoryBtn.disabled = historyItems.length === 0;
		}

		historyFilter.addEventListener("input", renderHistory);

		clearHistoryBtn.addEventListener("click", () => {
			if (!historyItems.length) return;

			window.kargoSettings.clearHistory();
			historyItems = [];
			renderHistory();
			showToast("Gezi geçmişi temizlendi.");
		});

		renderHistory();

		return function cleanup() {
			if (historyToastTimer) clearTimeout(historyToastTimer);
		};
	}

	if (window.kargoRouter) {
		window.kargoRouter.register("history", { mount });
	}
})();
