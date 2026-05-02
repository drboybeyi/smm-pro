# Defter Pro

## Amaç

Genel amaçlı kişisel finans takip uygulaması. Kasalar (para tutulacak yerler), kullanıcı tanımlı kategoriler, gelir/gider/transfer işlemleri, cihazlar arası gerçek zamanlı senkronizasyon.

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

### islemler/{id}
- id, tarih (YYYY-MM-DD)
- tip: gelir | gider | transfer
- tutar (number)
- kasaId (zorunlu)
- hedefKasaId (sadece transfer)
- kategoriId (gelir/gider için, transfer için yok)
- aciklama (opsiyonel)
- olusturmaTarihi (timestamp)

### kasalar/{id}
- id, ad, emoji, aciklama
- olusturmaTarihi, silindi (soft delete)

### kategoriler/{id}
- id, ad, emoji, tip (gelir|gider)
- olusturmaTarihi, silindi (soft delete)

### ayarlar (tek kayıt)
- kullaniciAdi, paraBirimi

## 5 Ana Ekran

1. Dashboard (Özet): aylık metrikler (gelir, gider, net, kasalar bakiye), kasalar listesi, son 5 işlem
2. İşlemler: Tümü/Gelir/Gider/Transfer filtreli liste; tek "Yeni İşlem" formu
3. Kasalar: bakiyeler, kasa ekle/düzenle/sil
4. Kategoriler: gelir/gider tabları, kategori ekle/düzenle/sil
5. Ayarlar: profil, hesap, çıkış

## Önemli Notlar

- Dashboard görsel tasarımı (card layout, renkler, spacing, Defter 360 teması) KESİNLİKLE korunmalı
- Yeni kullanıcı kaydolunca checkAndCreateDefaults() ile 4 kasa + 15 kategori otomatik oluşur
- Bakiye = (gelirler) + (transfer gelen) - (giderler) - (transfer giden) per kasa
- Faz 2: işlem düzenle/sil; Faz 3: Excel/PDF rapor

## Deployment

- GitHub repo: github.com/drboybeyi/smm-pro
- Firebase project: smm-pro
- Deployment: GitHub Pages
