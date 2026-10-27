// Ana sayfa görünümü. views/home.html parçası #app-view içine yüklenince
// router tarafından mount edilir.
(function () {
	const homePrompts = [
		"En yakın tren istasyonu nerede?",
		"Tren sizi taşısın!",
		"Hadi binin!",
		"Bilet aldınız mı?",
		"Pencere kenarına oturabilir miyim?",
		"Bir sonraki tren ne zaman kalkıyor?",
	];

	function navigateTo(query) {
		const normalized = window.normalizeUrl ? window.normalizeUrl(query) : query;
		// kargo:// adresleri kendi görünümünde açılır (url.js).
		if (window.kargoOpen && window.kargoOpen(normalized)) return;
		window.location.href = `search.html?q=${encodeURIComponent(query)}`;
	}

	function openStartupPage() {
		if (!window.kargoSettings || sessionStorage.getItem("kargoStartupLoaded")) {
			return;
		}

		sessionStorage.setItem("kargoStartupLoaded", "true");

		const { homepage } = window.kargoSettings.get();
		const normalizedHomepage = homepage.trim().toLowerCase();
		if (
			!homepage ||
			normalizedHomepage === "kargo://home" ||
			normalizedHomepage === "kargo://index"
		) {
			return;
		}

		navigateTo(homepage);
	}

	function mount(root) {
		const destInput = root.querySelector("#destInput");
		const promptText = root.querySelector(".text");

		promptText.textContent =
			homePrompts[Math.floor(Math.random() * homePrompts.length)];

		openStartupPage();

		function handleSearchInput(event) {
			const isEnter =
				event.key === "Enter" || event.code === "Enter" || event.keyCode === 13;
			if (!isEnter) return;
			event.preventDefault();
			const query = destInput.value.trim();
			if (!query) {
				return;
			}
			navigateTo(query);
		}

		destInput.addEventListener("keydown", handleSearchInput);
	}

	if (window.kargoRouter) {
		window.kargoRouter.register("home", { mount });
	}
})();
