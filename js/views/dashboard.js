import { getIslemler, getKasalar, getKategoriler, getCariler, getVadeler } from '../state.js';
import {
  formatTL, formatTarih, formatAy, bugun, gunFarki,
  hesaplaCariBakiye, hesaplaSonrakiVade,
  bugunIslemleri, kasaBugunkiHareket, bugunNetGelirGider, kasaTipiBul, formatTarihUzun
} from '../utils.js';
import { hesaplaKasaBakiyesi } from '../db.js';
import { openIslemForm } from '../components/islemForm.js';
import { openIslemDetay } from '../components/islemDetay.js';

function calcMetrics(islemler, ay) {
  const ayIslemler = islemler.filter(i => i.tarih && i.tarih.startsWith(ay));
  const ayGelir = ayIslemler.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const ayGider = ayIslemler.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  return { ayGelir, ayGider, ayNet: ayGelir - ayGider };
}

function metricCard(label, value, cls) {
  return `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value ${cls}">${formatTL(value)}</div>
    </div>`;
}

function kasalarList(kasalar, islemler) {
  if (!kasalar.length) return '';
  return kasalar.map(k => {
    const bakiye = hesaplaKasaBakiyesi(k.id, islemler);
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:14px">${k.emoji} ${k.ad}</span>
        <span style="font-size:14px;font-weight:700;color:${bakiye >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatTL(bakiye)}</span>
      </div>`;
  }).join('');
}

function bugunSection(islemler, kasalar, kategoriler, today) {
  const { net } = bugunNetGelirGider(islemler);
  const todayList = bugunIslemleri(islemler);

  const nakitKasa = kasaTipiBul(kasalar, 'nakit');
  const kartKasa  = kasaTipiBul(kasalar, 'kart');
  const bankaKasa = kasaTipiBul(kasalar, 'banka');

  const nakitH = nakitKasa ? kasaBugunkiHareket(nakitKasa.id, islemler) : null;
  const kartH  = kartKasa  ? kasaBugunkiHareket(kartKasa.id,  islemler) : null;
  const bankaH = bankaKasa ? kasaBugunkiHareket(bankaKasa.id, islemler) : null;

  const mainIds    = [nakitKasa?.id, kartKasa?.id, bankaKasa?.id].filter(Boolean);
  const digerKasas = kasalar.filter(k => !mainIds.includes(k.id));

  const digerItems = digerKasas.map(k => {
    const h = kasaBugunkiHareket(k.id, islemler);
    if (!h) return '';
    return `<div class="bugun-diger-item">
      <span>${k.emoji} ${k.ad}</span>
      <span style="font-weight:600;color:${h >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${h > 0 ? '+' : ''}${formatTL(h)}
      </span>
    </div>`;
  }).filter(Boolean).join('');

  function kart(label, value, show) {
    if (!show) return '';
    const col = value === 0 ? 'var(--text-secondary)' : value > 0 ? 'var(--success)' : 'var(--danger)';
    return `<div class="bugun-kart">
      <div class="bugun-kart-label">${label}</div>
      <div class="bugun-kart-tutar" style="color:${col}">${value > 0 ? '+' : ''}${formatTL(value)}</div>
    </div>`;
  }

  const islemHtml = todayList.length === 0
    ? '<p style="font-size:13px;color:var(--text-secondary);padding:8px 0">Bugün işlem yok.</p>'
    : todayList.map(i => {
        const kas = kasalar.find(k => k.id === i.kasaId);
        const kat = kategoriler.find(k => k.id === i.kategoriId);
        const cls    = i.tip === 'gelir' ? 'income' : i.tip === 'gider' ? 'expense' : 'transfer';
        const prefix = i.tip === 'gelir' ? '+' : i.tip === 'gider' ? '-' : '';
        const title  = i.aciklama || kat?.ad || (i.tip === 'transfer' ? 'Transfer' : i.tip);
        return `<div class="list-item bugun-islem-item" data-islem-id="${i.id}" style="cursor:pointer">
          <div class="list-item-body">
            <div class="list-item-title">${title}</div>
            <div class="list-item-subtitle">${kas?.ad || ''}</div>
          </div>
          <div class="list-item-amount ${cls}">${prefix}${formatTL(i.tutar)}</div>
        </div>`;
      }).join('');

  return `
    <div class="section-header">
      <span class="section-title">Bugün</span>
      <span style="font-size:12px;color:var(--text-secondary)">${formatTarihUzun(today)}</span>
    </div>
    <div class="bugun-grid">
      ${kart('Toplam', net, true)}
      ${kart('Nakit',  nakitH ?? 0, !!nakitKasa)}
      ${kart('Kart',   kartH  ?? 0, !!kartKasa)}
      ${kart('Banka',  bankaH ?? 0, !!bankaKasa)}
    </div>
    ${digerItems ? `
      <div class="bugun-diger-list" id="bugun-diger-list" style="display:none">${digerItems}</div>
      <button class="btn btn-secondary btn-sm" id="bugun-diger-btn" style="width:100%;margin-bottom:8px">
        Diğer Kasalar ▼
      </button>
    ` : ''}
    <div id="bugun-islemler">${islemHtml}</div>`;
}

function yaklaşanOdemelerCard(cariler, islemler, vadeler, today) {
  const yaklaşanlar = vadeler
    .filter(v => v.durum === 'bekliyor')
    .map(v => {
      const fark = gunFarki(v.vadeTarih, today);
      if (fark < 0 || fark > 7) return null;
      const cari = cariler.find(c => c.id === v.cariId);
      if (!cari) return null;
      return { cari, vade: v, fark };
    })
    .filter(Boolean)
    .sort((a, b) => a.fark - b.fark);

  const inner = yaklaşanlar.length === 0
    ? `<p style="font-size:13px;color:var(--text-secondary);padding:8px 0">✓ Yaklaşan ödeme yok</p>`
    : yaklaşanlar.map(({ cari, vade, fark }) => `
        <div class="dash-vade-row" data-cari-id="${cari.id}"
             style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
          <div>
            <div style="font-size:14px;font-weight:600">${cari.ad}</div>
            <div style="font-size:12px;color:var(--warning)">${fark === 0 ? 'Bugün!' : fark + ' gün sonra'} · ${formatTarih(vade.vadeTarih)}</div>
          </div>
          <span style="font-size:14px;font-weight:700;color:var(--danger)">${formatTL(vade.tutar)}</span>
        </div>`).join('');

  return `
    <div class="section-header">
      <button class="section-title" id="dashCariBtn" style="background:none;border:none;font-weight:600;font-size:15px;color:var(--text-primary);cursor:pointer;padding:0;font-family:inherit">
        ⚠️ Yaklaşan Ödemeler
      </button>
      <a class="btn btn-secondary btn-sm" id="dashTumCariler">Tümü →</a>
    </div>
    <div class="card mb-3" style="padding:4px 16px">${inner}</div>`;
}

function recentList(islemler, kasalar, kategoriler) {
  const son5 = islemler.slice(0, 5);
  if (!son5.length) {
    return '<p style="text-align:center;font-size:13px;color:var(--text-secondary);padding:12px 0">Henüz işlem yok</p>';
  }
  return son5.map(islem => {
    const kasa     = kasalar.find(k => k.id === islem.kasaId);
    const kategori = kategoriler.find(k => k.id === islem.kategoriId);

    let iconContent, iconBg, iconColor, title, amountClass, prefix;

    if (islem.tip === 'gelir') {
      iconContent = kategori?.emoji || '▲';
      iconBg      = '#e8f4e8';
      iconColor   = 'var(--success)';
      amountClass = 'income';
      prefix      = '+';
      title       = islem.aciklama || kategori?.ad || 'Gelir';
    } else if (islem.tip === 'gider') {
      iconContent = kategori?.emoji || '▼';
      iconBg      = '#faeaea';
      iconColor   = 'var(--danger)';
      amountClass = 'expense';
      prefix      = '-';
      title       = islem.aciklama || kategori?.ad || 'Gider';
    } else {
      const hedefKasa = kasalar.find(k => k.id === islem.hedefKasaId);
      iconContent = '↔';
      iconBg      = 'var(--bg-secondary)';
      iconColor   = 'var(--accent)';
      amountClass = 'transfer';
      prefix      = '';
      title       = `${kasa?.ad || '?'} → ${hedefKasa?.ad || '?'}`;
    }

    return `
      <div class="list-item">
        <div class="list-item-icon" style="background:${iconBg};color:${iconColor};font-size:16px">
          ${iconContent}
        </div>
        <div class="list-item-body">
          <div class="list-item-title">${title}</div>
          <div class="list-item-subtitle">${formatTarih(islem.tarih)} · ${kasa?.ad || (islem.cariId ? 'Cari' : '?')}</div>
        </div>
        <div class="list-item-amount ${amountClass}">${prefix}${formatTL(islem.tutar)}</div>
      </div>`;
  }).join('');
}

export default {
  render() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const cariler     = getCariler();
    const vadeler     = getVadeler();
    const ay          = bugun().slice(0, 7);
    const today       = bugun();
    const { ayGelir, ayGider, ayNet } = calcMetrics(islemler, ay);
    const toplamBakiye = kasalar.reduce((sum, k) => sum + hesaplaKasaBakiyesi(k.id, islemler), 0);

    return `
      <div class="month-selector">
        <button disabled>&#8249;</button>
        <span class="month-display">${formatAy(bugun())}</span>
        <button disabled>&#8250;</button>
      </div>

      <div class="metrics-grid">
        ${metricCard('Bu ay Gelir',    ayGelir,      'success')}
        ${metricCard('Bu ay Gider',    ayGider,      'danger')}
        ${metricCard('Bu ay Net',      ayNet,        ayNet        >= 0 ? 'success' : 'danger')}
        ${metricCard('Kasalar Bakiye', toplamBakiye, toplamBakiye >= 0 ? 'success' : 'danger')}
      </div>

      ${bugunSection(islemler, kasalar, kategoriler, today)}

      ${kasalar.length ? `
        <div class="section-header">
          <span class="section-title">Kasalar</span>
          <a href="#kasalar" class="btn btn-secondary btn-sm">Tümü →</a>
        </div>
        <div class="card mb-3" style="padding:4px 16px">
          ${kasalarList(kasalar, islemler)}
        </div>
      ` : ''}

      ${yaklaşanOdemelerCard(cariler, islemler, vadeler, today)}

      <div class="section-header">
        <span class="section-title">Son İşlemler</span>
        <a href="#islemler" class="btn btn-secondary btn-sm">Tümü →</a>
      </div>
      ${recentList(islemler, kasalar, kategoriler)}

      <div class="section-header">
        <span class="section-title">Hızlı İşlem</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;padding-bottom:4px">
        <button class="btn btn-primary" id="dashIslemBtn" type="button">+ İşlem Ekle</button>
        <a href="#kasalar" class="btn btn-secondary">Kasalar</a>
        <a href="#kategoriler" class="btn btn-secondary">Kategoriler</a>
      </div>
    `;
  },

  afterRender() {
    document.getElementById('dashIslemBtn')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openIslemForm('gider');
    });

    document.getElementById('dashCariBtn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('defter:open-cariler'));
    });

    document.getElementById('dashTumCariler')?.addEventListener('click', e => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('defter:open-cariler'));
    });

    document.querySelectorAll('.dash-vade-row').forEach(row => {
      row.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('defter:open-cari-detay', {
          detail: { cariId: row.dataset.cariId }
        }));
      });
    });

    const digerBtn = document.getElementById('bugun-diger-btn');
    const digerList = document.getElementById('bugun-diger-list');
    digerBtn?.addEventListener('click', () => {
      const open = digerList.style.display !== 'none';
      digerList.style.display = open ? 'none' : 'block';
      digerBtn.textContent = open ? 'Diğer Kasalar ▼' : 'Diğer Kasalar ▲';
    });

    document.querySelectorAll('.bugun-islem-item').forEach(item => {
      item.addEventListener('click', () => {
        const id    = item.dataset.islemId;
        const islem = getIslemler().find(i => i.id === id);
        if (islem) openIslemDetay(islem);
      });
    });
  }
};
