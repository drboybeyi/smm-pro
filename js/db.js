import { db } from './firebase-config.js';
import { ref, push, set, update, remove, onValue, get } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

const USER_PATH = 'users/';

let currentUserId = null;

export function setCurrentUser(uid) {
  currentUserId = uid;
}

function getUserPath(collection) {
  if (!currentUserId) throw new Error('User not authenticated');
  return `${USER_PATH}${currentUserId}/${collection}`;
}

// GELİRLER
export async function addGelir(gelirData) {
  const path = getUserPath('gelirler');
  const newRef = push(ref(db, path));
  const data = { ...gelirData, id: newRef.key, olusturmaTarihi: Date.now() };
  await set(newRef, data);
  return data;
}

export async function updateGelir(id, updates) {
  await update(ref(db, `${getUserPath('gelirler')}/${id}`), updates);
}

export async function deleteGelir(id) {
  await remove(ref(db, `${getUserPath('gelirler')}/${id}`));
}

// GİDERLER
export async function addGider(giderData) {
  const path = getUserPath('giderler');
  const newRef = push(ref(db, path));
  const data = { ...giderData, id: newRef.key, olusturmaTarihi: Date.now() };
  await set(newRef, data);
  return data;
}

export async function updateGider(id, updates) {
  await update(ref(db, `${getUserPath('giderler')}/${id}`), updates);
}

export async function deleteGider(id) {
  await remove(ref(db, `${getUserPath('giderler')}/${id}`));
}

// AYARLAR
export async function getAyarlarDb() {
  const snap = await get(ref(db, getUserPath('ayarlar')));
  return snap.val() || { sonSmmNo: 0 };
}

export async function updateAyarlar(updates) {
  await update(ref(db, getUserPath('ayarlar')), updates);
}

export async function getSonSmmNo() {
  const ayarlar = await getAyarlarDb();
  return ayarlar.sonSmmNo || 0;
}

export async function incrementSmmNo() {
  const son = await getSonSmmNo();
  const yeni = son + 1;
  await updateAyarlar({ sonSmmNo: yeni });
  return yeni;
}

// REAL-TIME LISTENERS
export function listenGelirler(callback) {
  const r = ref(db, getUserPath('gelirler'));
  return onValue(r, (snap) => {
    const data = snap.val() || {};
    const liste = Object.values(data).sort((a, b) => (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0));
    callback(liste);
  });
}

export function listenGiderler(callback) {
  const r = ref(db, getUserPath('giderler'));
  return onValue(r, (snap) => {
    const data = snap.val() || {};
    const liste = Object.values(data).sort((a, b) => (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0));
    callback(liste);
  });
}

export function listenAyarlar(callback) {
  const r = ref(db, getUserPath('ayarlar'));
  return onValue(r, (snap) => {
    callback(snap.val() || { sonSmmNo: 0 });
  });
}
