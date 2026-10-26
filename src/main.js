const {
	app,
	BrowserWindow,
	Menu,
	clipboard,
	ipcMain,
	session,
	shell,
} = require("electron");
const path = require("path");
const {
	ShortcutStore,
	acceleratorFromInput,
	displayAccelerator,
	isModifierInput,
	validateAccelerator,
} = require("./shortcuts");

let mainWindow;
let shortcutStore;
// Ayarlar sayfasında bir kısayol kaydedilirken varsayılan kısayollar devre dışı
// kalır; aksi halde Ctrl+T gibi bir kombinasyon kaydedilemeden yeni sekme açardı.
let shortcutRecording = false;

// Chromium zoom seviyesi: 0 = %100, her adım yaklaşık %10 büyür/küçülür.
const ZOOM_MIN_LEVEL = -6;
const ZOOM_MAX_LEVEL = 8;
const ZOOM_STEP = 0.5;

// Bu şemalar tarayıcı içinde açılamaz; işletim sistemine devredilir.
const EXTERNAL_PROTOCOLS = new Set(["mailto:", "tel:", "sms:", "webcal:"]);

// Tarayıcı içinde kalmasına izin verilen şemalar.
const WEB_PROTOCOLS = new Set(["http:", "https:", "about:", "data:", "blob:"]);

// Popup'lar normalde sekmeye dönüşür. Form POST'u gibi sekmeye taşınamayan
// veya window.opener bekleyen akışlar için güvenli, sade bir pencere kullanılır.
const POPUP_WINDOW_OPTIONS = {
	width: 520,
	height: 700,
	minWidth: 400,
	minHeight: 480,
	autoHideMenuBar: true,
	backgroundColor: "#111",
	webPreferences: {
		contextIsolation: true,
		nodeIntegration: false,
		sandbox: true,
		spellcheck: false,
	},
};

function sendShortcutAction(action) {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send("global-shortcut", action);
	}
}

function sendOpenTab(url, background = false) {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send("open-tab", { url, background });
	}
}

function isTabViewLoaded() {
	if (!mainWindow || mainWindow.isDestroyed()) return false;
	try {
		return /\/search\.html$/i.test(new URL(mainWindow.webContents.getURL()).pathname);
	} catch {
		return false;
	}
}

// Kargo'nun kendi sayfalarından (hakkında, ayarlar, ana sayfa) bir site
// bağlantısına tıklanınca tarayıcı arayüzü kaybolmasın; site sekmede açılsın.
function openUrlInKargo(url, background = false) {
	if (!mainWindow || mainWindow.isDestroyed()) return;

	if (isTabViewLoaded()) {
		sendOpenTab(url, background);
		return;
	}

	mainWindow.loadFile(path.join(__dirname, "pages", "search.html"), {
		query: { q: url },
	});
}

function protocolOf(url) {
	if (!url) return "";
	try {
		return new URL(url).protocol.toLowerCase();
	} catch {
		return "";
	}
}

// kargo:// adreslerinin karşılık geldiği Kargo sayfaları.
const KARGO_PAGE_FILES = {
	home: "index.html",
	index: "index.html",
	settings: "settings.html",
	history: "history.html",
	about: "about.html",
	error: "error.html",
};

function kargoPageFor(url) {
	try {
		const parsed = new URL(url);
		if (parsed.protocol.toLowerCase() !== "kargo:") return null;
		const name = (
			parsed.hostname ||
			parsed.pathname.replace(/^\/+/, "")
		).toLowerCase();
		return KARGO_PAGE_FILES[name] || "about.html";
	} catch {
		return null;
	}
}

// kargo:// adreslerini Chromium'a (ve işletim sistemine) devretme; Kargo'nun
// kendi sayfasında aç. Aksi halde "kargo uygulaması açılsın mı?" uyarısı çıkar.
function openKargoPage(url) {
	const page = kargoPageFor(url);
	if (!page || !mainWindow || mainWindow.isDestroyed()) return false;
	mainWindow.loadFile(path.join(__dirname, "pages", page));
	return true;
}

function isWebUrl(url) {
	return /^https?:\/\//i.test(url || "");
}

function openExternal(url) {
	shell.openExternal(url).catch((error) => {
		console.error("Harici bağlantı açılamadı:", error);
	});
}

function guardNavigation(contents, event, targetUrl) {
	const protocol = protocolOf(targetUrl);
	if (!protocol || WEB_PROTOCOLS.has(protocol)) return;

	// Kargo'nun kendi adresleri uygulama içinde açılır.
	if (protocol === "kargo:") {
		event.preventDefault();
		openKargoPage(targetUrl);
		return;
	}

	// Kargo'nun kendi sayfaları file:// üzerinden yükleniyor.
	const isChromeWindow = mainWindow && contents === mainWindow.webContents;
	if (isChromeWindow && protocol === "file:") return;

	event.preventDefault();
	if (EXTERNAL_PROTOCOLS.has(protocol)) {
		openExternal(targetUrl);
	}
}

