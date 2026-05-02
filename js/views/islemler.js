import { getIslemler, getKasalar, getKategoriler } from '../state.js';
import { formatTL, formatTarih } from '../utils.js';
import { openIslemForm } from '../components/islemForm.js';

let currentFilter = 'tumu';

function tipInfo(tip) {
  if (tip === 'gelir')    return { icon: '▲', bg: '#e8f4e8', color: 'var(--success)', cls: 'income',   prefix: '+' };
  if (tip === 'gider')    return { icon: '▼', bg: '#faeaea', color: 'var(--danger)',  cls: 'expense',  prefix: '-' };
  return                         { icon: '↔', bg: 'var(--bg-secondary)', color: 'var(--accent)', cls: 'transfer', prefix: '' };
}

function islemItem(islem, kasalar, kategoriler) {
  const { icon, bg, color, cls, prefix } = tipInfo(islem.tip);
  const kasa     = kasalar.find(k => k.id === islem.kasaId);
  const kategori = kategoriler.find(k => k.id === islem.kategoriId);

  let iconContent, title, subtitle;

  if (islem.tip === 'transfer') {
    const hedefKasa = kasalar.find(k => k.id === islem.hedefKasaId);
    iconContent = '↔';
    title    = `${kasa?.ad || '?'} → ${hedefKasa?.ad || '?'}`;
    subtitle = `${formatTarih(islem.tarih)} · Transfer`;
  } else {
    iconContent = kategori?.emoji || icon;
    title    = islem.aciklama || kategori?.ad || (islem.tip === 'gelir' ? 'Gelir' : 'Gider');
    subtitle = `${formatTarih(islem.tarih)} · ${kasa?.ad || '?'}`;
  }

  return `
    <div class="list-item">
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

export default {
  render() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const filtered    = currentFilter === 'tumu'
      ? islemler
      : islemler.filter(i => i.tip === currentFilter);

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">İşlemler (${filtered.length})</span>
        <button class="btn btn-primary btn-sm" id="btnYeniIslem">+ Yeni</button>
      </div>

      <div class="filter-tabs">
        <button class="filter-tab ${currentFilter === 'tumu'     ? 'active' : ''}" data-filter="tumu">Tümü</button>
        <button class="filter-tab ${currentFilter === 'gelir'    ? 'active' : ''}" data-filter="gelir">▲ Gelir</button>
        <button class="filter-tab ${currentFilter === 'gider'    ? 'active' : ''}" data-filter="gider">▼ Gider</button>
        <button class="filter-tab ${currentFilter === 'transfer' ? 'active' : ''}" data-filter="transfer">↔ Transfer</button>
      </div>

      <div id="islemler-list">
        ${filtered.length === 0
          ? `<div class="placeholder-view">
               <div class="placeholder-icon">₺</div>
               <div class="placeholder-text">Henüz kayıt yok.<br>Sağ alttaki + butonuna dokun.</div>
             </div>`
          : filtered.map(i => islemItem(i, kasalar, kategoriler)).join('')
        }
      </div>
    `;
  },

  afterRender() {
    document.getElementById('btnYeniIslem')?.addEventListener('click', () => openIslemForm('gider'));

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.dataset.filter;
        document.querySelectorAll('.filter-tab').forEach(t =>
          t.classList.toggle('active', t.dataset.filter === currentFilter)
        );
        const islemler    = getIslemler();
        const kasalar     = getKasalar();
        const kategoriler = getKategoriler();
        const filtered    = currentFilter === 'tumu'
          ? islemler
          : islemler.filter(i => i.tip === currentFilter);

        document.getElementById('islemler-list').innerHTML =
          filtered.length === 0
            ? `<div class="placeholder-view"><div class="placeholder-icon">₺</div><div class="placeholder-text">Bu türde kayıt yok.</div></div>`
            : filtered.map(i => islemItem(i, kasalar, kategoriler)).join('');

        const titleEl = document.querySelector('.section-title');
        if (titleEl) titleEl.textContent = `İşlemler (${filtered.length})`;
      });
    });
  }
};
