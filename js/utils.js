const AYLAR_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export function formatTL(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0,00 TL';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' TL';
}

export function formatTarih(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${d} ${AYLAR_TR[m - 1]} ${y}`;
}

export function formatAy(dateStr) {
  if (!dateStr) return '';
  const [y, m] = (dateStr || bugun()).split('-').map(Number);
  return `${AYLAR_TR[m - 1]} ${y}`;
}

export function bugun() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayString() {
  return bugun();
}

export function ayinIlkGunu(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function ayinSonGunu(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

export function isToday(dateStr) {
  return dateStr === bugun();
}

export function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const [y, m] = dateStr.split('-').map(Number);
  return y === today.getFullYear() && m === (today.getMonth() + 1);
}

export function isInDateRange(dateStr, startStr, endStr) {
  if (!dateStr || !startStr || !endStr) return false;
  return dateStr >= startStr && dateStr <= endStr;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function isRequired(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return !isNaN(d.getTime());
}

export function isValidNumber(value, min = 0) {
  const n = Number(value);
  return !isNaN(n) && isFinite(n) && n >= min;
}

// ─── Cari Hesap Yardımcıları ───────────────────────────────────

export function hesaplaCariBakiye(cariId, islemler) {
  return islemler.reduce((toplam, i) => {
    if (i.cariId !== cariId) return toplam;
    const t = i.tutar || 0;
    if (i.cariEtkisi === 'borc_yaz')   return toplam - t;
    if (i.cariEtkisi === 'borc_cikar') return toplam + t;
    if (i.cariEtkisi === 'avans_ver')  return toplam + t;
    if (i.cariEtkisi === 'odeme')      return toplam + t;
    if (i.cariEtkisi === 'tahsilat')   return toplam - t;
    return toplam;
  }, 0);
}

export function gunFarki(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(String(date1) + 'T00:00:00');
  const d2 = date2 instanceof Date ? date2 : new Date(String(date2) + 'T00:00:00');
  return Math.round((d1 - d2) / 86400000);
}

// ─── Kasa Hareketi Filtresi ────────────────────────────────────
// borc_yaz / borc_cikar → kasaId=null, kasa bakiyesini ETKİLEMEZ

export function islemKasaHarekedinSayilirMi(islem) {
  if (!islem.kasaId) return false;
  if (islem.cariEtkisi === 'borc_yaz')   return false;
  if (islem.cariEtkisi === 'borc_cikar') return false;
  return true;
}

// ─── Bugün Yardımcıları ────────────────────────────────────────

export function bugunIslemleri(islemler) {
  const today = bugun();
  return islemler.filter(i => i.tarih === today);
}

export function kasaBugunkiHareket(kasaId, islemler) {
  const today = bugun();
  return islemler
    .filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gelir'    && i.kasaId      === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'gider'    && i.kasaId      === kasaId) return sum - (i.tutar || 0);
      if (i.tip === 'transfer' && i.kasaId      === kasaId) return sum - (i.tutar || 0);
      if (i.tip === 'transfer' && i.hedefKasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

// Bugün belirli kasaya GELEN para (gelir + transfer giriş)
export function kasaBugunkiGelir(kasaId, islemler) {
  const today = bugun();
  return islemler
    .filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gelir'    && i.kasaId      === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'transfer' && i.hedefKasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

// Bugün belirli kasadan ÇIKAN para (gider + transfer çıkış), pozitif sayı döner
export function kasaBugunkiGider(kasaId, islemler) {
  const today = bugun();
  return islemler
    .filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i))
    .reduce((sum, i) => {
      if (i.tip === 'gider'    && i.kasaId === kasaId) return sum + (i.tutar || 0);
      if (i.tip === 'transfer' && i.kasaId === kasaId) return sum + (i.tutar || 0);
      return sum;
    }, 0);
}

// Bugün tüm kasalardaki GERÇEK gelir/gider (borc_yaz/borc_cikar dahil değil)
export function bugunNetGelirGider(islemler) {
  const today  = bugun();
  const todays = islemler.filter(i => i.tarih === today && islemKasaHarekedinSayilirMi(i));
  const gelir  = todays.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const gider  = todays.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  return { gelir, gider, net: gelir - gider };
}

export function kasaTipiBul(kasalar, ...anahtarlar) {
  return kasalar.find(k => {
    const ad = k.ad.toLowerCase();
    return anahtarlar.some(a => ad.includes(a.toLowerCase()));
  }) || null;
}

export function formatTarihUzun(dateStr) {
  if (!dateStr) return '';
  const GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${d} ${AYLAR_TR[m - 1]} ${y} ${GUNLER[date.getDay()]}`;
}

