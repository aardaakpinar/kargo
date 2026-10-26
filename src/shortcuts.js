const fs = require("fs");
const path = require("path");

// Kargo'nun varsayılan kısayolları. `id` kalıcı kayıt anahtarıdır; `action`
// ise arayüzde yürütülecek eylemdir. Aynı eyleme birden fazla kısayol
// bağlanabilsin diye ikisi ayrı tutuluyor (ör. Ctrl+R ve F5).
const DEFAULT_SHORTCUTS = [
	// Sekmeler
	{ id: "createTab", action: "createTab", keys: "ctrl+t", description: "Yeni sekme aç" },
	{ id: "closeTab", action: "closeTab", keys: "ctrl+w", description: "Sekmeyi kapat" },
	{
		id: "toggleTabBar",
		action: "toggleTabBar",
		keys: "ctrl+b",
		description: "Kenar çubuğunu göster/gizle",
	},
	{
		id: "toggleBookmark",
		action: "toggleBookmark",
		keys: "ctrl+d",
		description: "Sayfayı yer imlerine ekle/kaldır",
	},
	{ id: "prevTab", action: "prevTab", keys: "ctrl+shift+tab", description: "Önceki sekme" },
	{ id: "nextTab", action: "nextTab", keys: "ctrl+tab", description: "Sonraki sekme" },

	// Gezinme
	{ id: "goBack", action: "goBack", keys: "ctrl+left", description: "Geri git" },
	{ id: "goForward", action: "goForward", keys: "ctrl+right", description: "İleri git" },
	{ id: "goHome", action: "goHome", keys: "ctrl+shift+h", description: "Ana sayfaya git" },
	{ id: "goSettings", action: "goSettings", keys: "ctrl+,", description: "Ayarlar sayfasına git" },
	{ id: "goHistory", action: "goHistory", keys: "ctrl+h", description: "Geçmiş sayfasına git" },
	{ id: "goAbout", action: "goAbout", keys: "ctrl+shift+a", description: "Hakkında sayfası" },

	// Tarayıcı
	{ id: "refresh", action: "refresh", keys: "ctrl+r", description: "Sayfayı yenile" },
	{ id: "refreshF5", action: "refresh", keys: "f5", description: "Sayfayı yenile (F5)" },
	{
		id: "toggleDevTools",
		action: "toggleDevTools",
		keys: "f12",
		description: "Geliştirici araçlarını aç/kapat",
	},
	{ id: "focusSearch", action: "focusSearch", keys: "ctrl+k", description: "Arama alanına odaklan" },
	{ id: "zoomIn", action: "zoomIn", keys: "ctrl+=", description: "Yakınlaştır" },
	{ id: "zoomOut", action: "zoomOut", keys: "ctrl+-", description: "Uzaklaştır" },
	{ id: "zoomReset", action: "zoomReset", keys: "ctrl+0", description: "Yakınlaştırmayı sıfırla" },

	// Pencere
	{ id: "minimize", action: "minimize", keys: "ctrl+m", description: "Pencereyi küçült" },
	{ id: "maximize", action: "maximize", keys: "ctrl+shift+m", description: "Pencereyi büyüt" },
	{ id: "closeApp", action: "closeApp", keys: "ctrl+q", description: "Uygulamayı kapat" },
];

DEFAULT_SHORTCUTS.push({
	id: "lastTab",
	action: "lastTab",
	keys: "ctrl+9",
	description: "Son sekmeye geç",
});

for (let index = 1; index <= 8; index++) {
	DEFAULT_SHORTCUTS.push({
		id: `selectTab${index}`,
		action: `selectTab${index}`,
		keys: `ctrl+${index}`,
		description: `${index}. sekmeye geç`,
	});
}