// Electron varsayılan User-Agent'ı uygulama adını ve "Electron/x" izini taşır.
// Siteler bu yüzden tarayıcıyı tanımayıp eski/uyumsuz içerik gösterebiliyor.
// Tokenları temizleyip geriye kalan gerçek Chromium kimliğini bırakıyoruz.
function cleanUserAgent(userAgent) {
	return (userAgent || "")
		.replace(/\s(?:electron|kargo)\/[\w.+-]+/gi, "")
		.replace(/\s{2,}/g, " ")
		.trim();
}

function isSettingsPage(contents) {
	try {
		return /\/settings\.html$/i.test(new URL(contents.getURL()).pathname);
	} catch {
		return false;
	}
}

// Klavye kısayolları işletim sistemi genelinde değil, sadece Kargo odaktayken
// before-input-event ile yakalanır. Böylece başka süreçlerle çakışmazlar.
// Eşleme, ayarlar sayfasından özelleştirilebilen ShortcutStore'dan gelir.
function attachShortcutHandler(contents) {
	contents.on("before-input-event", (event, input) => {
		if (input.type !== "keyDown") return;

		// Ayarlar sayfası kısayol kaydediyorsa tuşu yakala ve arayüze bildir.
		if (shortcutRecording && mainWindow && contents === mainWindow.webContents) {
			if (!isSettingsPage(contents)) {
				shortcutRecording = false;
			} else {
				if (isModifierInput(input)) return;
				event.preventDefault();

				if (input.key === "Escape" || input.code === "Escape") {
					shortcutRecording = false;
					mainWindow.webContents.send("shortcut-captured", { cancel: true });
					return;
				}

				const keys = acceleratorFromInput(input);
				const check = keys
					? validateAccelerator(keys)
					: { valid: false, reason: "Bu tuş kullanılamıyor." };
				mainWindow.webContents.send("shortcut-captured", {
					keys,
					display: displayAccelerator(keys),
					valid: check.valid,
					reason: check.reason,
				});
				return;
			}
		}

		if (input.isAutoRepeat || !shortcutStore) return;

		const keys = acceleratorFromInput(input);
		if (!keys) return;

		const action = shortcutStore.actionFor(keys);
		if (!action) return;

		event.preventDefault();
		sendShortcutAction(action);
	});
}

// Web sayfalarındaki sağ tık menüsünü tarayıcı varsayılanı yerine Kargo'nun
// sade menüsüyle değiştiriyoruz. Rol (role) yerine doğrudan içerik üzerinde
// çalışıyoruz; böylece menü webview içinde de doğru hedefe uygulanır.
function buildContextMenu(contents, params) {
	const template = [];
	const history = contents.navigationHistory;
	const editFlags = params.editFlags || {};

	if (history.canGoBack()) {
		template.push({ label: "Geri", click: () => history.goBack() });
	}
	if (history.canGoForward()) {
		template.push({ label: "İleri", click: () => history.goForward() });
	}
	template.push({ label: "Yenile", click: () => contents.reload() });

	if (params.linkURL) {
		if (isWebUrl(params.linkURL)) {
			template.push(
				{ type: "separator" },
				{
					label: "Bağlantıyı yeni sekmede aç",
					click: () => openUrlInKargo(params.linkURL, false),
				},
				{
					label: "Bağlantıyı arka planda aç",
					click: () => openUrlInKargo(params.linkURL, true),
				},
				{
					label: "Bağlantı adresini kopyala",
					click: () => clipboard.writeText(params.linkURL),
				},
			);
		} else if (EXTERNAL_PROTOCOLS.has(protocolOf(params.linkURL))) {
			template.push(
				{ type: "separator" },
				{
					label: "Harici uygulamada aç",
					click: () => openExternal(params.linkURL),
				},
			);
		}
	}

	if (params.mediaType === "image" && params.srcURL) {
		template.push(
			{ type: "separator" },
			{
				label: "Resmi yeni sekmede aç",
				click: () => openUrlInKargo(params.srcURL, false),
			},
			{
				label: "Resim adresini kopyala",
				click: () => clipboard.writeText(params.srcURL),
			},
		);
	}

	if (params.isEditable) {
		template.push(
			{ type: "separator" },
			{
				label: "Kes",
				enabled: editFlags.canCut !== false,
				click: () => contents.cut(),
			},
			{
				label: "Kopyala",
				enabled: editFlags.canCopy !== false,
				click: () => contents.copy(),
			},
			{
				label: "Yapıştır",
				enabled: editFlags.canPaste !== false,
				click: () => contents.paste(),
			},
			{ label: "Tümünü seç", click: () => contents.selectAll() },
		);
	} else if ((params.selectionText || "").trim()) {
		template.push(
			{ type: "separator" },
			{ label: "Kopyala", click: () => contents.copy() },
		);
	}

	return template;
}

