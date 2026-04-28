import { initState } from './state.js';
import { bugun, formatTarih } from './utils.js';
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

  // Sayfanın üstüne kaydır
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function setHeaderDate() {
  const el = document.getElementById('headerDate');
  if (el) el.textContent = formatTarih(bugun());
}

// FAB: aktif ekrana göre yönlendir
document.getElementById('fabBtn')?.addEventListener('click', () => {
  const view = currentView();
  if (view === 'gider') {
    document.getElementById('btnYeniGider')?.click();
  } else {
    // Dashboard dahil her ekranda gelir ekle
    if (view !== 'gelir') location.hash = 'gelir';
    else document.getElementById('btnYeniGelir')?.click();
  }
});

// Service Worker kaydı
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// Başlat
initState();
setHeaderDate();

window.addEventListener('hashchange', () => navigate(currentView()));
navigate(currentView());