export function islemTipiEtiketi(islem) {
  if (islem.cariEtkisi === 'borc_yaz')   return '📋 Borç';
  if (islem.cariEtkisi === 'borc_cikar') return '📋 Borç Çıkar';
  if (islem.cariEtkisi === 'tahsilat')   return '💰 Tahsilat';
  if (islem.cariEtkisi === 'odeme')      return '💸 Ödeme';
  if (islem.cariEtkisi === 'avans_ver')  return '👤 Avans';
  if (islem.tip === 'gelir')    return '▲ Gelir';
  if (islem.tip === 'gider')    return '▼ Gider';
  if (islem.tip === 'transfer') return '↔ Transfer';
  return islem.tip || '?';
}

export function islemTutarFormati(islem) {
  const t = formatTL(islem.tutar);
  if (islem.cariEtkisi === 'borc_yaz' || islem.cariEtkisi === 'borc_cikar') {
    return { tutar: t, renk: 'var(--warning)' };
  }
  if (islem.tip === 'gelir' || islem.cariEtkisi === 'tahsilat') {
    return { tutar: '+' + t, renk: 'var(--success)' };
  }
  if (islem.tip === 'gider' || islem.cariEtkisi === 'odeme' || islem.cariEtkisi === 'avans_ver') {
    return { tutar: '-' + t, renk: 'var(--danger)' };
  }
  if (islem.tip === 'transfer') {
    return { tutar: '↔ ' + t, renk: 'var(--accent)' };
  }
  return { tutar: t, renk: 'var(--text-primary)' };
}

// ─── Vade Yardımcıları ─────────────────────────────────────────

export function bugunVadeleri(vadeler) {
  const today = bugun();
  return vadeler.filter(v => v.durum === 'bekliyor' && v.vadeTarih === today);
}

export function yaklaşanVadeler(vadeler, gunSayisi = 7) {
  const today = bugun();
  return vadeler.filter(v => {
    if (v.durum !== 'bekliyor') return false;
    const fark = gunFarki(v.vadeTarih, today);
    return fark >= 1 && fark <= gunSayisi;
  });
}

export function gecikmisVadeler(vadeler) {
  const today = bugun();
  return vadeler.filter(v => v.durum === 'bekliyor' && gunFarki(v.vadeTarih, today) < 0);
}

export function vadeRenkSinifi(vade, todayStr) {
  if (vade.durum !== 'bekliyor') return '';
  const fark = gunFarki(vade.vadeTarih, todayStr);
  if (fark < 0)   return 'vade-sinif-gecmis';
  if (fark === 0) return 'vade-sinif-bugun';
  if (fark <= 3)  return 'vade-sinif-yakin';
  return '';
}

export function gunFarkiMetni(tarih1, tarih2) {
  const fark = gunFarki(tarih1, tarih2);
  if (fark === 0) return 'Bugün';
  if (fark > 0)   return `${fark} gün sonra`;
  return `${Math.abs(fark)} gün gecikti`;
}

export function hesaplaSonrakiVade(cari, bugunStr) {
  if (!cari || !cari.vadeTipi || cari.vadeTipi === 'yok') return null;
  const bugunDate = new Date(bugunStr + 'T00:00:00');

  if (cari.vadeTipi === 'tarih' && cari.vadeTarih) {
    const vadeDate = new Date(cari.vadeTarih + 'T00:00:00');
    return vadeDate >= bugunDate ? vadeDate : null;
  }

  if (cari.vadeTipi === 'her_ay' && cari.vadeGunu) {
    const gun = Number(cari.vadeGunu);
    const y   = bugunDate.getFullYear();
    const m   = bugunDate.getMonth();
    const cap = d => Math.min(d, new Date(y, m + 1, 0).getDate());
    let vade  = new Date(y, m, cap(gun));
    if (vade < bugunDate) {
      const ny = m === 11 ? y + 1 : y;
      const nm = (m + 1) % 12;
      const capN = d => Math.min(d, new Date(ny, nm + 1, 0).getDate());
      vade = new Date(ny, nm, capN(gun));
    }
    return vade;
  }

  return null;
}
