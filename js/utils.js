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
