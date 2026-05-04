import { getIslemler, getKasalar, getKategoriler, getCariler } from '../state.js';
import { formatTarih, islemTipiEtiketi, islemTutarFormati } from '../utils.js';
import { openIslemForm } from '../components/islemForm.js';
import { openIslemDetay } from '../components/islemDetay.js';

let currentFilter = 'tumu';

function islemItem(islem, kasalar, kategoriler, cariler) {
  const kasa     = kasalar.find(k => k.id === islem.kasaId);
  const kategori = kategoriler.find(k => k.id === islem.kategoriId);
  const cari     = islem.cariId ? cariler.find(c => c.id === islem.cariId) : null;
  const { tutar: tutarStr, renk: tutarRenk } = islemTutarFormati(islem);

  let iconContent, iconBg, iconColor, title, subtitle;

  if (islem.tip === 'transfer') {
    const hedefKasa = kasalar.find(k => k.id === islem.hedefKasaId);
    iconContent = '↔';
    iconBg      = 'var(--bg-secondary)';
    iconColor   = 'var(--accent)';
    title       = `${kasa?.ad || '?'} → ${hedefKasa?.ad || '?'}`;
    subtitle    = `${formatTarih(islem.tarih)} · Transfer`;
  } else if (islem.cariEtkisi === 'borc_yaz' || islem.cariEtkisi === 'borc_cikar') {
    const etiket = islemTipiEtiketi(islem);
    iconContent  = '📋';
    iconBg       = '#fff4e0';
    iconColor    = 'var(--warning)';
    title        = islem.aciklama || etiket + (cari ? ` — ${cari.ad}` : '');
    subtitle     = formatTarih(islem.tarih) + (cari ? ` · ${cari.ad}` : '');
  } else if (islem.cariEtkisi) {
    const etiket = islemTipiEtiketi(islem);
    iconContent  = kategori?.emoji || (islem.tip === 'gelir' ? '▲' : '▼');
    iconBg       = islem.tip === 'gelir' ? '#e8f4e8' : '#faeaea';
    iconColor    = islem.tip === 'gelir' ? 'var(--success)' : 'var(--danger)';
    title        = islem.aciklama || etiket + (cari ? ` — ${cari.ad}` : '');
    subtitle     = formatTarih(islem.tarih) +
                   (kasa ? ` · ${kasa.ad}` : '') +
                   (cari ? ` · <span class="cari-rozet">${etiket}</span>` : '');
  } else {
    iconContent  = kategori?.emoji || (islem.tip === 'gelir' ? '▲' : '▼');
    iconBg       = islem.tip === 'gelir' ? '#e8f4e8' : '#faeaea';
    iconColor    = islem.tip === 'gelir' ? 'var(--success)' : 'var(--danger)';
    title        = islem.aciklama || kategori?.ad || (islem.tip === 'gelir' ? 'Gelir' : 'Gider');
    subtitle     = `${formatTarih(islem.tarih)} · ${kasa?.ad || '?'}`;
  }

  return `
    <div class="list-item" data-islem-id="${islem.id}" style="cursor:pointer">
      <div class="list-item-icon" style="background:${iconBg};color:${iconColor};font-size:16px">
        ${iconContent}
      </div>
      <div class="list-item-body">
        <div class="list-item-title">${title}</div>
        <div class="list-item-subtitle">${subtitle}</div>
      </div>
      <div class="list-item-amount" style="color:${tutarRenk}">${tutarStr}</div>
    </div>`;
}

function sortByOlusturma(liste) {
  return [...liste].sort((a, b) => (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0));
}

function filterIslemler(islemler, filter) {
  if (filter === 'tumu') return islemler;
  if (filter === 'cari') return islemler.filter(i => i.cariId);
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
    const sorted      = sortByOlusturma(islemler);
    const filtered    = filterIslemler(sorted, currentFilter);

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
        const sorted      = sortByOlusturma(islemler);
        const filtered    = filterIslemler(sorted, currentFilter);

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
