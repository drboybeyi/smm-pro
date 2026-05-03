import { getIslemler, getKasalar, getKategoriler, getCariler } from '../state.js';
import { formatTL, formatTarih, hesaplaCariBakiye, hesaplaSonrakiVade } from '../utils.js';
import { openIslemDetay } from '../components/islemDetay.js';

export function openTakvim() {
  if (document.getElementById('takvim-overlay')) return;

  const now = new Date();
  let viewYear  = now.getFullYear();
  let viewMonth = now.getMonth();

  const overlay = document.createElement('div');
  overlay.id = 'takvim-overlay';
  overlay.className = 'modal-overlay';
  document.body.appendChild(overlay);

  function render() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const cariler     = getCariler();

    const ayPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const dayNetMap = {};
    islemler.forEach(islem => {
      if (!islem.tarih || !islem.tarih.startsWith(ayPrefix)) return;
      const net = islem.tip === 'gelir' ? (islem.tutar || 0)
                : islem.tip === 'gider' ? -(islem.tutar || 0)
                : 0;
      dayNetMap[islem.tarih] = (dayNetMap[islem.tarih] || 0) + net;
    });

    // Build vade map for this month
    const vadeByGun = {};
    cariler.filter(c => c.tip === 'tedarikci' && c.vadeTipi && c.vadeTipi !== 'yok').forEach(cari => {
      let dateStr = null;
      if (cari.vadeTipi === 'her_ay' && cari.vadeGunu) {
        const gun    = Number(cari.vadeGunu);
        const maxDay = new Date(viewYear, viewMonth + 1, 0).getDate();
        const day    = Math.min(gun, maxDay);
        dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (cari.vadeTipi === 'tarih' && cari.vadeTarih?.startsWith(ayPrefix)) {
        dateStr = cari.vadeTarih;
      }
      if (dateStr) {
        if (!vadeByGun[dateStr]) vadeByGun[dateStr] = [];
        vadeByGun[dateStr].push(cari);
      }
    });

    const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                    'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const monthTitle  = `${MONTHS[viewMonth]} ${viewYear}`;
    const DAY_HEADERS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

    const firstDay = new Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayStr    = new Date().toISOString().slice(0, 10);

    let cells = '';
    for (let i = 0; i < startDow; i++) {
      cells += `<div class="cal-cell cal-cell-empty"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const net     = dayNetMap[dateStr];
      const isToday = dateStr === todayStr;
      const hasVade = !!vadeByGun[dateStr];

      let netHtml = '';
      if (net !== undefined && net !== 0) {
        const cls    = net > 0 ? 'cal-net-pos' : 'cal-net-neg';
        const absStr = formatTL(Math.abs(net));
        netHtml = `<span class="${cls}">${net > 0 ? '+' : '-'}${absStr}</span>`;
      }

      cells += `
        <div class="cal-cell${isToday ? ' cal-today' : ''}${net !== undefined ? ' cal-has-data' : ''}"
             data-date="${dateStr}">
          <span class="cal-day-num">${d}</span>
          ${netHtml}
          ${hasVade ? `<span class="cal-vade-dot">⚠️</span>` : ''}
        </div>`;
    }

    overlay.innerHTML = `
      <div class="modal-box takvim-box">
        <div class="modal-header">
          <span class="modal-title">Takvim</span>
          <button class="modal-close" id="takvim-close">✕</button>
        </div>
        <div class="takvim-nav">
          <button class="btn btn-secondary btn-sm" id="takvim-prev">‹ Önceki</button>
          <span class="takvim-month-title">${monthTitle}</span>
          <button class="btn btn-secondary btn-sm" id="takvim-next">Sonraki ›</button>
        </div>
        <div class="cal-grid">
          ${DAY_HEADERS.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}
          ${cells}
        </div>
      </div>`;

    document.getElementById('takvim-close')?.addEventListener('click', close);

    document.getElementById('takvim-prev')?.addEventListener('click', () => {
      viewMonth--;
      if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      render();
    });

    document.getElementById('takvim-next')?.addEventListener('click', () => {
      viewMonth++;
      if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      render();
    });

    overlay.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr     = cell.dataset.date;
        const gunIslemler = islemler.filter(i => i.tarih === dateStr);
        const gunVade     = vadeByGun[dateStr] || [];
        if (gunIslemler.length || gunVade.length) {
          showGunDetay(dateStr, gunIslemler, kasalar, kategoriler, gunVade, islemler);
        }
      });
    });
  }

  function close() {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  render();
}

function showGunDetay(dateStr, islemler, kasalar, kategoriler, vadeCari, tumIslemler) {
  if (document.getElementById('gun-detay-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'gun-detay-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '210';

  let gunGelir = 0, gunGider = 0;
  islemler.forEach(i => {
    if (i.tip === 'gelir') gunGelir += (i.tutar || 0);
    if (i.tip === 'gider') gunGider += (i.tutar || 0);
  });
  const gunNet = gunGelir - gunGider;

  function tipInfo(tip) {
    if (tip === 'gelir')  return { color: 'var(--success)', prefix: '+', cls: 'income' };
    if (tip === 'gider')  return { color: 'var(--danger)',  prefix: '-', cls: 'expense' };
    return                       { color: 'var(--accent)',  prefix: '',  cls: 'transfer' };
  }

  const vadeHtml = vadeCari.length ? `
    <div class="gun-vade-section">
      <div style="font-size:12px;font-weight:700;color:var(--warning);margin-bottom:6px">⚠️ Vadesi Gelen Ödemeler</div>
      ${vadeCari.map(c => {
        const bakiye = hesaplaCariBakiye(c.id, tumIslemler);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
          <span style="font-size:13px">${c.ad}</span>
          <span style="font-size:13px;font-weight:700;color:var(--danger)">${formatTL(Math.abs(bakiye))}</span>
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
}
