const destInput = document.getElementById("destInput");
const promptText = document.querySelector(".text");

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

function handleSearchInput(event) {
	const isEnter =
		event.key === "Enter" || event.code === "Enter" || event.keyCode === 13;
	if (!isEnter) return;
	event.preventDefault();
	const query = destInput.value.trim();
	if (!query) {
		return;
	}
	window.location.href = `search.html?q=${encodeURIComponent(query)}`;
}

destInput.addEventListener("keydown", handleSearchInput);
destInput.addEventListener("keypress", handleSearchInput);
