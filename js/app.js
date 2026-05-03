import { onAuthChange } from './firebase-config.js';
import {
  setCurrentUser,
  listenIslemler, listenKasalar, listenKategoriler, listenAyarlar, listenCariler,
  checkAndCreateDefaults, checkAndCreateDefaultCariler
} from './db.js';
import {
  initState,
  setIslemler, setKasalar, setKategoriler, setAyarlar, setCariler,
  subscribe
} from './state.js';
import { bugun, formatTarih } from './utils.js';
import { openIslemForm } from './components/islemForm.js';
import { openTakvim } from './views/takvim.js';
import { openCariler } from './views/cariler.js';
import { show as showToast } from './components/toast.js';
import { show as showLogin } from './views/login.js';
import Dashboard   from './views/dashboard.js';
import Islemler    from './views/islemler.js';
import Kasalar     from './views/kasalar.js';
import Kategoriler from './views/kategoriler.js';
import Ayarlar     from './views/ayarlar.js';

const VIEWS = {
  dashboard:   Dashboard,
  islemler:    Islemler,
  kasalar:     Kasalar,
  kategoriler: Kategoriler,
  ayarlar:     Ayarlar
};

const app       = document.getElementById('app');
const bottomNav = document.querySelector('.bottom-nav');
const fabBtn    = document.getElementById('fabBtn');
const syncEl    = document.getElementById('syncIndicator');
const navItems  = document.querySelectorAll('.nav-item');

let _unsubListeners = [];
let _authenticated  = false;

// ─── Routing ───────────────────────────────────────────────────

function currentView() {
  const hash = location.hash.slice(1);
  return VIEWS[hash] ? hash : 'dashboard';
}

function navigate(viewKey) {
  const view = VIEWS[viewKey];
  if (!view) return;
  app.innerHTML = view.render();
  view.afterRender?.();
  navItems.forEach(item =>
    item.classList.toggle('active', item.dataset.view === viewKey)
  );
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ─── Header ────────────────────────────────────────────────────

function setHeaderDate() {
  const el = document.getElementById('headerDate');
  if (el) el.textContent = formatTarih(bugun());
}

function setSyncStatus(text, color) {
  if (!syncEl) return;
  syncEl.textContent = text;
  syncEl.style.color = color;
}

// ─── UI toggle ─────────────────────────────────────────────────

function showAppUI() {
  if (bottomNav) bottomNav.style.display = '';
  if (fabBtn)    fabBtn.style.display    = '';
  if (syncEl)    syncEl.style.display    = '';
}

function hideAppUI() {
  if (bottomNav) bottomNav.style.display = 'none';
  if (fabBtn)    fabBtn.style.display    = 'none';
  if (syncEl)    syncEl.style.display    = 'none';
}

// ─── Auth lifecycle ────────────────────────────────────────────

function startApp(user) {
  _authenticated = true;
  setCurrentUser(user.uid);
  setSyncStatus('🟢 Bağlı', '#b8f0b8');
  showAppUI();

  const u1 = listenIslemler(liste    => setIslemler(liste));
  const u2 = listenKasalar(liste     => setKasalar(liste));
  const u3 = listenKategoriler(liste => setKategoriler(liste));
  const u4 = listenAyarlar(ayarlar   => setAyarlar(ayarlar));
  const u5 = listenCariler(liste     => setCariler(liste));
  _unsubListeners = [u1, u2, u3, u4, u5];

  checkAndCreateDefaults(user.uid).catch(console.error);
  checkAndCreateDefaultCariler(user.uid).catch(console.error);

  navigate(currentView());
}

function stopApp() {
  _authenticated = false;
  _unsubListeners.forEach(fn => fn?.());
  _unsubListeners = [];
  setCurrentUser(null);
  setIslemler([]);
  setKasalar([]);
  setKategoriler([]);
  setCariler([]);
  hideAppUI();
  showLogin();
}

// ─── FAB Bottom Sheet ──────────────────────────────────────────

function showFabSheet() {
  if (document.getElementById('fab-sheet-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'fab-sheet-overlay';
  overlay.className = 'fab-sheet-overlay';
  overlay.innerHTML = `
    <div class="fab-sheet">
      <div class="fab-sheet-title">Yeni işlem ekle</div>
      <button class="fab-sheet-btn fab-gelir"    id="fab-gelir">📈 Gelir Ekle</button>
      <button class="fab-sheet-btn fab-gider"    id="fab-gider">📉 Gider Ekle</button>
      <button class="fab-sheet-btn fab-transfer" id="fab-transfer">🔄 Transfer</button>
      <button class="fab-sheet-btn fab-cari"     id="fab-cari">👥 Cari İşlem</button>
      <button class="fab-sheet-btn fab-takvim"   id="fab-takvim">📅 Takvim Görünümü</button>
      <button class="fab-sheet-btn fab-iptal"    id="fab-iptal">İptal</button>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('fab-sheet-closing');
    setTimeout(() => overlay.remove(), 200);
  };

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.getElementById('fab-gelir')?.addEventListener('click',    () => { close(); setTimeout(() => openIslemForm('gelir'),    220); });
  document.getElementById('fab-gider')?.addEventListener('click',    () => { close(); setTimeout(() => openIslemForm('gider'),    220); });
  document.getElementById('fab-transfer')?.addEventListener('click', () => { close(); setTimeout(() => openIslemForm('transfer'), 220); });
  document.getElementById('fab-cari')?.addEventListener('click',     () => { close(); setTimeout(() => openCariler(),             220); });
  document.getElementById('fab-takvim')?.addEventListener('click',   () => { close(); setTimeout(() => openTakvim(),              220); });
  document.getElementById('fab-iptal')?.addEventListener('click', close);
}

fabBtn?.addEventListener('click', showFabSheet);

// ─── Events ────────────────────────────────────────────────────

document.addEventListener('defter:islem-saved', () => {
  navigate(currentView());
  showToast('İşlem kaydedildi', 'success');
});

document.addEventListener('defter:islem-updated', () => {
  navigate(currentView());
  showToast('İşlem güncellendi', 'success');
});

document.addEventListener('defter:open-cariler', () => {
  openCariler();
});

subscribe('islemler',    () => { if (_authenticated) navigate(currentView()); });
subscribe('kasalar',     () => { if (_authenticated) navigate(currentView()); });
subscribe('kategoriler', () => { if (_authenticated) navigate(currentView()); });
subscribe('cariler',     () => { if (_authenticated) navigate(currentView()); });

// ─── Service Worker ────────────────────────────────────────────

if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => reg.update())
      .catch(() => {});
  });
}

// ─── Init ──────────────────────────────────────────────────────

initState();
setHeaderDate();
hideAppUI();
window.addEventListener('hashchange', () => { if (_authenticated) navigate(currentView()); });

onAuthChange(user => {
  if (user && !user.isAnonymous) {
    startApp(user);
  } else {
    stopApp();
  }
});
