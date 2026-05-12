import { getIslemler, getKasalar, getKategoriler, getCariler, getVadeler } from '../state.js';
import {
  formatTL, formatTarih, kisaltilmisRakam, gunKasaOzeti,
  islemKasaHarekedinSayilirMi, vadeRengiSinifi
} from '../utils.js';
import { openIslemDetay } from '../components/islemDetay.js';
import { openAyOzet } from './ayOzet.js';

const MONTHS      = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                     'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAY_HEADERS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();

export function openTakvim() {
  location.hash = '#takvim';
}

// ─── Grid ─────────────────────────────────────────────────────

function buildGrid(islemler, vadeler) {
  const ayPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const todayStr = new Date().toISOString().slice(0, 10);

  const vadeByGun = {};
  vadeler
    .filter(v => v.durum === 'bekliyor' && v.vadeTarih?.startsWith(ayPrefix))
    .forEach(v => {
      if (!vadeByGun[v.vadeTarih]) vadeByGun[v.vadeTarih] = [];
      vadeByGun[v.vadeTarih].push(v);
    });

  const daysWithIslemler = new Set(
    islemler
      .filter(i => i.tarih?.startsWith(ayPrefix) &&
                   i.cariEtkisi !== 'borc_yaz' &&
                   i.cariEtkisi !== 'borc_cikar')
      .map(i => i.tarih)
  );

  const dayGelirMap = {};
  islemler
    .filter(i => i.tarih?.startsWith(ayPrefix) && islemKasaHarekedinSayilirMi(i) && i.tip === 'gelir')
    .forEach(i => {
      dayGelirMap[i.tarih] = (dayGelirMap[i.tarih] || 0) + (i.tutar || 0);
    });

  const firstDay    = new Date(viewYear, viewMonth, 1);
  let startDow      = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevY            = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevM            = viewMonth === 0 ? 11 : viewMonth - 1;
  const prevMonthLastDay = new Date(prevY, prevM + 1, 0).getDate();
  const nextY            = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextM            = viewMonth === 11 ? 0 : viewMonth + 1;

  let cells = '';

  // Previous month overflow (greyed)
  for (let i = startDow - 1; i >= 0; i--) {
    const d       = prevMonthLastDay - i;
    const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells += `<div class="cal-cell cal-cell-other-month" data-date="${dateStr}" data-other-month="prev">
      <span class="cal-day-num">${d}</span>
    </div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr    = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday    = dateStr === todayStr;
    const gunVadeler = vadeByGun[dateStr] || [];
    const hasVade    = gunVadeler.length > 0;
    const vadeToplam = gunVadeler.reduce((s, v) => s + (v.tutar || 0), 0);
    const hasData    = daysWithIslemler.has(dateStr);
    const dayGelir   = dayGelirMap[dateStr] || 0;

    const gelirHtml = dayGelir > 0
      ? `<span class="cal-gun-gelir">+${kisaltilmisRakam(dayGelir)}</span>`
      : '';

    let vadeHtml = '';
    if (hasVade) {
      const vRenk = isToday ? '#b83030' : 'var(--warning)';
      vadeHtml = `<span class="cal-vade-tutar" style="color:${vRenk}">💸${kisaltilmisRakam(vadeToplam)}</span>`;
    }

    const vadeSinif = hasVade ? vadeRengiSinifi(dateStr) : '';
    cells += `
      <div class="cal-cell${isToday ? ' cal-today' : ''}${hasData ? ' cal-has-data' : ''}${isToday && hasVade ? ' cal-today-vade-pulse' : ''}${vadeSinif ? ' ' + vadeSinif : ''}"
           data-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${gelirHtml}
        ${vadeHtml}
      </div>`;
  }

  // Next month overflow
  const totalCells = startDow + daysInMonth;
  const remainder  = totalCells % 7;
  if (remainder !== 0) {
    const extraDays = 7 - remainder;
    for (let d = 1; d <= extraDays; d++) {
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells += `<div class="cal-cell cal-cell-other-month" data-date="${dateStr}" data-other-month="next">
        <span class="cal-day-num">${d}</span>
      </div>`;
    }
  }

  return cells;
}

// ─── Mini Özet Bar ────────────────────────────────────────────

function buildMiniOzet(islemler, vadeler) {
  const ayPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const ayIslem  = islemler.filter(i => i.tarih?.startsWith(ayPrefix) && islemKasaHarekedinSayilirMi(i));
  const gelir    = ayIslem.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const gider    = ayIslem.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  const net      = gelir - gider;
  const vadeSay  = vadeler.filter(v => v.durum === 'bekliyor' && v.vadeTarih?.startsWith(ayPrefix)).length;

  const netRenk = net >= 0 ? 'var(--success)' : 'var(--danger)';
  const netStr  = (net >= 0 ? '+' : '') + formatTL(net);

  return `
    <div class="takvim-mini-ozet" id="takvimMiniOzet">
      <span style="color:${netRenk};font-weight:700">📊 Bu Ay: ${netStr}</span>
      ${vadeSay > 0 ? `<span class="takvim-mini-vade"> · ⚠️ ${vadeSay} vade</span>` : ''}
    </div>`;
}

// ─── Yıl Bar ──────────────────────────────────────────────────

function buildYilBar(islemler) {
  const yilSet = new Set(islemler.map(i => i.tarih?.slice(0, 4)).filter(Boolean));
  yilSet.add(String(new Date().getFullYear()));
  const yillar = Array.from(yilSet).sort();
  if (yillar.length <= 1) return '';

  return `
    <div class="takvim-yil-bar">
      📅 ${yillar.map(y =>
        `<button class="takvim-yil-btn${Number(y) === viewYear ? ' aktif' : ''}" data-yil="${y}">${y}</button>`
      ).join('')}
    </div>`;
}

// ─── Page View Export ─────────────────────────────────────────

export default {
  render() {
    const islemler = getIslemler();
    const vadeler  = getVadeler();
    const now      = new Date();
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

    return `
      <div class="takvim-page">
        <div class="takvim-page-header">
          <button class="takvim-nav-btn" id="takvimPagePrev">‹</button>
          <button class="takvim-ay-baslik" id="takvimPageAyBaslik">${MONTHS[viewMonth]} ${viewYear}</button>
          <button class="takvim-nav-btn" id="takvimPageNext">›</button>
          ${!isCurrentMonth
            ? `<button class="takvim-bugun-btn" id="takvimPageBugun">📍 Bugün</button>`
            : ''}
        </div>
        ${buildMiniOzet(islemler, vadeler)}
        <div class="cal-grid takvim-page-grid">
          ${DAY_HEADERS.map((h, i) =>
            `<div class="cal-header-cell${i >= 5 ? ' cal-header-weekend' : ''}">${h}</div>`
          ).join('')}
          ${buildGrid(islemler, vadeler)}
        </div>
        ${buildYilBar(islemler)}
      </div>`;
  },

  afterRender() {
    const appEl = document.getElementById('app');

    const rerender = () => {
      appEl.innerHTML = this.render();
      this.afterRender();
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    document.getElementById('takvimPagePrev')?.addEventListener('click', () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      rerender();
    });

    document.getElementById('takvimPageNext')?.addEventListener('click', () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      rerender();
    });

    document.getElementById('takvimPageBugun')?.addEventListener('click', () => {
      const n  = new Date();
      viewYear  = n.getFullYear();
      viewMonth = n.getMonth();
      rerender();
    });

    document.getElementById('takvimPageAyBaslik')?.addEventListener('click', () => openAyOzet());
    document.getElementById('takvimMiniOzet')?.addEventListener('click', () => openAyOzet());

    document.querySelectorAll('.takvim-yil-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        viewYear = Number(btn.dataset.yil);
        rerender();
      });
    });

    // Cell click handlers
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const cariler     = getCariler();
    const vadeler     = getVadeler();
    const ayPrefix    = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

    const vadeByGun = {};
    vadeler
      .filter(v => v.durum === 'bekliyor' && v.vadeTarih?.startsWith(ayPrefix))
      .forEach(v => {
        if (!vadeByGun[v.vadeTarih]) vadeByGun[v.vadeTarih] = [];
        vadeByGun[v.vadeTarih].push(v);
      });

    document.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.date;

        if (cell.dataset.otherMonth) {
          const [y, m] = dateStr.split('-').map(Number);
          viewYear  = y;
          viewMonth = m - 1;
          rerender();
          return;
        }

        const gunIslemler = islemler.filter(i =>
          i.tarih === dateStr &&
          i.cariEtkisi !== 'borc_yaz' &&
          i.cariEtkisi !== 'borc_cikar'
        );
        const gunVadeler = vadeByGun[dateStr] || [];
        if (gunIslemler.length || gunVadeler.length) {
          showGunDetay(dateStr, gunIslemler, kasalar, kategoriler, gunVadeler, cariler, islemler);
        }
      });
    });
  }
};

// ─── Gün Detay Modal ──────────────────────────────────────────

function showGunDetay(dateStr, islemler, kasalar, kategoriler, gunVadeler, cariler, tumIslemler) {
  if (document.getElementById('gun-detay-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'gun-detay-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '210';

  let gunGelir = 0, gunGider = 0;
  islemler.forEach(i => {
    if (i.cariEtkisi === 'borc_yaz' || i.cariEtkisi === 'borc_cikar') return;
    if (i.tip === 'gelir') gunGelir += (i.tutar || 0);
    if (i.tip === 'gider') gunGider += (i.tutar || 0);
  });
  const gunNet = gunGelir - gunGider;

  function tipInfo(tip) {
    if (tip === 'gelir')  return { color: 'var(--success)', prefix: '+', cls: 'income' };
    if (tip === 'gider')  return { color: 'var(--danger)',  prefix: '-', cls: 'expense' };
    return                       { color: 'var(--accent)',  prefix: '',  cls: 'transfer' };
  }

  const vadeHtml = gunVadeler.length ? `
    <div class="gun-vade-section">
      <div style="font-size:12px;font-weight:700;color:var(--warning);margin-bottom:6px">⚠️ Vadesi Gelen Ödemeler</div>
      ${gunVadeler.map(v => {
        const cari = cariler.find(c => c.id === v.cariId);
        return `<div class="gun-vade-row" data-cari-id="${v.cariId}"
                    style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;cursor:pointer">
          <span style="font-size:13px">${cari?.ad || '—'}</span>
          <span style="font-size:13px;font-weight:700;color:var(--danger)">${formatTL(v.tutar)}</span>
        </div>`;
      }).join('')}
    </div>
    <hr style="margin:8px 0;border:none;border-top:1px solid var(--border)">` : '';

  const kasaOzeti = gunKasaOzeti(dateStr, kasalar, tumIslemler);
  const kasaHtml = kasaOzeti.length ? `
    <div class="gun-kasa-section">
      <div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">💰 Kasa Hareketleri</div>
      ${kasaOzeti.map(({ ad, emoji, gelir, gider, net }) => {
        const netRenk = net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--text-secondary)';
        const netSign = net > 0 ? '+' : '';
        return `<div class="gun-kasa-satir">
          <span>${emoji} ${ad}</span>
          <span style="font-size:12px;color:var(--text-secondary)">
            ${gelir > 0 ? `+${formatTL(gelir)}` : ''}${gelir > 0 && gider > 0 ? ' / ' : ''}${gider > 0 ? `-${formatTL(gider)}` : ''}
          </span>
          <span style="font-weight:700;color:${netRenk}">${netSign}${formatTL(net)}</span>
        </div>`;
      }).join('')}
    </div>
    <hr style="margin:8px 0;border:none;border-top:1px solid var(--border)">` : '';

  const listHTML = islemler.map(islem => {
    const { color, prefix, cls } = tipInfo(islem.tip);
    const kasa     = kasalar.find(k => k.id === islem.kasaId);
    const kategori = kategoriler.find(k => k.id === islem.kategoriId);
    let title, iconContent;

    if (islem.tip === 'transfer') {
      const hedefKasa = kasalar.find(k => k.id === islem.hedefKasaId);
      iconContent = '↔';
      title = `${kasa?.ad || '?'} → ${hedefKasa?.ad || '?'}`;
    } else {
      iconContent = kategori?.emoji || (islem.tip === 'gelir' ? '▲' : '▼');
      title = islem.aciklama || kategori?.ad || (islem.tip === 'gelir' ? 'Gelir' : 'Gider');
    }

    return `
      <div class="list-item gun-islem-item" data-islem-id="${islem.id}" style="cursor:pointer">
        <div class="list-item-icon" style="color:${color};font-size:16px;background:transparent">${iconContent}</div>
        <div class="list-item-body">
          <div class="list-item-title">${title}</div>
          <div class="list-item-subtitle">${kasa?.ad || ''}</div>
        </div>
        <div class="list-item-amount ${cls}">${prefix}${formatTL(islem.tutar)}</div>
      </div>`;
  }).join('');

  const netColor  = gunNet >= 0 ? 'var(--success)' : 'var(--danger)';
  const netPrefix = gunNet >= 0 ? '+' : '';

  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">${formatTarih(dateStr)}</span>
        <button class="modal-close" id="gun-detay-close">✕</button>
      </div>
      <div class="modal-body" style="padding-top:8px">
        ${vadeHtml}
        ${kasaHtml}
        ${islemler.length ? `
        <div class="gun-detay-ozet">
          <span class="gun-ozet-item" style="color:var(--success)">+${formatTL(gunGelir)}</span>
          <span class="gun-ozet-sep">·</span>
          <span class="gun-ozet-item" style="color:var(--danger)">-${formatTL(gunGider)}</span>
          <span class="gun-ozet-sep">·</span>
          <span class="gun-ozet-item" style="color:${netColor}">Net: ${netPrefix}${formatTL(gunNet)}</span>
        </div>
        <div id="gun-islemler-list">${listHTML}</div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="gun-detay-kapat">Kapat</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const closeModal = () => {
    modal.classList.add('modal-closing');
    setTimeout(() => modal.remove(), 220);
  };

  modal.querySelector('#gun-detay-close')?.addEventListener('click', closeModal);
  modal.querySelector('#gun-detay-kapat')?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  modal.querySelectorAll('.gun-islem-item').forEach(item => {
    item.addEventListener('click', () => {
      const id    = item.dataset.islemId;
      const islem = islemler.find(i => i.id === id);
      if (!islem) return;
      closeModal();
      setTimeout(() => openIslemDetay(islem), 240);
    });
  });

  modal.querySelectorAll('.gun-vade-row').forEach(row => {
    row.addEventListener('click', () => {
      closeModal();
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('defter:open-cari-detay', {
          detail: { cariId: row.dataset.cariId }
        }));
      }, 240);
    });
  });
}
