const AYLAR = [
  'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
  'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'
];

// Gerçek Türkçe ay adları (ekranda gösterim için)
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

// YYYY-MM-DD formatında bugünün tarihi
export function bugun() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Gelir-Gider Pro 19 Aralık 2025 uyumlu alias
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

// KDV dahil tutarı ayrıştır
// kdvAyristir(1100, 10) → { brut: 1000, kdv: 100, toplam: 1100 }
// kdvAyristir(1500, 0)  → { brut: 1500, kdv: 0,   toplam: 1500 }
export function kdvAyristir(toplamTutar, kdvOrani) {
  const t = Number(toplamTutar) || 0;
  const r = Number(kdvOrani) || 0;
  if (r === 0) {
    return { brut: t, kdv: 0, toplam: t };
  }
  const brut = t / (1 + r / 100);
  const kdv = t - brut;
  return {
    brut: Math.round(brut * 100) / 100,
    kdv:  Math.round(kdv * 100) / 100,
    toplam: t
  };
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function hizmetTipiLabel(tip) {
  const map = {
    muayene: 'Muayene',
    kontrol: 'Kontrol',
    tetkik: 'Tetkik',
    islem: 'İşlem',
    diger: 'Diğer'
  };
  return map[tip] || tip;
}

export function kategoriLabel(kat) {
  const map = {
    kira: 'Kira',
    elektrik: 'Elektrik',
    su: 'Su',
    dogalgaz: 'Doğalgaz',
    internet: 'İnternet',
    telefon: 'Telefon',
    personel: 'Personel',
    sgk: 'SGK',
    sarf: 'Sarf Malzeme',
    tibbi_malzeme: 'Tıbbi Malzeme',
    demirbas: 'Demirbaş',
    musavir: 'Müşavir',
    vergi: 'Vergi',
    diger: 'Diğer'
  };
  return map[kat] || kat;
}

export function odemeSekliLabel(sekil) {
  const map = { nakit: 'Nakit', kart: 'Kart', havale: 'Havale' };
  return map[sekil] || sekil;
}
