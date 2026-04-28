import { generateId } from './utils.js';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_GELIRLER = [
  {
    id: 'mock-g1', smmNo: 1, tarih: '2026-04-02', hastaAdi: 'Test Hasta 1',
    hizmetTipi: 'muayene', kdvDurumu: 'muaf',
    toplamTutar: 2000, brutTutar: 2000, kdvTutari: 0,
    odemeSekli: 'nakit', notlar: '', olusturmaTarihi: '2026-04-02T09:00:00'
  },
  {
    id: 'mock-g2', smmNo: 2, tarih: '2026-04-05', hastaAdi: 'Test Hasta 2',
    hizmetTipi: 'kontrol', kdvDurumu: 'muaf',
    toplamTutar: 1500, brutTutar: 1500, kdvTutari: 0,
    odemeSekli: 'kart', notlar: '', olusturmaTarihi: '2026-04-05T10:30:00'
  },
  {
    id: 'mock-g3', smmNo: 3, tarih: '2026-04-10', hastaAdi: 'Test Hasta 3',
    hizmetTipi: 'tetkik', kdvDurumu: '10',
    toplamTutar: 3300, brutTutar: 3000, kdvTutari: 300,
    odemeSekli: 'havale', notlar: 'Kan tahlili paketi', olusturmaTarihi: '2026-04-10T11:00:00'
  },
  {
    id: 'mock-g4', smmNo: 4, tarih: '2026-04-15', hastaAdi: 'Test Hasta 4',
    hizmetTipi: 'islem', kdvDurumu: '10',
    toplamTutar: 5500, brutTutar: 5000, kdvTutari: 500,
    odemeSekli: 'nakit', notlar: '', olusturmaTarihi: '2026-04-15T14:00:00'
  },
  {
    id: 'mock-g5', smmNo: 5, tarih: '2026-04-20', hastaAdi: 'Test Hasta 5',
    hizmetTipi: 'muayene', kdvDurumu: 'muaf',
    toplamTutar: 2500, brutTutar: 2500, kdvTutari: 0,
    odemeSekli: 'kart', notlar: '', olusturmaTarihi: '2026-04-20T09:30:00'
  }
];

const MOCK_GIDERLER = [
  {
    id: 'mock-x1', tarih: '2026-04-01', kategori: 'kira',
    tedarikci: 'Test Ev Sahibi', belgeTipi: 'fatura', belgeNo: 'F-2026/04',
    brutTutar: 8000, kdvOrani: 20, kdvTutari: 1333.33, netTutar: 6666.67,
    belgeFotoUrl: null, notlar: 'Nisan kirasi', olusturmaTarihi: '2026-04-01T09:00:00'
  },
  {
    id: 'mock-x2', tarih: '2026-04-10', kategori: 'elektrik',
    tedarikci: 'BEDAS', belgeTipi: 'fatura', belgeNo: 'E-2026-0410',
    brutTutar: 650, kdvOrani: 20, kdvTutari: 108.33, netTutar: 541.67,
    belgeFotoUrl: null, notlar: '', olusturmaTarihi: '2026-04-10T10:00:00'
  },
  {
    id: 'mock-x3', tarih: '2026-04-15', kategori: 'sarf',
    tedarikci: 'Test Medikal AS', belgeTipi: 'fis', belgeNo: '',
    brutTutar: 1200, kdvOrani: 10, kdvTutari: 109.09, netTutar: 1090.91,
    belgeFotoUrl: null, notlar: 'Eldiven, enjektor, pansuman', olusturmaTarihi: '2026-04-15T11:00:00'
  }
];

const DEFAULT_AYARLAR = {
  sonSmmNo: 5,
  isimUnvan: 'Dr. Test Hekim',
  vergiNo: '',
  adres: '',
  varsayilanKdvOranlari: {
    muayene: 'muaf',
    kontrol: 'muaf',
    tetkik: '10',
    islem: '10',
    diger: 'muaf'
  },
  vadeHatirlatma: true
};

