# frontend-skeleton-extractor

This repository contains a safe, configurable starter toolset that helps you extract a "frontend skeleton" from any public website for learning, prototyping and design-reference purposes. The toolset collects a static copy of a site (HTML + assets), takes a screenshot to extract a color palette, and provides a helper to reduce CSS to only the used rules. IMPORTANT: the scripts are intentionally disabled by default for live downloads — you must enable them in the config to avoid accidental scraping.

---

## Türkçe / Turkish

Bu depo, herhangi bir kamuya açık web sitesinden "frontend iskeleti" çıkarmaya yardımcı olacak güvenli ve yapılandırılabilir bir başlangıç araç seti sağlar. Amaç: tasarım referansı, renk paleti analizi ve statik iskelet oluşturma için hızlı bir araç sağlamaktır. Lütfen canlı siteleri taramadan önce hedef sitenin kullanım şartlarını ve robots.txt kurallarını kontrol edin.

Ana özellikler
- Siteyi statik olarak indiren (HTML + CSS + görseller) örnek bir entegrasyon (website-scraper).
- Sayfanın ekran görüntüsünü alan ve resimden baskın renk paletini çıkaran örnek (node-vibrant).
- İndirilen CSS dosyalarından kullanılmayan kuralları temizleyip küçük bir stylesheet üreten örnek (PurgeCSS).
- Güvenlik/etik nedeniyle canlı indirmenin aktivasyonunu zorunlu yapan config mekanizması.

Önemli not — lütfen bunu kötü amaçla kullanmayın
- Bu araç, herhangi bir kamuya açık siteyi indirip analiz etme kabiliyeti sağlar. Bir siteyi çekmeden önce daima:
  1) Hedef sitenin Terms of Service (ToS) / kullanım koşullarını kontrol edin,
  2) robots.txt ve site politikasını inceleyin,
  3) Aşırı trafik göndermemek için isteği sınırlayın ve gerektiğinde site sahibiyle iletişime geçin.

Hızlı başlangıç (örnek kullanım)
1. Repo'yu klonlayın:
   git clone https://github.com/furkan-tarhan/frontend-skeleton-extractor.git
2. Kurulum:
   cd frontend-skeleton-extractor
   npm install

3. example-config.json dosyasını açın ve içeriği düzenleyin. Varsayılan olarak canlı indirme kapalıdır ("allow_live_download": false).

4. Hazır olduğunuzda, config içindeki "allow_live_download": true yapın ve hedef URL'yi ayarlayın. (Canlı site taramayı etkinleştirmeden önce site izinlerini kontrol edin.)

5. Çalıştırma (konfigürasyon dosyasıyla):
   node src/extractor.js --config example-config.json

Çıktılar:
- ./out/<site-host>/  dizini içinde indirilen statik dosyalar (HTML, CSS, görseller)
- ./out/<site-host>/screenshot.png  — sayfanın ekran görüntüsü
- ./out/<site-host>/palette.json  — node-vibrant çıktısı (baskın renk paleti)
- ./out/<site-host>/purged.css  — purge edilmiş CSS (isteğe bağlı olarak collect-styles çalıştırılınca)

Teknik detaylar
- Bu proje örnek amaçlıdır; production düzeyinde hata kontrolleri ve dinamik JS durumunun (SPA state) geri kazanılması için ek çalışma gerekir.
- Scriptler config içinde açıkça izin verilene kadar canlı download yapmaz. Varsayılan config güvenlik önlemi içerir.

Yardım / SSS
- Q: Hedef siteyi analiz etmek yasal mı? A: Siteye bağlı. Her zaman ToS ve robots.txt kontrol edin; telif, marka veya kullanıcı verisi içeren içerikleri izinsiz kullanmayın.
- Q: SPA (React/Vue) uygulamalarının JS kaynaklarını geri getirebilir miyim? A: Genelde hayır — üretim bundle’ları minify ve bundle edilir. Eğer source map açıksa o zaman kısmen geri alınabilir (ama dikkat: etik/yasal sorunlar olabilir).

Katkıda bulunma
- İyileştirmeler ve hata düzeltmeleri için Pull Request açabilirsiniz. Lütfen testleri ve açıklamaları ekleyin.

Lisans
- MIT

---

## English

This repository provides a safe, configurable starter toolset to help you extract a "frontend skeleton" from a public website for learning, prototyping and design-reference tasks. The tools create a static copy of a site (HTML + assets), capture a screenshot to extract a color palette, and include a helper to minimize CSS to only the used rules. IMPORTANT: live download is disabled by default — you must explicitly enable it in the config file to run any scraping.

Main features
- Example integration to download a site (HTML + CSS + images) using website-scraper.
- Screenshot + color palette extraction using node-vibrant.
- CSS purging example using PurgeCSS to reduce downloaded CSS to only used rules.
- Safety mechanism: live downloads are disabled unless explicitly enabled in the config.

Safety / Legal Reminder
- This tool grants the ability to download and analyze public websites. Always:
  1) Check the target site's Terms of Service,
  2) Check robots.txt and site policies,
  3) Avoid heavy traffic and contact the site owner if you plan repeated/large downloads.

Quick start (example usage)
1. Clone the repo:
   git clone https://github.com/furkan-tarhan/frontend-skeleton-extractor.git
2. Install dependencies:
   cd frontend-skeleton-extractor
   npm install

3. Edit example-config.json. By default live download is OFF ("allow_live_download": false).

4. When ready, set "allow_live_download": true in the config and provide a target URL. (Verify site permissions first.)

5. Run (with config file):
   node src/extractor.js --config example-config.json

Outputs
- ./out/<site-host>/  — the downloaded static files (HTML, CSS, images)
- ./out/<site-host>/screenshot.png  — a screenshot taken with Puppeteer
- ./out/<site-host>/palette.json  — extracted color palette by node-vibrant
- ./out/<site-host>/purged.css  — the minimized CSS after running collect-styles.js

Technical notes
- This is an example starter. Production usage requires more error handling, rate limiting and possibly authentication handling.
- Reconstructing original SPA source (React/Vue source files) is usually not possible from bundles. Source maps, if publicly available, may help but may have legal/ethical implications.

FAQ
- Q: Is it legal to analyze a website? A: Depends on the website. Check ToS and robots.txt; do not scrape protected/personal data.
- Q: Can I automatically convert a downloaded site into a React project? A: You can scaffold one, but recovering original component structure is not automatic. Use the downloaded HTML/CSS as reference for a fresh implementation.

Contributing
- Pull requests welcome. Add tests and explain changes.

License
- MIT
