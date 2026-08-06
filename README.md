# frontend-skeleton-extractor

Bir URL'den **öğrenilebilir frontend iskeleti** çıkarır: layout yapısı, tasarım token'ları ve düzenlenebilir skeleton HTML.

Bu araç site klonu üretmez. Amaç: referans alıp **kendi arayüzünü yeniden kurmak**.

---

## Ne üretir?

`./out/<host>/` altında:

| Dosya | Ne işe yarar |
|--------|----------------|
| `outline.txt` | Sayfa bölümlerinin okunabilir haritası |
| `structure.json` | Header / hero / grid / footer ağacı |
| `tokens.json` | Font, renk, spacing, radius örnekleri |
| `skeleton.html` | Script'siz, placeholder'lı yapısal HTML |
| `screenshot.png` | Tam sayfa görüntü |
| `palette.json` | Baskın renkler |
| `rendered.html` | Ham render DOM (sadece referans) |

---

## Kurulum

```bash
npm install
```

## Kullanım

```bash
# Hızlı (önerilen)
node src/extractor.js --url https://example.com

# Config ile
node src/extractor.js --config example-config.json
```

Opsiyonlar:
- `--out ./out` çıktı klasörü
- `--width 1440` / `--height 900` viewport
- `--wait 1500` render sonrası ekstra bekleme (ms)
- `--force` config kilidini bypass eder

---

## Nasıl kullanılır? (senin hedefin)

1. Hedef siteyi çıkar.
2. `outline.txt` + `tokens.json` ile yapıyı ve stili anla.
3. `skeleton.html`'i **başlangıç referansı** olarak kullan.
4. Kendi component'lerini, içeriğini ve markanı kur — birebir kopyalama.

---

## Notlar

- JS ile render olan siteler için Puppeteer kullanılır.
- Hedef sitenin ToS / robots.txt kurallarına uy.
- Eski CSS purge helper hâlâ var: `npm run purge` (opsiyonel).

## Lisans

MIT
