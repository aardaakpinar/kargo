<p align="center">
  <img width="200px" src="https://i.imgur.com/XfHbapN.png" />
  <h1 align="center">Kargo</h1>
</p>

<p align="center">
  Neredeyse hiç kullanıcı arayüzü olmayan bir tarayıcı.
</p>

Kargo, internette yaşayan ve fareden nefret eden insanlar için bir tarayıcıdır. Kargo, sadece birkaç klavye kısayolu kullanılarak kontrol edilebilir. Kargo, bir tarayıcının sadece en kullanışlı özelliklerini içerir; bu sayede internette gezinirken gereksiz özellikler sizi rahatsız edemez. Kargo'yu geliştirdim çünkü tercih ettiğim tarayıcıların (Chrome ve Firefox) sahip olduğu çoğu özelliği kullanmıyordum.

Kargo henüz çok erken aşamadadır ancak şimdiden kullanılabilir durumdadır; lütfen geliştirmeme yardımcı olun.

Denemek veya yüklemek için önceden derlenmiş [sürümlerimizden (binaries)](https://github.com/aardaakpinar/kargo/releases/latest) birini kullanabilirsiniz.

## Özellikler

- **Chrome**: Kargo, gücünü Chromium'dan alan Electron'un webview etiketlerini kullanır.
- **Kenar çubuğu**: Zen gibi sol tarafta kompakt bir kenar çubuğu; sekmeler ve yer imleri orada durur. Gizlediğinde sol kenara gelince yüzen panel olarak açılır.
- **Yer imleri**: `Ctrl + D` ile sayfayı ekle/kaldır, kenar çubuğunda sürükleyerek sırala, ana sayfada hızlıca eriş.
- **Geliştirici Araçları**: Kargo, Chrome'un geliştirici araçlarını tam olarak destekler.
- **Platformlar arası**: Kargo tüm platformlarda iyi görünür, Windows'taki başlık çubuğu bile şık durur.
- **Basit**: Kargo sadece çoğu insanın ihtiyaç duyduğu özelliklere sahiptir.
- **Sekme Kurtarma**: Kargo, açıldığında önceden açık olan sekmelerinizi otomatik olarak geri yükler.
- **Çok şirin**: 🚂🚋🚋 Kargo (web'i evinize taşır).

## Ekran Görüntüleri

##### Windows üzerinde Kargo ana sayfası

![Home](./docs/screenshot/cargo_home.png)

##### Duckduckgo (varsayılan arama motoru)

![DDG](./docs/screenshot/cargo_ddg.png)

##### Windows üzerinde Kargo hakkında sayfası

![About](./docs/screenshot/cargo_about.png)

## Klavye Kısayolları

<table>
    <tr>
        <td class="shortcut">Ctrl + T</td>
        <td>Yeni sekme aç</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + W</td>
        <td>Mevcut sekmeyi kapat</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + B</td>
        <td>Kenar çubuğunu göster/gizle</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + D</td>
        <td>Sayfayı yer imlerine ekle/kaldır</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + Shift + Tab</td>
        <td>Önceki sekme</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + Tab</td>
        <td>Sonraki sekme</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + 1 … 8</td>
        <td>İlgili sekmeye geç</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + 9</td>
        <td>Son sekmeye geç</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + ←</td>
        <td>Geri git</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + →</td>
        <td>İleri git</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + Shift + H</td>
        <td>Ana sayfaya git</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + ,</td>
        <td>Ayarlar sayfasını aç</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + H</td>
        <td>Geçmiş sayfasını aç</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + Shift + A</td>
        <td>Hakkında sayfasını aç</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + R / F5</td>
        <td>Sayfayı yenile</td>
    </tr>
    <tr>
        <td class="shortcut">F12</td>
        <td>Geliştirici araçlarını aç/kapat</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + K</td>
        <td>Arama alanına odaklan</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + =</td>
        <td>Yakınlaştır</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + -</td>
        <td>Uzaklaştır</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + 0</td>
        <td>Yakınlaştırmayı sıfırla</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + M</td>
        <td>Pencereyi küçült</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + Shift + M</td>
        <td>Pencereyi büyüt</td>
    </tr>
    <tr>
        <td class="shortcut">Ctrl + Q</td>
        <td>Uygulamayı kapat</td>
    </tr>
</table>

Kısayolları **Ayarlar → Kısayollar** bölümünden değiştirebilirsin: bir kısayola tıklayıp yeni tuş kombinasyonuna bas. `Esc` kaydı iptal eder, `↺` tek kısayolu, "Varsayılanlara dön" ise tümünü sıfırlar. Tüm kısayollar `Ctrl` ile başlar; yalnızca `F5` ve `F12` bu kuralın dışındadır.

## Gelecek

Kargo hala geliştirilme aşamasındadır, ancak hayallerimizdeki tarayıcıyı yapmak için birlikte çalışabiliriz.

## License

Idea inspired by [cargo](https://github.com/herber/cargo)

[The steamlocomotive logo](https://github.com/twitter/twemoji/blob/gh-pages/svg/1f682.svg) by [twemoji](https://github.com/twitter/twemoji) is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

MIT License © [Arda](http://aardaakpinar.github.io)
