import { getIslemler, getKasalar, getKategoriler, getCariler } from '../state.js';
import { formatTL, formatTarih, formatAy, bugun, hesaplaCariBakiye, hesaplaSonrakiVade, gunFarki } from '../utils.js';
import { hesaplaKasaBakiyesi } from '../db.js';
import { openIslemForm } from '../components/islemForm.js';

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

function yaklaşanOdemelerCard(cariler, islemler, today) {
  const yaklaşanlar = cariler
    .filter(c => c.tip === 'tedarikci' && c.vadeTipi && c.vadeTipi !== 'yok')
    .map(c => {
      const vade = hesaplaSonrakiVade(c, today);
      if (!vade) return null;
      const fark = gunFarki(vade, today);
      if (fark < 0 || fark > 7) return null;
      const bakiye = hesaplaCariBakiye(c.id, islemler);
      return { cari: c, fark, bakiye };
    })
    .filter(Boolean)
    .sort((a, b) => a.fark - b.fark);

  const inner = yaklaşanlar.length === 0
    ? `<p style="font-size:13px;color:var(--text-secondary);padding:8px 0">✓ Yaklaşan ödeme yok</p>`
    : yaklaşanlar.map(({ cari, fark, bakiye }) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:14px;font-weight:600">${cari.ad}</div>
            <div style="font-size:12px;color:var(--warning)">${fark === 0 ? 'Bugün!' : fark + ' gün sonra'}</div>
          </div>
          <span style="font-size:14px;font-weight:700;color:var(--danger)">${formatTL(Math.abs(bakiye))}</span>
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

      ${kasalar.length ? `
        <div class="section-header">
          <span class="section-title">Kasalar</span>
          <a href="#kasalar" class="btn btn-secondary btn-sm">Tümü →</a>
        </div>
        <div class="card mb-3" style="padding:4px 16px">
          ${kasalarList(kasalar, islemler)}
        </div>
      ` : ''}

      ${yaklaşanOdemelerCard(cariler, islemler, today)}

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
  }
};
