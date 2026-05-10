import { getCariler, getIslemler, subscribe } from '../state.js';
import { hesaplaCariBakiye, hesaplaSonrakiVade, gunFarki, formatTL, bugun } from '../utils.js';
import { openCariForm } from '../components/cariForm.js';
import { openCariDetay } from './cariDetay.js';

// ─── Sayfa görünümü (alt nav) ──────────────────────────────────

let _pageFilter = 'tumu';

function buildCariItemHtml(cari, islemler, today) {
  const bakiye = hesaplaCariBakiye(cari.id, islemler);
  return `
    <div class="list-item cari-sayfa-item" data-cari-id="${cari.id}" style="cursor:pointer">
      <div class="list-item-icon" style="background:var(--bg-secondary);font-size:20px;color:var(--text-primary)">
        ${tipIcon(cari.tip)}
      </div>
      <div class="list-item-body">
        <div class="list-item-title">${cari.ad}</div>
        <div class="list-item-subtitle" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <span>${tipLabel(cari.tip)}</span>
          ${vadeChipHtml(cari, today)}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">${bakiyeHtml(bakiye)}</div>
    </div>`;
}

function attachSayfaListHandlers() {
  document.querySelectorAll('#cariSayfa-list .cari-sayfa-item').forEach(item => {
    item.addEventListener('click', () => {
      const cari = getCariler().find(c => c.id === item.dataset.cariId);
      if (cari) openCariDetay(cari);
    });
  });
}

