import { getIslemler, getKasalar, getKategoriler, getCariler } from '../state.js';
import { formatTarih, formatTL, islemTipiEtiketi, islemTutarFormati } from '../utils.js';
import { openIslemForm } from '../components/islemForm.js';
import { openIslemDetay } from '../components/islemDetay.js';

let currentFilter = 'tumu';
let currentSearch  = '';

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

function araIslemler(islemler, query, kasalar, kategoriler, cariler) {
  if (!query) return islemler;
  const q = query.toLowerCase();
  return islemler.filter(islem => {
    if (islem.aciklama?.toLowerCase().includes(q)) return true;
    const kat = kategoriler.find(k => k.id === islem.kategoriId);
    if (kat?.ad.toLowerCase().includes(q)) return true;
    const kasa = kasalar.find(k => k.id === islem.kasaId);
    if (kasa?.ad.toLowerCase().includes(q)) return true;
    const cari = islem.cariId ? cariler.find(c => c.id === islem.cariId) : null;
    if (cari?.ad.toLowerCase().includes(q)) return true;
    if (String(islem.tutar ?? '').includes(q)) return true;
    if (formatTarih(islem.tarih).toLowerCase().includes(q)) return true;
    return false;
  });
}

function ozetKarti(sorgu, sonuclar) {
  if (!sorgu || !sonuclar.length) return '';
  const net = sonuclar.reduce((s, i) => {
    if (i.cariEtkisi === 'borc_yaz' || i.cariEtkisi === 'borc_cikar') return s;
    if (i.tip === 'gelir') return s + (i.tutar || 0);
    if (i.tip === 'gider') return s - (i.tutar || 0);
    return s;
  }, 0);
  const tarihler = sonuclar.filter(i => i.tarih).map(i => i.tarih).sort();
  const ilk = tarihler[0];
  const son = tarihler[tarihler.length - 1];
  const netRenk   = net >= 0 ? 'var(--success)' : 'var(--danger)';
  const netDisplay = (net >= 0 ? '+' : '-') + formatTL(Math.abs(net));
  let tarihHtml = '';
  if (ilk && ilk === son) {
    tarihHtml = `<span>Tarih: ${formatTarih(ilk)}</span>`;
  } else if (ilk) {
    tarihHtml = `<span>İlk: ${formatTarih(ilk)}</span><span>Son: ${formatTarih(son)}</span>`;
  }
  return `
    <div class="arama-ozet-kart">
      <div class="arama-ozet-baslik">🔍 "${sorgu}" — ${sonuclar.length} sonuç</div>
      <div class="arama-ozet-detaylar">
        <span style="color:${netRenk};font-weight:700">${netDisplay}</span>
        ${tarihHtml}
      </div>
    </div>`;
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

function emptyHtml(query) {
  if (query) {
    return `<div class="placeholder-view">
      <div class="placeholder-icon">🔍</div>
      <div class="placeholder-text">
        "${query}" için sonuç bulunamadı<br>
        <span style="font-size:13px;color:var(--text-secondary)">Farklı bir kelime deneyin veya filtreyi temizleyin</span>
      </div>
    </div>`;
  }
  return `<div class="placeholder-view">
    <div class="placeholder-icon">₺</div>
    <div class="placeholder-text">Henüz kayıt yok.<br>Sağ alttaki + butonuna dokun.</div>
  </div>`;
}

export default {
  render() {
    const navFilter = localStorage.getItem('islemler-filter');
    if (navFilter) { currentFilter = navFilter; localStorage.removeItem('islemler-filter'); }

    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const cariler     = getCariler();
    const sorted      = sortByOlusturma(islemler);
    const filtered    = filterIslemler(sorted, currentFilter);
    const sonuclar    = araIslemler(filtered, currentSearch, kasalar, kategoriler, cariler);
    const activeClass = f => currentFilter === f ? 'active' : '';

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">İşlemler (${sonuclar.length})</span>
        <button class="btn btn-primary btn-sm" id="btnYeniIslem">+ Yeni</button>
      </div>

      <div class="arama-kutusu-wrap">
        <span class="arama-icon">🔍</span>
        <input class="arama-input" id="islem-arama" type="text"
          placeholder="Hasta adı, açıklama, tutar veya kategori ara..."
          value="${currentSearch.replace(/"/g, '&quot;')}" autocomplete="off">
        <button class="arama-temizle" id="arama-temizle"
          style="${currentSearch ? '' : 'display:none'}" title="Temizle">×</button>
      </div>

      <div class="filter-tabs">
        <button class="filter-tab ${activeClass('tumu')}"     data-filter="tumu">Tümü</button>
        <button class="filter-tab ${activeClass('gelir')}"    data-filter="gelir">▲ Gelir</button>
        <button class="filter-tab ${activeClass('gider')}"    data-filter="gider">▼ Gider</button>
        <button class="filter-tab ${activeClass('transfer')}" data-filter="transfer">↔ Transfer</button>
        <button class="filter-tab ${activeClass('cari')}"     data-filter="cari">👥 Cari</button>
      </div>

      <div id="arama-ozet">${ozetKarti(currentSearch, sonuclar)}</div>

      <div id="islemler-list">
        ${sonuclar.length === 0
          ? emptyHtml(currentSearch)
          : sonuclar.map(i => islemItem(i, kasalar, kategoriler, cariler)).join('')
        }
      </div>
    `;
  },

  afterRender() {
    document.getElementById('btnYeniIslem')?.addEventListener('click', () => openIslemForm('gider'));
    attachListClick(document.getElementById('islemler-list'));

    function updateList() {
      const islemler    = getIslemler();
      const kasalar     = getKasalar();
      const kategoriler = getKategoriler();
      const cariler     = getCariler();
      const sorted      = sortByOlusturma(islemler);
      const filtered    = filterIslemler(sorted, currentFilter);
      const sonuclar    = araIslemler(filtered, currentSearch, kasalar, kategoriler, cariler);

      const titleEl = document.querySelector('.section-title');
      if (titleEl) titleEl.textContent = `İşlemler (${sonuclar.length})`;

      const temizleBtn = document.getElementById('arama-temizle');
      if (temizleBtn) temizleBtn.style.display = currentSearch ? '' : 'none';

      const ozetEl = document.getElementById('arama-ozet');
      if (ozetEl) ozetEl.innerHTML = ozetKarti(currentSearch, sonuclar);

      const listEl = document.getElementById('islemler-list');
      if (!listEl) return;
      listEl.innerHTML = sonuclar.length === 0
        ? emptyHtml(currentSearch)
        : sonuclar.map(i => islemItem(i, kasalar, kategoriler, cariler)).join('');
    }

    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.dataset.filter;
        document.querySelectorAll('.filter-tab').forEach(t =>
          t.classList.toggle('active', t.dataset.filter === currentFilter)
        );
        updateList();
      });
    });

    const aramaInput = document.getElementById('islem-arama');

    aramaInput?.addEventListener('input', () => {
      currentSearch = aramaInput.value;
      updateList();
    });

    aramaInput?.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        currentSearch = '';
        aramaInput.value = '';
        aramaInput.blur();
        updateList();
      }
    });

    document.getElementById('arama-temizle')?.addEventListener('click', () => {
      currentSearch = '';
      if (aramaInput) aramaInput.value = '';
      updateList();
      aramaInput?.focus();
    });

    function onSlashKey(e) {
      if (e.key !== '/') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const searchEl = document.getElementById('islem-arama');
      if (!searchEl) {
        document.removeEventListener('keydown', onSlashKey);
        return;
      }
      e.preventDefault();
      searchEl.focus();
      searchEl.select();
    }
    document.addEventListener('keydown', onSlashKey);
  }
};
