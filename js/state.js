// ─── State ─────────────────────────────────────────────────────────────────────

const state = {
  islemler:    [],
  kasalar:     [],
  kategoriler: [],
  ayarlar:     {}
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

export const getState       = () => state;
export const getIslemler    = () => state.islemler;
export const getKasalar     = () => state.kasalar;
export const getKategoriler = () => state.kategoriler;
export const getAyarlar     = () => state.ayarlar;

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

export function setAyarlar(ayarlar) {
  state.ayarlar = { ...state.ayarlar, ...ayarlar };
  publish('ayarlar', state.ayarlar);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

export function initState() {
  ['smm_gelirler', 'smm_giderler', 'smm_ayarlar', 'smmpro_gelirler', 'smmpro_giderler'].forEach(key => {
    localStorage.removeItem(key);
  });
}
