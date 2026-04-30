import { initAuth } from './firebase-config.js';
import { initState } from './state.js';
import { bugun, formatTarih } from './utils.js';
import { openGelirForm } from './components/gelirForm.js';
import { openGiderForm } from './components/giderForm.js';
import { show as showToast } from './components/toast.js';
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

const app      = document.getElementById('app');
const navItems = document.querySelectorAll('.nav-item');

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

function setHeaderDate() {
  const el = document.getElementById('headerDate');
  if (el) el.textContent = formatTarih(bugun());
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

  function close() { overlay.remove(); }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  }, { once: true });

  document.getElementById('fbs-gelir')?.addEventListener('click', () => {
    close();
    openGelirForm();
  });

  document.getElementById('fbs-gider')?.addEventListener('click', () => {
    close();
    openGiderForm();
  });
}

// ─── Event Listeners ───────────────────────────────────────────

document.getElementById('fabBtn')?.addEventListener('click', showFabSheet);

// View'lardan gelen "form aç" isteği
document.addEventListener('smm:open-gelir-form', () => openGelirForm());

// Form kaydedildi → mevcut view'ı yenile + toast
document.addEventListener('smm:gelir-saved', e => {
  navigate(currentView());
  showToast(`SMM #${e.detail.kayit.smmNo} kaydedildi`, 'success');
});

document.addEventListener('smm:gider-saved', () => {
  navigate(currentView());
  showToast('Gider kaydedildi', 'success');
});

// ─── Service Worker ────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => reg.update())   // Her yüklemede SW güncel mi diye kontrol et
      .catch(() => {});
  });
}

// ─── Firebase Init ─────────────────────────────────────────────

initAuth()
  .then((user) => {
    console.log('[App] Firebase ready, user:', user.uid);
    const syncIndicator = document.querySelector('.sync-status');
    if (syncIndicator) {
      syncIndicator.textContent = '🟢 Bağlı';
      syncIndicator.style.color = 'var(--success)';
    }
  })
  .catch((err) => {
    console.error('[App] Firebase auth failed:', err);
    const syncIndicator = document.querySelector('.sync-status');
    if (syncIndicator) {
      syncIndicator.textContent = '🔴 Bağlantı yok';
      syncIndicator.style.color = 'var(--danger)';
    }
  });

// ─── Başlat ────────────────────────────────────────────────────

initState();
setHeaderDate();
window.addEventListener('hashchange', () => navigate(currentView()));
navigate(currentView());
