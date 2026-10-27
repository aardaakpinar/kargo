// index.html kabuğunu başlatır: kenar çubuğunun ilk durumunu uygular ve
// adres çubuğundaki #hash'e göre ilk görünümü yükler. Tüm betikler
// (sidebar, bookmarks, görünüm modülleri) yüklendikten sonra en son çalışır.
(function () {
	const body = document.body;

	// İlk karede panelin açık/kapalı sıçramasını önlemek için sınıfı hemen uygula.
	if (window.kargoSettings && !window.kargoSettings.get().showTabBar) {
		body.classList.add("sidebar-collapsed");
	}

	if (window.kargoRouter) {
		window.kargoRouter.start();
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(() => body.classList.add("sidebar-ready"));
	});
})();