const DEFAULT_BY_ID = new Map(DEFAULT_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

// Sadece değiştirici tuşlara basıldığında kaydı bekletmeye devam et.
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "AltGraph", "OS", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"]);

const MODIFIER_TOKENS = new Set(["shift", "control", "alt", "meta"]);

// Electron'da `input.code` donanım tuşunu verir; düzen (klavye dili) değişse
// bile aynı fiziksel tuş aynı kısayolu üretir.
const NAMED_KEYS = {
	Minus: "-",
	Equal: "=",
	BracketLeft: "[",
	BracketRight: "]",
	Backslash: "\\",
	Semicolon: ";",
	Quote: "'",
	Comma: ",",
	Period: ".",
	Slash: "/",
	Backquote: "`",
	NumpadAdd: "=",
	NumpadSubtract: "-",
	NumpadMultiply: "*",
	NumpadDivide: "/",
	NumpadDecimal: ".",
	NumpadEnter: "enter",
	Space: "space",
	Enter: "enter",
	Tab: "tab",
	Backspace: "backspace",
	Delete: "delete",
	Insert: "insert",
	Home: "home",
	End: "end",
	PageUp: "pageup",
	PageDown: "pagedown",
	ArrowLeft: "left",
	ArrowRight: "right",
	ArrowUp: "up",
	ArrowDown: "down",
	Escape: "escape",
};

const KEY_LABELS = {
	left: "←",
	right: "→",
	up: "↑",
	down: "↓",
	space: "Space",
	enter: "Enter",
	tab: "Tab",
	backspace: "Backspace",
	delete: "Delete",
	insert: "Insert",
	home: "Home",
	end: "End",
	pageup: "PageUp",
	pagedown: "PageDown",
	escape: "Esc",
};

function isModifierInput(input) {
	return MODIFIER_KEYS.has(input.key) || MODIFIER_KEYS.has(input.code);
}

function keyToken(input) {
	const code = input.code || "";
	let match;

	if ((match = /^Key([A-Z])$/.exec(code))) return match[1].toLowerCase();
	if ((match = /^Digit([0-9])$/.exec(code))) return match[1];
	if ((match = /^Numpad([0-9])$/.exec(code))) return match[1];
	if ((match = /^(F[0-9]{1,2})$/.exec(code))) return match[1].toLowerCase();
	if (NAMED_KEYS[code]) return NAMED_KEYS[code];

	const key = (input.key || "").toLowerCase();
	if (!key || key === "unidentified" || key === "dead") return "";
	if (key === " ") return "space";
	return key;
}

// Basılan tuşu "ctrl+shift+t" biçiminde kanonik bir metne çevirir.
function acceleratorFromInput(input) {
	// Tek başına değiştirici tuşlara basıldığında kayıt beklemede kalsın.
	if (isModifierInput(input)) return "";

	const token = keyToken(input);
	if (!token || MODIFIER_TOKENS.has(token)) return "";

	const parts = [];
	if (input.control || input.meta) parts.push("ctrl");
	if (input.alt) parts.push("alt");
	if (input.shift) parts.push("shift");
	parts.push(token);
	return parts.join("+");
}

function displayPart(part) {
	if (part === "ctrl") return "Ctrl";
	if (part === "alt") return "Alt";
	if (part === "shift") return "Shift";
	if (KEY_LABELS[part]) return KEY_LABELS[part];
	if (part.length === 1) return part.toUpperCase();
	return part[0].toUpperCase() + part.slice(1);
}

function displayAccelerator(keys) {
	if (!keys) return "Atanmadı";
	return keys.split("+").map(displayPart).join(" + ");
}

// Kullanıcı bir kısayol kaydederken bu kuralları uygularız.
function validateAccelerator(keys) {
	if (!keys) {
		return { valid: false, reason: "Bir tuş kombinasyonu seç." };
	}

	const parts = keys.split("+");
	const token = parts[parts.length - 1];
	const hasCtrl = parts.includes("ctrl");
	const isFunctionKey = /^f[0-9]{1,2}$/.test(token);

	if (token === "escape") {
		return { valid: false, reason: "Esc, kaydı iptal etmek için ayrılmış." };
	}
	if (!hasCtrl && !isFunctionKey) {
		return { valid: false, reason: "Ctrl ile birlikte kullanmalısın." };
	}
	return { valid: true, reason: "" };
}

class ShortcutStore {
	constructor(filePath) {
		this.filePath = filePath;
		this.overrides = {};
		this.byAccelerator = new Map();
		this.load();
	}

	load() {
		try {
			const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
			const bindings = parsed && parsed.bindings;
			if (bindings && typeof bindings === "object") {
				for (const [id, keys] of Object.entries(bindings)) {
					if (DEFAULT_BY_ID.has(id) && typeof keys === "string") {
						this.overrides[id] = keys;
					}
				}
			}
		} catch {
			// Dosya yoksa veya bozuksa varsayılanlarla devam et.
			this.overrides = {};
		}
		this.rebuild();
	}

	save() {
		try {
			fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
			const payload = JSON.stringify({ version: 1, bindings: this.overrides }, null, "\t");
			fs.writeFileSync(this.filePath, payload, "utf8");
		} catch (error) {
			console.error("Kısayollar kaydedilemedi:", error);
		}
	}

	keysFor(id) {
		if (Object.prototype.hasOwnProperty.call(this.overrides, id)) {
			return this.overrides[id];
		}
		const shortcut = DEFAULT_BY_ID.get(id);
		return shortcut ? shortcut.keys : "";
	}

	rebuild() {
		this.byAccelerator = new Map();
		for (const shortcut of this.list()) {
			if (shortcut.keys && !this.byAccelerator.has(shortcut.keys)) {
				this.byAccelerator.set(shortcut.keys, shortcut.action);
			}
		}
	}

	list() {
		return DEFAULT_SHORTCUTS.map((shortcut) => {
			const keys = this.keysFor(shortcut.id);
			return {
				id: shortcut.id,
				action: shortcut.action,
				description: shortcut.description,
				keys,
				display: displayAccelerator(keys),
				defaultKeys: shortcut.keys,
				isDefault: keys === shortcut.keys,
			};
		});
	}

	actionFor(accelerator) {
		if (!accelerator) return null;

		const direct = this.byAccelerator.get(accelerator);
		if (direct) return direct;

		// Ctrl+Shift+= gibi kaydırılmış noktalama tuşları, tarayıcıların
		// alışkanlığına uyup kaydırılmamış karşılığıyla da denenir.
		const parts = accelerator.split("+");
		const token = parts[parts.length - 1];
		if (parts.includes("shift") && (token === "=" || token === "-")) {
			const withoutShift = parts.filter((part) => part !== "shift");
			return this.byAccelerator.get(withoutShift.join("+")) || null;
		}

		return null;
	}

	set(id, keys) {
		const shortcut = DEFAULT_BY_ID.get(id);
		if (!shortcut) {
			return { ok: false, error: "Bilinmeyen kısayol." };
		}

		const check = validateAccelerator(keys);
		if (!check.valid) {
			return { ok: false, error: check.reason, list: this.list() };
		}

		// Aynı kombinasyon başka bir kısayolda varsa onu boşa al.
		const cleared = [];
		for (const other of this.list()) {
			if (other.id !== id && other.keys === keys) {
				this.overrides[other.id] = "";
				cleared.push(other.description);
			}
		}

		if (keys === shortcut.keys) {
			delete this.overrides[id];
		} else {
			this.overrides[id] = keys;
		}

		this.save();
		this.rebuild();
		return { ok: true, cleared, list: this.list() };
	}

	reset(id) {
		if (id) {
			delete this.overrides[id];
		} else {
			this.overrides = {};
		}
		this.save();
		this.rebuild();
		return { ok: true, list: this.list() };
	}
}

module.exports = {
	DEFAULT_SHORTCUTS,
	ShortcutStore,
	acceleratorFromInput,
	displayAccelerator,
	isModifierInput,
	validateAccelerator,
};