// ─── State ─────────────────────────────────────────────────────────────────────

const state = {
  gelirler: [],
  giderler: [],
  ayarlar: { ...DEFAULT_AYARLAR }
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

// ─── LocalStorage ──────────────────────────────────────────────────────────────

const LS = {
  gelirler: 'smm_gelirler',
  giderler: 'smm_giderler',
  ayarlar:  'smm_ayarlar'
};

function saveLS(key) {
  try { localStorage.setItem(LS[key], JSON.stringify(state[key])); } catch (_) {}
}

function loadLS() {
  try {
    const rawG = localStorage.getItem(LS.gelirler);
    const rawX = localStorage.getItem(LS.giderler);
    const rawA = localStorage.getItem(LS.ayarlar);

    state.gelirler = rawG ? JSON.parse(rawG) : MOCK_GELIRLER;
    state.giderler = rawX ? JSON.parse(rawX) : MOCK_GIDERLER;
    state.ayarlar  = rawA
      ? { ...DEFAULT_AYARLAR, ...JSON.parse(rawA) }
      : { ...DEFAULT_AYARLAR };

    // İlk açılışta mock veriyi LocalStorage'a yaz
    if (!rawG) saveLS('gelirler');
    if (!rawX) saveLS('giderler');
    if (!rawA) saveLS('ayarlar');
  } catch (_) {
    state.gelirler = [...MOCK_GELIRLER];
    state.giderler = [...MOCK_GIDERLER];
    state.ayarlar  = { ...DEFAULT_AYARLAR };
  }
}

// ─── Getters ───────────────────────────────────────────────────────────────────

export const getState    = () => state;
export const getGelirler = () => state.gelirler;
export const getGiderler = () => state.giderler;
export const getAyarlar  = () => state.ayarlar;

// ─── Gelir CRUD ────────────────────────────────────────────────────────────────

export function addGelir(data) {
  const yeniNo = state.ayarlar.sonSmmNo + 1;
  state.ayarlar.sonSmmNo = yeniNo;
  const kayit = {
    id: generateId(),
    smmNo: yeniNo,
    olusturmaTarihi: new Date().toISOString(),
    ...data
  };
  state.gelirler = [kayit, ...state.gelirler];
  saveLS('gelirler');
  saveLS('ayarlar');
  publish('gelirler', state.gelirler);
  return kayit;
}

export function updateGelir(id, data) {
  state.gelirler = state.gelirler.map(g => g.id === id ? { ...g, ...data } : g);
  saveLS('gelirler');
  publish('gelirler', state.gelirler);
}

export function deleteGelir(id) {
  state.gelirler = state.gelirler.filter(g => g.id !== id);
  saveLS('gelirler');
  publish('gelirler', state.gelirler);
}

// ─── Gider CRUD ────────────────────────────────────────────────────────────────

export function addGider(data) {
  const kayit = {
    id: generateId(),
    olusturmaTarihi: new Date().toISOString(),
    ...data
  };
  state.giderler = [kayit, ...state.giderler];
  saveLS('giderler');
  publish('giderler', state.giderler);
  return kayit;
}

export function updateGider(id, data) {
  state.giderler = state.giderler.map(x => x.id === id ? { ...x, ...data } : x);
  saveLS('giderler');
  publish('giderler', state.giderler);
}

export function deleteGider(id) {
  state.giderler = state.giderler.filter(x => x.id !== id);
  saveLS('giderler');
  publish('giderler', state.giderler);
}

// ─── Ayarlar ───────────────────────────────────────────────────────────────────

export function updateAyarlar(data) {
  state.ayarlar = { ...state.ayarlar, ...data };
  saveLS('ayarlar');
  publish('ayarlar', state.ayarlar);
}

// ─── Init ──────────────────────────────────────────────────────────────────────

export function initState() {
  loadLS();
}
