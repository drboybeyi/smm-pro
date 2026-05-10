// ─── State ─────────────────────────────────────────────────────────────────────

const ARALIK_LS_KEY = 'defter-tarih-araligi';

function _defaultAralik() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const baslangic = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const last = new Date(y, m + 1, 0);
  const bitis = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
  return { tip: 'buAy', baslangic, bitis };
}

function _loadAralik() {
  try {
    const saved = JSON.parse(localStorage.getItem(ARALIK_LS_KEY) || 'null');
    if (saved?.tip && saved?.baslangic && saved?.bitis) return saved;
  } catch {}
  return _defaultAralik();
}

const state = {
  islemler:      [],
  kasalar:       [],
  kategoriler:   [],
  cariler:       [],
  vadeler:       [],
  ayarlar:       {},
  sabitGiderler: [],
  tarihAraligi:  _loadAralik()
};

// ─── PubSub ────────────────────────────────────────────────────────────────────

const _listeners = {};

export function subscribe(event, cb) {
  if (!_listeners[event]) _listeners[event] = [];
  _listeners[event].push(cb);
  return () => { _listeners[event] = _listeners[event].filter(fn => fn !== cb); };
}

function publish(event, data) {
  (_listeners[event] || []).forEach(cb => cb(data));
}

// ─── Getters ───────────────────────────────────────────────────────────────────

export const getState          = () => state;
export const getIslemler       = () => state.islemler;
export const getKasalar        = () => state.kasalar;
export const getKategoriler    = () => state.kategoriler;
export const getCariler        = () => state.cariler;
export const getVadeler        = () => state.vadeler;
export const getAyarlar        = () => state.ayarlar;
export const getSabitGiderler  = () => state.sabitGiderler;
export const getTarihAraligi   = () => state.tarihAraligi;

// ─── Setters ──────────────────────────────────────────────────────────────────

export function setIslemler(liste) {
  state.islemler = liste;
  publish('islemler', state.islemler);
}

export function setKasalar(liste) {
  state.kasalar = liste;
  publish('kasalar', state.kasalar);
}

export function setKategoriler(liste) {
  state.kategoriler = liste;
  publish('kategoriler', state.kategoriler);
}

export function setCariler(liste) {
  state.cariler = liste;
  publish('cariler', state.cariler);
}

export function setVadeler(liste) {
  state.vadeler = liste;
  publish('vadeler', state.vadeler);
}

export function setSabitGiderler(liste) {
  state.sabitGiderler = liste;
  publish('sabitGiderler', state.sabitGiderler);
}

export function setAyarlar(ayarlar) {
  state.ayarlar = { ...state.ayarlar, ...ayarlar };
  publish('ayarlar', state.ayarlar);
}

export function setTarihAraligi(aralik) {
  state.tarihAraligi = aralik;
  try { localStorage.setItem(ARALIK_LS_KEY, JSON.stringify(aralik)); } catch {}
  publish('tarihAraligi', state.tarihAraligi);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

export function initState() {
  ['smm_gelirler', 'smm_giderler', 'smm_ayarlar', 'smmpro_gelirler', 'smmpro_giderler'].forEach(key => {
    localStorage.removeItem(key);
  });
}
