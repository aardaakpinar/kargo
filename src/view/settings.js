// Ayarlar görünümü. views/settings.html parçası #app-view içine yüklendiğinde
// router tarafından mount edilir; görünümden çıkılırken döndürülen cleanup
// çalışır (bekleyen kayıtları tamamlar, dinleyicileri ve zamanlayıcıları bırakır).
(function () {
	function mount(root) {
		const themeSelect = root.querySelector("#themeSelect");
		const searchEngineSelect = root.querySelector("#searchEngineSelect");
		const homepageInput = root.querySelector("#homepageInput");
		const historyToggle = root.querySelector("#historyToggle");
		const tabBarToggle = root.querySelector("#tabBarToggle");
		const zoomSelect = root.querySelector("#zoomSelect");
		const clearHistoryBtn = root.querySelector("#clearHistoryBtn");
		const shortcutsList = root.querySelector("#shortcutsList");

		const savedSettings = window.kargoSettings.get();

		themeSelect.value = savedSettings.theme;
		searchEngineSelect.value = savedSettings.searchEngine;
		homepageInput.value = savedSettings.homepage;
		historyToggle.checked = savedSettings.saveHistory;
		tabBarToggle.checked = savedSettings.showTabBar;
		zoomSelect.value = savedSettings.defaultZoom;

		function readSettingsForm() {
			return {
				theme: themeSelect.value,
				searchEngine: searchEngineSelect.value,
				homepage: homepageInput.value,
				saveHistory: historyToggle.checked,
				showTabBar: tabBarToggle.checked,
				defaultZoom: zoomSelect.value,
			};
		}

		const autosaveStatus = root.querySelector("#autosaveStatus");
		const autosaveBar = autosaveStatus ? autosaveStatus.closest(".settings-autosave") : null;
		let autosaveTimer = null;

		function markAutoSaved() {
			if (!autosaveStatus) return;
			autosaveStatus.textContent = "Kaydedildi";
			if (autosaveBar) autosaveBar.classList.add("saved");

			if (autosaveTimer) clearTimeout(autosaveTimer);
			autosaveTimer = setTimeout(() => {
				autosaveStatus.textContent = "";
				if (autosaveBar) autosaveBar.classList.remove("saved");
				autosaveTimer = null;
			}, 2000);
		}

		function persistSettings() {
			const saved = window.kargoSettings.save(readSettingsForm());
			markAutoSaved();
			return saved;
		}

		themeSelect.addEventListener("change", () => {
			window.kargoSettings.applyTheme(themeSelect.value);
			persistSettings();
		});

		[searchEngineSelect, historyToggle, tabBarToggle, zoomSelect].forEach((field) => {
			field.addEventListener("change", persistSettings);
		});

		// Kenar çubuğu anahtarı bu sayfada da anında uygulanır.
		tabBarToggle.addEventListener("change", () => {
			document.body.classList.toggle("sidebar-collapsed", !tabBarToggle.checked);
			document.body.classList.remove("sidebar-peek");
		});

		// Adres alanında her tuş vuruşunda değil, yazma bitince kaydet.
		let homepageSaveTimer = null;
		function flushHomepageSave() {
			if (homepageSaveTimer) {
				clearTimeout(homepageSaveTimer);
				homepageSaveTimer = null;
			}
			return persistSettings();
		}

		homepageInput.addEventListener("input", () => {
			if (homepageSaveTimer) clearTimeout(homepageSaveTimer);
			homepageSaveTimer = setTimeout(() => {
				homepageSaveTimer = null;
				persistSettings();
			}, 500);
		});

		homepageInput.addEventListener("change", () => {
			homepageInput.value = flushHomepageSave().homepage;
		});

		const settingsToast = root.querySelector("#settingsToast");
		let settingsToastTimer = null;

		function showToast(message) {
			if (!settingsToast) return;

			settingsToast.textContent = message;
			settingsToast.classList.add("show");

			if (settingsToastTimer) clearTimeout(settingsToastTimer);
			settingsToastTimer = setTimeout(() => {
				settingsToast.classList.remove("show");
				settingsToastTimer = null;
			}, 2500);
		}

		function refreshClearHistoryState() {
			if (!clearHistoryBtn) return;
			const history = window.kargoSettings.getHistory();
			clearHistoryBtn.disabled = !Array.isArray(history) || !history.length;
		}

		refreshClearHistoryState();

		clearHistoryBtn.addEventListener("click", () => {
			window.kargoSettings.clearHistory();
			refreshClearHistoryState();
			showToast("Gezi geçmişi temizlendi.");
		});

		const shortcutResetAll = root.querySelector("#shortcutResetAll");
		const shortcutApi = window.kargo && window.kargo.shortcuts ? window.kargo.shortcuts : null;

		let shortcutEntries = [];
		let recordingShortcutId = null;
		let offCaptured = null;
		let disposed = false;

		function onDocumentClick() {
			if (recordingShortcutId) stopRecordingShortcut();
		}

		// Preload API'si yoksa (ör. dosya tarayıcıda açıldıysa) salt okunur liste.
		const fallbackShortcuts = [
			{ id: "createTab", description: "Yeni sekme aç", display: "Ctrl + T" },
			{ id: "closeTab", description: "Sekmeyi kapat", display: "Ctrl + X" },
			{ id: "toggleTabBar", description: "Kenar çubuğunu göster/gizle", display: "Ctrl + B" },
			{ id: "toggleBookmark", description: "Sayfayı yer imlerine ekle/kaldır", display: "Ctrl + D" },
			{ id: "prevTab", description: "Önceki sekme", display: "Ctrl + Shift + Tab" },
			{ id: "nextTab", description: "Sonraki sekme", display: "Ctrl + Tab" },
			{ id: "lastTab", description: "Son sekmeye geç", display: "Ctrl + 9" },
			{ id: "goBack", description: "Geri git", display: "Ctrl + ←" },
			{ id: "goForward", description: "İleri git", display: "Ctrl + →" },
			{ id: "goHome", description: "Ana sayfaya git", display: "Ctrl + Shift + H" },
			{ id: "goSettings", description: "Ayarlar sayfasını aç", display: "Ctrl + Shift + S" },
			{ id: "goHistory", description: "Geçmiş sayfasına git", display: "Ctrl + H" },
			{ id: "goAbout", description: "Hakkında sayfası", display: "Ctrl + Shift + A" },
			{ id: "refresh", description: "Sayfayı yenile", display: "Ctrl + R" },
			{ id: "refreshF5", description: "Sayfayı yenile (F5)", display: "F5" },
			{ id: "toggleDevTools", description: "Geliştirici araçlarını aç/kapat", display: "F12" },
			{ id: "focusSearch", description: "Arama alanına odaklan", display: "Ctrl + K" },
			{ id: "zoomIn", description: "Yakınlaştır", display: "Ctrl + +" },
			{ id: "zoomOut", description: "Uzaklaştır", display: "Ctrl + -" },
			{ id: "zoomReset", description: "Yakınlaştırmayı sıfırla", display: "Ctrl + 0" },
			{ id: "minimize", description: "Pencereyi küçült", display: "Ctrl + M" },
			{ id: "maximize", description: "Pencereyi büyüt", display: "Ctrl + Shift + M" },
			{ id: "closeApp", description: "Uygulamayı kapat", display: "Ctrl + Q" },
		].map((entry) => ({ ...entry, keys: "fallback", isDefault: true }));

		function renderShortcuts() {
			if (disposed || !shortcutsList) return;
			shortcutsList.innerHTML = "";

			// 1-9 arası sekme kısayolları çalışmaya devam eder ama ayarlar
			// listesini kalabalıklaştırmasın diye burada gizlenir.
			shortcutEntries
				.filter((entry) => !/^selectTab\d+$/.test(entry.id))
				.forEach((entry) => {
					const item = document.createElement("li");
					item.className = "shortcut-row";
					item.dataset.id = entry.id;

					const description = document.createElement("span");
					description.className = "shortcut-desc";
					description.textContent = entry.description;

					const controls = document.createElement("div");
					controls.className = "shortcut-controls";

					const keyButton = document.createElement("button");
					keyButton.type = "button";
					keyButton.className = "shortcut-key";

					const isRecording = recordingShortcutId === entry.id;
					if (isRecording) {
						keyButton.classList.add("recording");
						keyButton.textContent = "Tuşlara bas…";
						keyButton.title = "İptal için Esc";
					} else {
						if (!entry.keys) keyButton.classList.add("unassigned");
						keyButton.textContent = entry.display || "Atanmadı";
						keyButton.title = "Değiştirmek için tıkla";
					}
					keyButton.disabled = !shortcutApi;
					keyButton.addEventListener("click", (event) => {
						// Belgeye yayılan tıklama kaydı hemen iptal etmesin.
						event.stopPropagation();
						beginRecordingShortcut(entry.id);
					});

					const resetButton = document.createElement("button");
					resetButton.type = "button";
					resetButton.className = "shortcut-reset";
					resetButton.textContent = "↺";
					resetButton.title = "Varsayılana döndür";
					resetButton.disabled = !shortcutApi || entry.isDefault;
					resetButton.addEventListener("click", (event) => {
						event.stopPropagation();
						resetShortcut(entry.id);
					});

					controls.append(keyButton, resetButton);
					item.append(description, controls);
					shortcutsList.appendChild(item);
				});
		}

		async function beginRecordingShortcut(id) {
			if (!shortcutApi) return;
			recordingShortcutId = id;
			renderShortcuts();
			try {
				await shortcutApi.record(true);
			} catch {
				recordingShortcutId = null;
				renderShortcuts();
			}
		}

		async function stopRecordingShortcut() {
			recordingShortcutId = null;
			try {
				if (shortcutApi) await shortcutApi.record(false);
			} catch {
				// Pencere kapanıyorsa yoksay.
			}
			renderShortcuts();
		}

		async function resetShortcut(id) {
			if (!shortcutApi) return;
			const result = await shortcutApi.reset(id);
			if (result && result.list) shortcutEntries = result.list;
			renderShortcuts();
		}

		async function handleCapturedShortcut(payload) {
			if (!recordingShortcutId) return;

			if (!payload || payload.cancel) {
				await stopRecordingShortcut();
				return;
			}
			if (!payload.valid) {
				await stopRecordingShortcut();
				return;
			}

			const result = await shortcutApi.set(recordingShortcutId, payload.keys);
			recordingShortcutId = null;
			await shortcutApi.record(false);

			if (!result || !result.ok) {
				renderShortcuts();
				return;
			}

			if (Array.isArray(result.list)) shortcutEntries = result.list;
			renderShortcuts();
		}

		if (shortcutApi) {
			offCaptured = shortcutApi.onCaptured((payload) => {
				handleCapturedShortcut(payload).catch(() => {
					recordingShortcutId = null;
					renderShortcuts();
				});
			});
			shortcutApi
				.list()
				.then((list) => {
					shortcutEntries = Array.isArray(list) ? list : [];
					renderShortcuts();
				})
				.catch(() => {
					shortcutEntries = fallbackShortcuts;
					renderShortcuts();
				});
			shortcutApi.record(false);

			// Kayıt sırasında görünümden çıkılırsa varsayılan kısayollar geri gelsin
			// (cleanup içinde yapılır).
			document.addEventListener("click", onDocumentClick);
		} else {
			shortcutEntries = fallbackShortcuts;
			renderShortcuts();
			shortcutResetAll.disabled = true;
		}

		shortcutResetAll.addEventListener("click", async () => {
			if (!shortcutApi) return;
			const result = await shortcutApi.reset();
			if (result && result.list) shortcutEntries = result.list;
			renderShortcuts();
		});

		return function cleanup() {
			disposed = true;

			// Sayfadan çıkarken bekleyen yazımı tamamla.
			if (homepageSaveTimer) flushHomepageSave();
			if (autosaveTimer) clearTimeout(autosaveTimer);
			if (settingsToastTimer) clearTimeout(settingsToastTimer);

			document.removeEventListener("click", onDocumentClick);
			if (typeof offCaptured === "function") offCaptured();
			recordingShortcutId = null;
			if (shortcutApi) shortcutApi.record(false);
		};
	}

	if (window.kargoRouter) {
		window.kargoRouter.register("settings", { mount });
	}
})();
