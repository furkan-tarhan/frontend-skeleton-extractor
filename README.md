# frontend-skeleton-extractor

Bir URL'den **öğrenilebilir frontend iskeleti** çıkarır: layout landmarks, UI pattern'leri, tasarım token'ları, skeleton HTML ve isteğe bağlı **React + Tailwind starter proje**.

Site klonu üretmez. Amaç: referans alıp **kendi arayüzünü yeniden kurmak**.

---

## Ne üretir?

`./out/<host>/` altında:

| Dosya / klasör | Ne işe yarar |
|----------------|--------------|
| `ai-brief.json` / `ai-brief.md` | AI'a verilecek öz özet (layout + design decisions) |
| `patterns-summary.json` | Tanınan UI pattern'leri + `unrecognized` sayısı |
| `outline.txt` | Pattern listesi + yapı ağacı (okunabilir) |
| `structure.json` | Landmark ağacı (bounds, pattern, textSample) |
| `tokens.json` | Font, renk, spacing, radius örnekleri |
| `skeleton.html` | Script'siz, placeholder'lı yapısal HTML |
| `screenshot.png` | Tam sayfa görüntü |
| `palette.json` | Baskın renkler (Vibrant vb.) |
| `rendered.html` | Ham render DOM (sadece referans) |
| `scaffold/` | `--scaffold` ile: çalıştırılabilir React+Vite+Tailwind iskeleti |

---

## Kurulum

```bash
npm install
```

İlk çalıştırmada Puppeteer Chrome indirmesi gerekebilir:

```bash
npx puppeteer browsers install chrome
```

---

## Kullanım

```bash
# Temel extract
node src/extractor.js --url https://example.com

# Pattern + scaffold (React + Tailwind starter)
node src/extractor.js --url https://example.com --scaffold
node src/extractor.js --url https://example.com --scaffold --framework react

# Config ile
node src/extractor.js --config example-config.json
```

### CLI seçenekleri

| Flag | Açıklama |
|------|----------|
| `--url` / `-u` | Hedef URL |
| `--scaffold` | `out/<host>/scaffold/` altında React+Tailwind proje üret |
| `--framework react` | Scaffold framework (şimdilik sadece `react`) |
| `--out ./out` | Çıktı kökü |
| `--width` / `--height` | Viewport (varsayılan 1440×900) |
| `--wait 1500` | Render sonrası ekstra bekleme (ms) |
| `--force` | Config kilidini bypass eder |
| `--config` | JSON config dosyası |

---

## Pattern tanıma

Her landmark için mümkünse bir pattern atanır (`hero`, `navigation`, `faq-accordion`, `info-block`, …).  
Gerçek sinyali olmayanlar `pattern: null` kalır — fallback kovalarla `unrecognized` yapay olarak sıfırlanmaz.

---

## Scaffold

`--scaffold` sonrası:

```bash
cd out/<host>/scaffold
npm install
npm run dev
```

- Her landmark → boş ama isimlendirilmiş component (`Hero.jsx`, `FaqAccordion.jsx`, `Section01.jsx`, …)
- `tailwind.config.js` ← `tokens.json` + `palette.json` (renk / font / spacing / radius)
- `App.jsx` ← landmark sırasına göre bileşenler
- İçerik **placeholder**; orijinal site metni/görseli kopyalanmaz

`borderRadius`: yüzde değerler `circle`, pill/köşe px değerleri `sm` / `lg` / `xl` — uydurma `md` yok.

---

## AI brief

Her extract sonrası `ai-brief.json` + `ai-brief.md` üretilir: ham DOM/CSS yok; sadece layout akışı, component amaçları ve design system özeti (~birkaç KB). Claude / ChatGPT / Cursor'a bu dosyayı vermen yeterli.

## Nasıl kullanılır?

1. Hedef siteyi çıkar (`--scaffold` önerilir).
2. `ai-brief.md` (veya `.json`) dosyasını AI asistanına ver.
3. İstersen `scaffold/` içinde `npm install && npm run dev` ile boş projeyi aç.
4. Kendi içeriğini ve markanı koy — birebir kopyalama.

---

## Notlar

- JS ile render olan siteler için Puppeteer kullanılır.
- Bazı sitelerde footer DOM'da hiç olmayabilir; bu durumda pattern atanamaz.
- Cloudflare / bot koruması extract'ı engelleyebilir.
- Hedef sitenin ToS / robots.txt kurallarına uy.
- Opsiyonel eski helper: `npm run purge`

## Lisans

MIT
