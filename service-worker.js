// Cache versiyonunu her deploy'da güncelle → eski cache otomatik silinir
const CACHE = 'defter-pro-v1';

// Install: hemen aktif ol, eski tab'ların kapanmasını bekleme
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// Activate: eski cache'leri temizle, tüm client'ları hemen devral
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first
// → Her zaman ağdan dene (güncel dosya gelir)
// → Ağ yoksa cache'den sun (offline çalışır)
// → Başarılı ağ yanıtını cache'e yaz (sonraki offline için)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Sadece same-origin isteklerini yakala (Firebase, CDN vs. etkilenmesin)
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
