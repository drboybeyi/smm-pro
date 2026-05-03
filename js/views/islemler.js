import { getIslemler, getKasalar, getKategoriler, getCariler } from '../state.js';
import { formatTL, formatTarih } from '../utils.js';
import { openIslemForm } from '../components/islemForm.js';
import { openIslemDetay } from '../components/islemDetay.js';

let currentFilter = 'tumu';

const ETKI_KISA = {
  borc_yaz:   '📋 Borç',
  borc_cikar: '📋 Alacak',
  odeme:      '💸 Ödeme',
  avans_ver:  '💳 Avans',
  tahsilat:   '💰 Tahsilat',
};

function tipInfo(tip) {
  if (tip === 'gelir')    return { icon: '▲', bg: '#e8f4e8', color: 'var(--success)', cls: 'income',   prefix: '+' };
  if (tip === 'gider')    return { icon: '▼', bg: '#faeaea', color: 'var(--danger)',  cls: 'expense',  prefix: '-' };
  return                         { icon: '↔', bg: 'var(--bg-secondary)', color: 'var(--accent)', cls: 'transfer', prefix: '' };
}

function islemItem(islem, kasalar, kategoriler, cariler) {
  const { icon, bg, color, cls, prefix } = tipInfo(islem.tip);
  const kasa     = kasalar.find(k => k.id === islem.kasaId);
  const kategori = kategoriler.find(k => k.id === islem.kategoriId);
  const cari     = islem.cariId ? cariler.find(c => c.id === islem.cariId) : null;

  let iconContent, title, subtitle;

  if (islem.tip === 'transfer') {
    const hedefKasa = kasalar.find(k => k.id === islem.hedefKasaId);
    iconContent = '↔';
    title    = `${kasa?.ad || '?'} → ${hedefKasa?.ad || '?'}`;
    subtitle = `${formatTarih(islem.tarih)} · Transfer`;
  } else if (islem.cariEtkisi) {
    const etkiLabel = ETKI_KISA[islem.cariEtkisi] || islem.cariEtkisi;
    iconContent = kategori?.emoji || icon;
    title    = islem.aciklama || etkiLabel + (cari ? ` — ${cari.ad}` : '');
    const kasaAd = kasa ? kasa.ad : null;
    subtitle = `${formatTarih(islem.tarih)}` +
               (kasaAd ? ` · ${kasaAd}` : '') +
               (cari ? ` · <span class="cari-rozet">${etkiLabel}</span>` : '');
  } else {
    iconContent = kategori?.emoji || icon;
    title    = islem.aciklama || kategori?.ad || (islem.tip === 'gelir' ? 'Gelir' : 'Gider');
    subtitle = `${formatTarih(islem.tarih)} · ${kasa?.ad || '?'}`;
  }

  return `
    <div class="list-item" data-islem-id="${islem.id}" style="cursor:pointer">
      <div class="list-item-icon" style="background:${bg};color:${color};font-size:16px">
        ${iconContent}
      </div>
      <div class="list-item-body">
        <div class="list-item-title">${title}</div>
        <div class="list-item-subtitle">${subtitle}</div>
      </div>
      <div class="list-item-amount ${cls}">${prefix}${formatTL(islem.tutar)}</div>
    </div>`;
}

function filterIslemler(islemler, filter) {
  if (filter === 'tumu')   return islemler;
  if (filter === 'cari')   return islemler.filter(i => i.cariId);
  return islemler.filter(i => i.tip === filter);
}

function attachListClick(listEl) {
  listEl?.addEventListener('click', e => {
    const item = e.target.closest('.list-item[data-islem-id]');
    if (!item) return;
    const id    = item.dataset.islemId;
    const islem = getIslemler().find(i => i.id === id);
    if (islem) openIslemDetay(islem);
  });
}

export default {
  render() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const cariler     = getCariler();
    const filtered    = filterIslemler(islemler, currentFilter);

    const activeClass = f => currentFilter === f ? 'active' : '';

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">İşlemler (${filtered.length})</span>
        <button class="btn btn-primary btn-sm" id="btnYeniIslem">+ Yeni</button>
      </div>

      <div class="filter-tabs">
        <button class="filter-tab ${activeClass('tumu')}"     data-filter="tumu">Tümü</button>
        <button class="filter-tab ${activeClass('gelir')}"    data-filter="gelir">▲ Gelir</button>
        <button class="filter-tab ${activeClass('gider')}"    data-filter="gider">▼ Gider</button>
        <button class="filter-tab ${activeClass('transfer')}" data-filter="transfer">↔ Transfer</button>
        <button class="filter-tab ${activeClass('cari')}"     data-filter="cari">👥 Cari</button>
      </div>

      <div id="islemler-list">
        ${filtered.length === 0
          ? `<div class="placeholder-view">
               <div class="placeholder-icon">₺</div>
               <div class="placeholder-text">Henüz kayıt yok.<br>Sağ alttaki + butonuna dokun.</div>
             </div>`
          : filtered.map(i => islemItem(i, kasalar, kategoriler, cariler)).join('')
        }
      </div>
    `;
  },

  afterRender() {
    document.getElementById('btnYeniIslem')?.addEventListener('click', () => openIslemForm('gider'));

    attachListClick(document.getElementById('islemler-list'));

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.dataset.filter;
        document.querySelectorAll('.filter-tab').forEach(t =>
          t.classList.toggle('active', t.dataset.filter === currentFilter)
        );
        const islemler    = getIslemler();
        const kasalar     = getKasalar();
        const kategoriler = getKategoriler();
        const cariler     = getCariler();
        const filtered    = filterIslemler(islemler, currentFilter);

        const listEl = document.getElementById('islemler-list');
        listEl.innerHTML =
          filtered.length === 0
            ? `<div class="placeholder-view"><div class="placeholder-icon">₺</div><div class="placeholder-text">Bu türde kayıt yok.</div></div>`
            : filtered.map(i => islemItem(i, kasalar, kategoriler, cariler)).join('');

        const titleEl = document.querySelector('.section-title');
        if (titleEl) titleEl.textContent = `İşlemler (${filtered.length})`;
      });
    });
  }
};