export default {
  render() {
    const cariler  = getCariler();
    const islemler = getIslemler();
    const today    = bugun();
    const filtered = _pageFilter === 'tumu' ? cariler : cariler.filter(c => c.tip === _pageFilter);

    const listHtml = filtered.length === 0
      ? `<div class="placeholder-view">
           <div class="placeholder-icon">👥</div>
           <div class="placeholder-text">Henüz cari hesap yok.<br>+ Yeni Cari ile başlayın.</div>
         </div>`
      : filtered.map(c => buildCariItemHtml(c, islemler, today)).join('');

    const af = f => _pageFilter === f ? 'active' : '';
    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Cari Hesaplar (${filtered.length})</span>
        <button class="btn btn-primary btn-sm" id="cariSayfaYeniBtn">+ Yeni</button>
      </div>
      <div class="filter-tabs">
        <button class="filter-tab ${af('tumu')}"      data-pf="tumu">Tümü</button>
        <button class="filter-tab ${af('tedarikci')}" data-pf="tedarikci">Tedarikçi</button>
        <button class="filter-tab ${af('personel')}"  data-pf="personel">Personel</button>
        <button class="filter-tab ${af('musteri')}"   data-pf="musteri">Müşteri</button>
      </div>
      <div id="cariSayfa-list">${listHtml}</div>`;
  },

  afterRender() {
    document.getElementById('cariSayfaYeniBtn')?.addEventListener('click', () => openCariForm(null));

    document.querySelectorAll('.filter-tab[data-pf]').forEach(tab => {
      tab.addEventListener('click', () => {
        _pageFilter = tab.dataset.pf;
        document.querySelectorAll('.filter-tab[data-pf]').forEach(t =>
          t.classList.toggle('active', t.dataset.pf === _pageFilter)
        );
        const cariler  = getCariler();
        const islemler = getIslemler();
        const today    = bugun();
        const filtered = _pageFilter === 'tumu' ? cariler : cariler.filter(c => c.tip === _pageFilter);
        const listEl   = document.getElementById('cariSayfa-list');
        if (!listEl) return;
        listEl.innerHTML = filtered.length === 0
          ? `<div class="placeholder-view"><div class="placeholder-icon">👥</div><div class="placeholder-text">Bu tipte cari yok.</div></div>`
          : filtered.map(c => buildCariItemHtml(c, islemler, today)).join('');
        attachSayfaListHandlers();

        const titleEl = document.querySelector('.section-title');
        if (titleEl) titleEl.textContent = `Cari Hesaplar (${filtered.length})`;
      });
    });

    attachSayfaListHandlers();
  }
};

function tipIcon(tip) {
  if (tip === 'tedarikci') return '💊';
  if (tip === 'personel')  return '👤';
  return '🏥';
}

function tipLabel(tip) {
  if (tip === 'tedarikci') return 'Tedarikçi';
  if (tip === 'personel')  return 'Personel';
  return 'Müşteri';
}

function bakiyeHtml(bakiye) {
  if (Math.abs(bakiye) < 0.01) {
    return `<span class="cari-kapali">✓ Kapalı</span>`;
  }
  return bakiye > 0
    ? `<span class="cari-bakiye-pos">+${formatTL(bakiye)}</span>`
    : `<span class="cari-bakiye-neg">${formatTL(bakiye)}</span>`;
}

function vadeChipHtml(cari, bugunStr) {
  const vade = hesaplaSonrakiVade(cari, bugunStr);
  if (!vade) return '';
  const fark = gunFarki(vade, bugunStr);
  if (fark < 0 || fark > 30) return '';
  const acil = fark <= 7;
  const text = fark === 0 ? 'Bugün ödeme!' : `${fark} gün sonra ödeme`;
  return `<span class="cari-vade${acil ? ' cari-vade-acil' : ''}">⚠️ ${text}</span>`;
}

export function openCariler() {
  if (document.getElementById('cariler-overlay')) return;

  let currentFilter = 'tumu';

  const overlay = document.createElement('div');
  overlay.id = 'cariler-overlay';
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);

  const unsubIslemler = subscribe('islemler', renderContent);
  const unsubCariler  = subscribe('cariler',  renderContent);

  function renderContent() {
    const cariler  = getCariler();
    const islemler = getIslemler();
    const today    = bugun();

    const filtered = currentFilter === 'tumu'
      ? cariler
      : cariler.filter(c => c.tip === currentFilter);

    const listHtml = filtered.length === 0
      ? `<div class="placeholder-view">
           <div class="placeholder-icon">👥</div>
           <div class="placeholder-text">Henüz cari hesap yok.<br>+ Yeni Cari ile başlayın.</div>
         </div>`
      : filtered.map(cari => {
          const bakiye = hesaplaCariBakiye(cari.id, islemler);
          return `
            <div class="list-item cari-liste-item" data-cari-id="${cari.id}" style="cursor:pointer">
              <div class="list-item-icon" style="background:var(--bg-secondary);font-size:20px;color:var(--text-primary)">
                ${tipIcon(cari.tip)}
              </div>
              <div class="list-item-body">
                <div class="list-item-title">${cari.ad}</div>
                <div class="list-item-subtitle" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                  <span>${tipLabel(cari.tip)}</span>
                  ${vadeChipHtml(cari, today)}
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0">${bakiyeHtml(bakiye)}</div>
            </div>`;
        }).join('');

    overlay.innerHTML = `
      <div class="modal-box" style="max-width:480px">
        <div class="modal-header">
          <span class="modal-title">Cari Hesaplar</span>
          <button class="modal-close" id="cariler-close">✕</button>
        </div>
        <div class="modal-body" style="padding-top:8px">
          <div class="cariler-toolbar">
            <div class="filter-tabs" style="flex:1;margin-bottom:0">
              <button class="filter-tab ${currentFilter==='tumu'      ?'active':''}" data-filter="tumu">Tümü</button>
              <button class="filter-tab ${currentFilter==='tedarikci' ?'active':''}" data-filter="tedarikci">Tedarikçi</button>
              <button class="filter-tab ${currentFilter==='personel'  ?'active':''}" data-filter="personel">Personel</button>
              <button class="filter-tab ${currentFilter==='musteri'   ?'active':''}" data-filter="musteri">Müşteri</button>
            </div>
            <button class="btn btn-primary btn-sm" id="yeni-cari-btn" style="white-space:nowrap;flex-shrink:0">+ Yeni</button>
          </div>
          <div id="cariler-list" style="margin-top:10px">${listHtml}</div>
        </div>
      </div>`;

    overlay.querySelector('#cariler-close')?.addEventListener('click', close);

    overlay.querySelector('#yeni-cari-btn')?.addEventListener('click', () => {
      openCariForm(null);
    });

    overlay.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.dataset.filter;
        renderContent();
      });
    });

    overlay.querySelectorAll('.cari-liste-item').forEach(item => {
      item.addEventListener('click', () => {
        const cariId = item.dataset.cariId;
        const cari   = getCariler().find(c => c.id === cariId);
        if (cari) openCariDetay(cari);
      });
    });
  }

  function close() {
    unsubIslemler();
    unsubCariler();
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  renderContent();
}
