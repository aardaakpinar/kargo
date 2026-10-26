const destInput = document.getElementById("destInput");
const promptText = document.querySelector(".text");

function navigateTo(query) {
	const normalized = window.normalizeUrl ? window.normalizeUrl(query) : query;
	const kargoPage = window.kargoPageFor ? window.kargoPageFor(normalized) : null;
	if (kargoPage) {
		window.location.href = kargoPage;
		return;
	}
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

const homePrompts = [
	"En yakın tren istasyonu nerede?",
	"Tren sizi taşısın!",
	"Hadi binin!",
	"Bilet aldınız mı?",
	"Pencere kenarına oturabilir miyim?",
	"Bir sonraki tren ne zaman kalkıyor?",
];

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
