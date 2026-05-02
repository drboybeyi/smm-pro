import { db } from './firebase-config.js';
import { ref, push, set, update, remove, onValue, get } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

const USER_PATH = 'users/';
let currentUserId = null;

export function setCurrentUser(uid) {
  currentUserId = uid;
}

function getUserPath(collection) {
  if (!currentUserId) throw new Error('Kullanıcı kimliği doğrulanmadı');
  return `${USER_PATH}${currentUserId}/${collection}`;
}

// ─── İŞLEMLER ─────────────────────────────────────────────────

export async function addIslem(islemData) {
  const path = getUserPath('islemler');
  const newRef = push(ref(db, path));
  const data = { ...islemData, id: newRef.key, olusturmaTarihi: Date.now() };
  await set(newRef, data);
  return data;
}

export async function updateIslem(id, updates) {
  await update(ref(db, `${getUserPath('islemler')}/${id}`), updates);
}

export async function deleteIslem(id) {
  await remove(ref(db, `${getUserPath('islemler')}/${id}`));
}

export function listenIslemler(callback) {
  const r = ref(db, getUserPath('islemler'));
  return onValue(r, (snap) => {
    const data = snap.val() || {};
    const liste = Object.values(data).sort((a, b) => {
      if (b.tarih !== a.tarih) return b.tarih.localeCompare(a.tarih);
      return (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0);
    });
    callback(liste);
  });
}

// ─── KASALAR ─────────────────────────────────────────────────

export async function addKasa(kasaData) {
  const path = getUserPath('kasalar');
  const newRef = push(ref(db, path));
  const data = { ...kasaData, id: newRef.key, olusturmaTarihi: Date.now(), silindi: false };
  await set(newRef, data);
  return data;
}

export async function updateKasa(id, updates) {
  await update(ref(db, `${getUserPath('kasalar')}/${id}`), updates);
}

export function listenKasalar(callback) {
  const r = ref(db, getUserPath('kasalar'));
  return onValue(r, (snap) => {
    const data = snap.val() || {};
    const liste = Object.values(data)
      .filter(k => !k.silindi)
      .sort((a, b) => (a.olusturmaTarihi || 0) - (b.olusturmaTarihi || 0));
    callback(liste);
  });
}

// ─── KATEGORİLER ─────────────────────────────────────────────

export async function addKategori(kategoriData) {
  const path = getUserPath('kategoriler');
  const newRef = push(ref(db, path));
  const data = { ...kategoriData, id: newRef.key, olusturmaTarihi: Date.now(), silindi: false };
  await set(newRef, data);
  return data;
}

export async function updateKategori(id, updates) {
  await update(ref(db, `${getUserPath('kategoriler')}/${id}`), updates);
}

export function listenKategoriler(callback) {
  const r = ref(db, getUserPath('kategoriler'));
  return onValue(r, (snap) => {
    const data = snap.val() || {};
    const liste = Object.values(data)
      .filter(k => !k.silindi)
      .sort((a, b) => (a.olusturmaTarihi || 0) - (b.olusturmaTarihi || 0));
    callback(liste);
  });
}

// ─── AYARLAR ─────────────────────────────────────────────────

export async function updateAyarlar(updates) {
  await update(ref(db, getUserPath('ayarlar')), updates);
}

export function listenAyarlar(callback) {
  const r = ref(db, getUserPath('ayarlar'));
  return onValue(r, (snap) => {
    callback(snap.val() || {});
  });
}

// ─── BAKIYE HESABI ────────────────────────────────────────────

export function hesaplaKasaBakiyesi(kasaId, islemler) {
  return islemler.reduce((toplam, islem) => {
    if (islem.tip === 'gelir'    && islem.kasaId      === kasaId) return toplam + (islem.tutar || 0);
    if (islem.tip === 'gider'    && islem.kasaId      === kasaId) return toplam - (islem.tutar || 0);
    if (islem.tip === 'transfer' && islem.kasaId      === kasaId) return toplam - (islem.tutar || 0);
    if (islem.tip === 'transfer' && islem.hedefKasaId === kasaId) return toplam + (islem.tutar || 0);
    return toplam;
  }, 0);
}

// ─── VARSAYILAN VERİ ──────────────────────────────────────────

const DEFAULT_KASALAR = [
  { ad: 'Nakit',       emoji: '💵', aciklama: '' },
  { ad: 'Banka',       emoji: '💳', aciklama: '' },
  { ad: 'Muayenehane', emoji: '🏥', aciklama: '' },
  { ad: 'Kişisel',     emoji: '💰', aciklama: '' },
];

const DEFAULT_KATEGORILER = [
  { ad: 'Muayene',     emoji: '🩺', tip: 'gelir' },
  { ad: 'Maaş',        emoji: '💼', tip: 'gelir' },
  { ad: 'Yatırım',     emoji: '📈', tip: 'gelir' },
  { ad: 'Hediye',      emoji: '🎁', tip: 'gelir' },
  { ad: 'Diğer Gelir', emoji: '💸', tip: 'gelir' },
  { ad: 'Kira',        emoji: '🏠', tip: 'gider' },
  { ad: 'Fatura',      emoji: '⚡', tip: 'gider' },
  { ad: 'Yemek',       emoji: '🍽️', tip: 'gider' },
  { ad: 'Market',      emoji: '🛒', tip: 'gider' },
  { ad: 'Ulaşım',      emoji: '🚗', tip: 'gider' },
  { ad: 'Sağlık',      emoji: '💊', tip: 'gider' },
  { ad: 'Eğlence',     emoji: '🎬', tip: 'gider' },
  { ad: 'Giyim',       emoji: '👔', tip: 'gider' },
  { ad: 'Eğitim',      emoji: '📚', tip: 'gider' },
  { ad: 'Diğer Gider', emoji: '💸', tip: 'gider' },
];

async function createDefaultData(uid) {
  const kasaPath = `${USER_PATH}${uid}/kasalar`;
  const katPath  = `${USER_PATH}${uid}/kategoriler`;
  for (const k of DEFAULT_KASALAR) {
    const newRef = push(ref(db, kasaPath));
    await set(newRef, { ...k, id: newRef.key, olusturmaTarihi: Date.now(), silindi: false });
  }
  for (const k of DEFAULT_KATEGORILER) {
    const newRef = push(ref(db, katPath));
    await set(newRef, { ...k, id: newRef.key, olusturmaTarihi: Date.now(), silindi: false });
  }
}

export async function checkAndCreateDefaults(uid) {
  const snap = await get(ref(db, `${USER_PATH}${uid}/kasalar`));
  if (!snap.exists()) {
    await createDefaultData(uid);
  }
}
