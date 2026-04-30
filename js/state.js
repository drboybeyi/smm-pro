// ─── State ─────────────────────────────────────────────────────────────────────

const state = {
  gelirler: [],
  giderler: [],
  ayarlar: { sonSmmNo: 0 }
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

export const getState    = () => state;
export const getGelirler = () => state.gelirler;
export const getGiderler = () => state.giderler;
export const getAyarlar  = () => state.ayarlar;

// ─── Setters (Firebase listener'ları tarafından çağrılır) ──────────────────────

export function setGelirler(liste) {
  state.gelirler = liste;
  publish('gelirler', state.gelirler);
}

export function setGiderler(liste) {
  state.giderler = liste;
  publish('giderler', state.giderler);
}

export function setAyarlar(ayarlar) {
  state.ayarlar = { ...state.ayarlar, ...ayarlar };
  publish('ayarlar', state.ayarlar);
}

// ─── Legacy Temizlik ───────────────────────────────────────────────────────────

function clearLegacyStorage() {
  ['smm_gelirler', 'smm_giderler', 'smm_ayarlar', 'smmpro_gelirler', 'smmpro_giderler'].forEach(key => {
    localStorage.removeItem(key);
  });
}

// ─── Init ──────────────────────────────────────────────────────────────────────

export function initState() {
  clearLegacyStorage();
}
