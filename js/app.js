import { onAuthChange } from './firebase-config.js';
import { setCurrentUser, listenGelirler, listenGiderler, listenAyarlar } from './db.js';
import { initState, setGelirler, setGiderler, setAyarlar, subscribe } from './state.js';
import { bugun, formatTarih } from './utils.js';
import { openGelirForm } from './components/gelirForm.js';
import { openGiderForm } from './components/giderForm.js';
import { show as showToast } from './components/toast.js';
import { show as showLogin } from './views/login.js';
import Dashboard from './views/dashboard.js';
import Gelir     from './views/gelir.js';
import Gider     from './views/gider.js';
import Raporlar  from './views/raporlar.js';
import Ayarlar   from './views/ayarlar.js';

const VIEWS = {
  dashboard: Dashboard,
  gelir:     Gelir,
  gider:     Gider,
  rapor:     Raporlar,
  ayarlar:   Ayarlar
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

  const u1 = listenGelirler(liste => setGelirler(liste));
  const u2 = listenGiderler(liste => setGiderler(liste));
  const u3 = listenAyarlar(ayarlar => setAyarlar(ayarlar));
  _unsubListeners = [u1, u2, u3];

  navigate(currentView());
}

function stopApp() {
  _authenticated = false;
  _unsubListeners.forEach(fn => fn?.());
  _unsubListeners = [];
  setCurrentUser(null);
  setGelirler([]);
  setGiderler([]);
  hideAppUI();
  showLogin();
}

// ─── FAB Bottom Sheet ──────────────────────────────────────────

function showFabSheet() {
  if (document.getElementById('fab-sheet')) return;

  const overlay = document.createElement('div');
  overlay.id = 'fab-sheet';
  overlay.className = 'bottom-sheet-overlay';
  overlay.innerHTML = `
    <div class="bottom-sheet">
      <div class="bottom-sheet-handle"></div>
      <div class="bottom-sheet-title">Ne eklemek istersiniz?</div>
      <div class="bottom-sheet-option" id="fbs-gelir">
        <div class="bottom-sheet-option-icon" style="background:#e8f4e8">₺</div>
        <div>
          <div style="font-weight:600;font-size:15px">Gelir Ekle</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">SMM kaydı oluştur</div>
        </div>
      </div>
      <div class="bottom-sheet-option" id="fbs-gider">
        <div class="bottom-sheet-option-icon" style="background:#faeaea">🧾</div>
        <div>
          <div style="font-weight:600;font-size:15px">Gider Ekle</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Fatura / gider kaydı</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });

  document.getElementById('fbs-gelir')?.addEventListener('click', () => { close(); openGelirForm(); });
  document.getElementById('fbs-gider')?.addEventListener('click', () => { close(); openGiderForm(); });
}

// ─── Event Listeners ───────────────────────────────────────────

fabBtn?.addEventListener('click', showFabSheet);

document.addEventListener('smm:open-gelir-form', () => openGelirForm());

document.addEventListener('smm:gelir-saved', e => {
  navigate(currentView());
  showToast(`SMM #${e.detail.kayit.smmNo} kaydedildi`, 'success');
});

document.addEventListener('smm:gider-saved', () => {
  navigate(currentView());
  showToast('Gider kaydedildi', 'success');
});

subscribe('gelirler', () => { if (_authenticated) navigate(currentView()); });
subscribe('giderler', () => { if (_authenticated) navigate(currentView()); });

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
