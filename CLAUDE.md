# SMM Pro

## Amaç

Türkiye'de serbest meslek hekiminin (dahiliye uzmanı) muayenehane muhasebesini tutması. SMM kayıtları, gider takibi, KDV hesabı, yıllık gelir vergisi tahmini, mali müşavir için Excel/PDF export.

## Vergi Statüsü

Şahsi serbest meslek, Serbest Meslek Makbuzu (SMM) keser. Kısmi KDV mükellefi (muayene/kontrol KDV muaf [KDVK 17/1-d], tetkik/işlem %10 KDV). Stopaj YOK (sadece bireysel hasta). Yıllık gelir vergisi beyanı verir.

## Teknoloji

- Vanilla JS + HTML + CSS (framework yok)
- PWA: manifest.json + service-worker.js (offline çalışır)
- Firebase Realtime Database (3 cihazda gerçek zamanlı sync: Windows, iMac, telefon)
- Firebase Storage (belge/fatura fotoğrafları için, otomatik sıkıştırmalı yükleme)
- Firebase Anonymous Auth (tek kullanıcı, basit)
- GitHub Pages hosting
- Excel export: SheetJS, PDF export: jsPDF + autoTable
- Tema: Defter 360 — sıcak bej arka plan, koyu kahverengi vurgular, klasik defter hissi

## Veri Modeli

### gelirler koleksiyonu
- id, smmNo (otomatik artan, 1'den başlar, atlamasız)
- tarih (YYYY-MM-DD)
- hastaAdi (opsiyonel)
- hizmetTipi: muayene | kontrol | tetkik | islem | diger
- kdvDurumu: muaf | "10" | "20"
- toplamTutar (KDV dahil, kullanıcı bunu girer)
- brutTutar (KDV hariç, sistem hesaplar)
- kdvTutari (sistem hesaplar)
- odemeSekli: nakit | kart | havale
- notlar
- olusturmaTarihi

### giderler koleksiyonu
- id, tarih
- kategori: kira | elektrik | su | dogalgaz | internet | telefon | personel | sgk | sarf | tibbi_malzeme | demirbas | musavir | vergi | diger
- tedarikci, belgeTipi (fatura/fis/makbuz/belgesiz), belgeNo
- brutTutar (KDV dahil), kdvOrani (0/1/10/20), kdvTutari, netTutar
- belgeFotoUrl (Firebase Storage URL'i, opsiyonel)
- notlar, olusturmaTarihi

### ayarlar (tek kayıt)
- sonSmmNo, varsayilanKdvOranlari, vadeHatirlatma, isimUnvan, vergiNo, adres

## 5 Ana Ekran

1. Dashboard: aylık metrikler (brüt gelir, tahsil KDV, gider, net kar), yıllık kümülatif, vade hatırlatmaları, hızlı butonlar
2. Gelir Girişi: KDV dahil tutar girilir, sistem ayrıştırır; SMM no otomatik atanır
3. Gider Girişi: kategori, KDV, belge fotoğrafı yükleme
4. Raporlar: Aylık SMM defteri (Excel+PDF), aylık KDV beyan hazırlık, aylık gelir-gider, yıllık özet
5. Ayarlar

## Önemli Notlar

- Mevcut Gelir-Gider Pro projesinin mimari paterni temel alınacak (Firebase Realtime DB sync, PWA yapısı, date utility 19 Aralık 2025 versiyonu)
- Hesaplamalar tahmini olarak gösterilecek; mali müşavir onayı zorunlu uyarısı eklenecek
- Mobil uyumlu, telefondan kamera erişimi gider faturası foto için kritik
- SMM numaraları atlamasız sıralı olmalı (vergi mevzuatı gereği)

## Deployment

- GitHub repo: github.com/drboybeyi/smm-pro
- Firebase project: smm-pro
- Deployment: GitHub Pages