app.on("web-contents-created", (_event, contents) => {
	// target="_blank" / window.open istekleri yeni pencere yerine Kargo
	// sekmesine dönüşür. Arka plan istekleri sessizce arkada açılır.
	contents.setWindowOpenHandler(({ url, disposition, postBody }) => {
		const protocol = protocolOf(url);

		// Kargo adresleri yeni pencere yerine uygulama içinde açılır.
		if (protocol === "kargo:") {
			openKargoPage(url);
			return { action: "deny" };
		}

		if (EXTERNAL_PROTOCOLS.has(protocol)) {
			openExternal(url);
			return { action: "deny" };
		}

		if (isWebUrl(url)) {
			// POST verisi sekme URL'sine taşınamaz; form hedefli pencereler korunur.
			if (postBody) {
				return {
					action: "allow",
					overrideBrowserWindowOptions: POPUP_WINDOW_OPTIONS,
				};
			}
			openUrlInKargo(url, disposition === "background-tab");
			return { action: "deny" };
		}

		// OAuth benzeri akışlar boş bir pencere açıp sonra yönlendirir.
		// Bunları sekmeye çevirmek window.opener bağlantısını koparır.
		if (!url || url === "about:blank" || url.startsWith("about:blank#")) {
			return {
				action: "allow",
				overrideBrowserWindowOptions: POPUP_WINDOW_OPTIONS,
			};
		}

		return { action: "deny" };
	});

	// Kargo arayüzünün kendisi bir siteye gitmesin; site sekmede açılsın.
	contents.on("will-navigate", (event, legacyUrl) => {
		const targetUrl = event.url || legacyUrl || "";

		if (mainWindow && contents === mainWindow.webContents && isWebUrl(targetUrl)) {
			event.preventDefault();
			openUrlInKargo(targetUrl);
			return;
		}

		guardNavigation(contents, event, targetUrl);
	});

	// Ana çerçeve dışındaki (iframe) harici bağlantılar için.
	contents.on("will-frame-navigate", (event) => {
		if (event.isMainFrame) return;
		guardNavigation(contents, event, event.url || "");
	});

	contents.on("context-menu", (_event, params) => {
		// DevTools kendi varsayılan menüsünü kullansın.
		if (contents.getType() === "remote") return;

		const template = buildContextMenu(contents, params);
		if (!template.length) return;

		const targetWindow = BrowserWindow.getFocusedWindow() || mainWindow;
		const menu = Menu.buildFromTemplate(template);
		if (targetWindow) {
			menu.popup({ window: targetWindow });
		} else {
			menu.popup();
		}
	});

	// HTML5 video/oyun tam ekranı: misafir içerik pencereyi kaplar, arayüz gizlenir.
	let wasFullScreenBeforeGuest = false;
	contents.on("enter-html-full-screen", () => {
		if (contents.getType() !== "webview" || !mainWindow) return;
		wasFullScreenBeforeGuest = mainWindow.isFullScreen();
		mainWindow.setFullScreen(true);
	});
	contents.on("leave-html-full-screen", () => {
		if (contents.getType() !== "webview" || !mainWindow) return;
		if (!wasFullScreenBeforeGuest) mainWindow.setFullScreen(false);
		wasFullScreenBeforeGuest = false;
	});

	attachShortcutHandler(contents);
});

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1200,
		height: 820,
		minWidth: 900,
		minHeight: 650,
		title: "🚂🚋🚋 Kargo",
		show: false,
		frame: process.platform === "darwin",
		titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
		autoHideMenuBar: true,
		backgroundColor: "#111",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			spellcheck: false,
			webviewTag: true,
		},
	});

	// Webview'lar oluşturulmadan önce güvenli ve Kargo'ya uygun varsayılanlar.
	mainWindow.webContents.on("will-attach-webview", (_event, webPreferences) => {
		delete webPreferences.preload;
		webPreferences.nodeIntegration = false;
		webPreferences.nodeIntegrationInSubFrames = false;
		webPreferences.contextIsolation = true;
		webPreferences.sandbox = true;
		// PDF'ler Chromium'un yerleşik görüntüleyicisiyle açılabilsin.
		webPreferences.plugins = true;
		// Tarayıcı varsayılanı: kullanıcı etkileşimi olmadan ses/video başlamaz.
		webPreferences.autoplayPolicy = "document-user-activation-required";
	});

	// İlk kare hazır olana kadar pencereyi gösterme: beyaz ekran/boş pencere
	// yanıp sönmesini önler ve uygulama daha hızlı açılmış gibi görünür.
	mainWindow.once("ready-to-show", () => mainWindow.show());

	if (process.platform !== "darwin") {
		mainWindow.setMenuBarVisibility(false);
	}

	mainWindow.loadFile(path.join(__dirname, "pages", "index.html"));

	// Open DevTools only in development
	if (process.env.DEBUG || process.env.NODE_ENV === "development") {
		mainWindow.webContents.openDevTools();
	}

	// Klavye kısayolları web-contents-created içinde bağlanıyor.
}

