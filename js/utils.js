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
