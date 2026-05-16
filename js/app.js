import { onAuthChange } from './firebase-config.js';
import {
  setCurrentUser,
  listenIslemler, listenKasalar, listenKategoriler, listenAyarlar, listenCariler, listenVadeler,
  listenSabitGiderler,
  checkAndCreateDefaults, checkAndCreateDefaultCariler
} from './db.js';
import {
  initState,
  getCariler, getVadeler,
  setIslemler, setKasalar, setKategoriler, setAyarlar, setCariler, setVadeler,
  setSabitGiderler,
  subscribe
} from './state.js';
import { bugun, formatTarih, temizleEskiOdendiIsaretleri, pinAktif, pinDenemeSifirla, autoLockSureGetir } from './utils.js';
import { showPinKilit, hidePinKilit } from './views/pinKilit.js';
import { openIslemForm } from './components/islemForm.js';
import TakvimView, { openTakvim } from './views/takvim.js';
import KasaDetay from './views/kasaDetay.js';
import TumKasalarDetay, { openTumKasalarDetay } from './views/tumKasalarDetay.js';
import { openCariBorclar } from './views/cariBorclar.js';
import { openBanaBorcluOlanlar } from './views/banaBorcluOlanlar.js';
import CarilerView, { openCariler } from './views/cariler.js';
import { openCariDetay } from './views/cariDetay.js';
import { show as showToast } from './components/toast.js';
import { show as showLogin } from './views/login.js';
import Dashboard from './views/dashboard.js';
import Islemler  from './views/islemler.js';
import Ayarlar   from './views/ayarlar.js';
import Odemeler  from './views/odemeler.js';

const VIEWS = {
  dashboard:       Dashboard,
  islemler:        Islemler,
  takvim:          TakvimView,
  cariler:         CarilerView,
  kasaDetay:       KasaDetay,
  tumKasalarDetay: TumKasalarDetay,
  ayarlar:         Ayarlar,
  odemeler:        Odemeler
};

const app       = document.getElementById('app');
const bottomNav = document.querySelector('.bottom-nav');
const fabBtn    = document.getElementById('fabBtn');
const syncEl    = document.getElementById('syncIndicator');
const navItems  = document.querySelectorAll('.nav-item');

let _unsubListeners = [];
let _authenticated  = false;
let _kilitli        = false;
let _autoLockTimer  = null;
window.sonAktivite  = Date.now();

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

// ─── Tab Title ─────────────────────────────────────────────────