ipcMain.handle("window-control", (_, action) => {
	if (!mainWindow || mainWindow.isDestroyed()) return;

	switch (action) {
		case "minimize":
			mainWindow.minimize();
			break;
		case "maximize":
			mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
			break;
		case "close":
			mainWindow.close();
			break;
		case "toggle-fullscreen":
			mainWindow.setFullScreen(!mainWindow.isFullScreen());
			break;
		default:
			break;
	}
});

// Sekme arayüzü olmayan Kargo sayfalarında (ana sayfa, ayarlar, hakkında)
// zoom kısayolları doğrudan pencere içeriğine uygulanır.
ipcMain.handle("chrome-zoom", (_, action) => {
	if (!mainWindow || mainWindow.isDestroyed()) return;

	const contents = mainWindow.webContents;
	const current = contents.getZoomLevel();
	let level = current;

	if (action === "zoomIn") {
		level = Math.min(ZOOM_MAX_LEVEL, current + ZOOM_STEP);
	} else if (action === "zoomOut") {
		level = Math.max(ZOOM_MIN_LEVEL, current - ZOOM_STEP);
	} else if (action === "zoomReset") {
		level = 0;
	}

	contents.setZoomLevel(level);
});

// Geliştirici araçları: sekme görünümü dışındaki sayfalarda pencere
// arayüzünü denetlemek için ayrı pencerede aç/kapat.
ipcMain.handle("toggle-devtools", () => {
	if (!mainWindow || mainWindow.isDestroyed()) return;

	const contents = mainWindow.webContents;
	if (contents.isDevToolsOpened()) {
		contents.closeDevTools();
	} else {
		contents.openDevTools({ mode: "detach" });
	}
});

// Adres alanına yazılan mailto:/tel: gibi adresleri işletim sisteminde aç.
ipcMain.handle("open-external", (_, url) => {
	if (EXTERNAL_PROTOCOLS.has(protocolOf(url))) {
		openExternal(url);
	}
});

// Ayarlar sayfası kısayolları buradan okuyup değiştirir.
ipcMain.handle("shortcuts:list", () => {
	return shortcutStore ? shortcutStore.list() : [];
});

ipcMain.handle("shortcuts:set", (_, { id, keys } = {}) => {
	if (!shortcutStore) return { ok: false, error: "Kısayollar yüklenmedi." };
	const result = shortcutStore.set(id, keys);
	if (result.ok) {
		// Sekme görünümü açıksa kaydetme sırasında kısayollar hemen geçerli olur.
		shortcutRecording = false;
	}
	return result;
});

ipcMain.handle("shortcuts:reset", (_, id = null) => {
	if (!shortcutStore) return { ok: false, list: [] };
	return shortcutStore.reset(id);
});

ipcMain.handle("shortcuts:record", (_, active) => {
	shortcutRecording = Boolean(active);
	return { recording: shortcutRecording };
});

// İkinci bir uygulama örneği açılmasını engelle: her örnek ayrı Chromium
// süreçleri ve bellek tüketir; ayrıca pencere çoğalmasını önler.
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
	app.quit();
} else {
	app.on("second-instance", () => {
		if (!mainWindow || mainWindow.isDestroyed()) {
			createWindow();
			return;
		}
		if (mainWindow.isMinimized()) mainWindow.restore();
		mainWindow.show();
		mainWindow.focus();
	});

	app.whenReady().then(() => {
		const userAgent = cleanUserAgent(app.userAgentFallback);
		if (userAgent) {
			app.userAgentFallback = userAgent;
			// Sekmelerin kullandığı oturumun UA'sını da garanti altına al.
			session.fromPartition("persist:kargo").setUserAgent(userAgent);
		}

		// Kullanıcı tanımlı kısayollar userData altında saklanır.
		shortcutStore = new ShortcutStore(
			path.join(app.getPath("userData"), "shortcuts.json"),
		);

		createWindow();
	});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});

	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") {
			app.quit();
		}
	});
}