function updateTabTitle() {
  const vadeler = getVadeler();
  const today   = bugun();
  const d       = new Date(today + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  const yarin   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const bugunSayisi = vadeler.filter(v => v.durum === 'bekliyor' && v.vadeTarih === today).length;
  if (bugunSayisi > 0) {
    document.title = `(${bugunSayisi}) Defter Pro`;
    return;
  }
  const yarinVar = vadeler.some(v => v.durum === 'bekliyor' && v.vadeTarih === yarin);
  document.title = yarinVar ? '(!) Defter Pro' : 'Defter Pro';
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

// ─── PIN Lock ──────────────────────────────────────────────────

function kilitle() {
  if (_kilitli || !_authenticated) return;
  _kilitli = true;
  showPinKilit(() => {
    _kilitli = false;
    pinDenemeSifirla();
    window.sonAktivite = Date.now();
  });
}

window.kilitle = kilitle;
window.pinAktifMi = pinAktif;
window.defterNavigate = navigate;

function _aktiviteGuncelle() {
  window.sonAktivite = Date.now();
}

function _autoLockBaslat() {
  if (_autoLockTimer) clearInterval(_autoLockTimer);
  _autoLockTimer = setInterval(() => {
    if (!_authenticated || !pinAktif() || _kilitli) return;
    const sure = autoLockSureGetir();
    if (sure === 0) return;
    const fark = (Date.now() - window.sonAktivite) / 1000;
    if (fark >= sure) kilitle();
  }, 5000);
}

function _autoLockDurdur() {
  if (_autoLockTimer) { clearInterval(_autoLockTimer); _autoLockTimer = null; }
}

['mousemove', 'click', 'touchstart', 'keydown', 'scroll'].forEach(ev => {
  document.addEventListener(ev, _aktiviteGuncelle, { passive: true });
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && _authenticated && pinAktif() && !_kilitli) {
    kilitle();
  }
});

// ─── Auth lifecycle ────────────────────────────────────────────

function startApp(user) {
  _authenticated = true;
  setCurrentUser(user.uid);
  setSyncStatus('🟢 Bağlı', '#b8f0b8');
  showAppUI();

  const u1 = listenIslemler(liste      => setIslemler(liste));
  const u2 = listenKasalar(liste       => setKasalar(liste));
  const u3 = listenKategoriler(liste   => setKategoriler(liste));
  const u4 = listenAyarlar(ayarlar     => setAyarlar(ayarlar));
  const u5 = listenCariler(liste       => setCariler(liste));
  const u6 = listenVadeler(liste       => setVadeler(liste));
  const u7 = listenSabitGiderler(liste => setSabitGiderler(liste));
  _unsubListeners = [u1, u2, u3, u4, u5, u6, u7];

  checkAndCreateDefaults(user.uid).catch(console.error);
  checkAndCreateDefaultCariler(user.uid).catch(console.error);

  _autoLockBaslat();
  window.sonAktivite = Date.now();

  if (pinAktif()) {
    _kilitli = true;
    showPinKilit(() => {
      _kilitli = false;
      pinDenemeSifirla();
      window.sonAktivite = Date.now();
      navigate(currentView());
    });
  } else {
    navigate(currentView());
  }
}

function stopApp() {
  _authenticated = false;
  _kilitli = false;
  _autoLockDurdur();
  hidePinKilit();
  _unsubListeners.forEach(fn => fn?.());
  _unsubListeners = [];
  setCurrentUser(null);
  setIslemler([]);
  setKasalar([]);
  setKategoriler([]);
  setCariler([]);
  setVadeler([]);
  setSabitGiderler([]);
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
      <div class="fab-sheet-title">Hızlı Erişim</div>
      <button class="fab-sheet-btn fab-gelir"    id="fab-gelir">📈 Gelir Ekle</button>
      <button class="fab-sheet-btn fab-gider"    id="fab-gider">📉 Gider Ekle</button>
      <button class="fab-sheet-btn fab-transfer" id="fab-transfer">🔄 Transfer</button>
      <button class="fab-sheet-btn fab-cari"      id="fab-cari">👥 Cari İşlem</button>
      <button class="fab-sheet-btn fab-borclar"  id="fab-borclar">💸 Cari Borçlarım</button>
      <button class="fab-sheet-btn fab-borclu"   id="fab-borclu">💰 Bana Borçlu Olanlar</button>
      <button class="fab-sheet-btn fab-ayarlar"  id="fab-ayarlar">⚙️ Ayarlar</button>
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
  document.getElementById('fab-borclar')?.addEventListener('click',  () => { close(); setTimeout(() => openCariBorclar(),           220); });
  document.getElementById('fab-borclu')?.addEventListener('click',   () => { close(); setTimeout(() => openBanaBorcluOlanlar(),   220); });
  document.getElementById('fab-ayarlar')?.addEventListener('click',  () => { close(); setTimeout(() => { location.hash = '#ayarlar'; }, 220); });
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

document.addEventListener('defter:open-takvim', () => {
  location.hash = '#takvim';
});

document.addEventListener('defter:open-cariler', () => {
  openCariler();
});

document.addEventListener('defter:open-cari-detay', e => {
  const { cariId } = e.detail || {};
  if (!cariId) return;
  const cari = getCariler().find(c => c.id === cariId);
  if (cari) openCariDetay(cari);
});

subscribe('islemler',      () => { if (_authenticated) navigate(currentView()); });
subscribe('kasalar',       () => { if (_authenticated) navigate(currentView()); });
subscribe('kategoriler',   () => { if (_authenticated) navigate(currentView()); });
subscribe('cariler',       () => { if (_authenticated) navigate(currentView()); });
subscribe('sabitGiderler', () => { if (_authenticated) navigate(currentView()); });
subscribe('tarihAraligi',  () => { if (_authenticated && currentView() === 'dashboard') navigate('dashboard'); });
subscribe('vadeler', () => {
  if (_authenticated) {
    navigate(currentView());
    updateTabTitle();
  }
});

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
temizleEskiOdendiIsaretleri();
window.tumKasalarDetayAc = openTumKasalarDetay;
hideAppUI();
window.addEventListener('hashchange', () => {
  if (!_authenticated) return;
  if (location.hash === '#kasalar' || location.hash === '#kategoriler') { location.hash = '#ayarlar'; return; }
  navigate(currentView());
});

onAuthChange(user => {
  if (user && !user.isAnonymous) {
    startApp(user);
  } else {
    stopApp();
  }
});
