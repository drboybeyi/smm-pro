import { getGelirler, getGiderler } from '../state.js';
import { formatTL, formatTarih, formatAy, bugun } from '../utils.js';

function calcMetrics(gelirler, giderler, ay) {
  const ayGelir = gelirler.filter(g => g.tarih.startsWith(ay));
  const ayGider = giderler.filter(x => x.tarih.startsWith(ay));

  const brutGelir = ayGelir.reduce((s, g) => s + (g.brutTutar || 0), 0);
  const kdvGelir  = ayGelir.reduce((s, g) => s + (g.kdvTutari || 0), 0);
  const topGider  = ayGider.reduce((s, x) => s + (x.netTutar  || 0), 0);
  const netKar    = brutGelir - topGider;

  return { brutGelir, kdvGelir, topGider, netKar, ayGelir };
}

function metricCard(label, value, cls) {
  return `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value ${cls}">${formatTL(value)}</div>
    </div>`;
}

function recentList(kayitlar) {
  if (!kayitlar.length) {
    return '<p style="text-align:center;font-size:13px;color:var(--text-secondary);padding:12px 0">Bu ay kayıt yok</p>';
  }
  return kayitlar
    .slice()
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, 3)
    .map(g => `
      <div class="list-item">
        <div class="list-item-icon" style="background:#e8f4e8;color:var(--success);font-weight:700;font-size:12px">
          #${g.smmNo}
        </div>
        <div class="list-item-body">
          <div class="list-item-title">${g.hastaAdi || '—'}</div>
          <div class="list-item-subtitle">${formatTarih(g.tarih)} &middot; ${g.hizmetTipi}</div>
        </div>
        <div class="list-item-amount income">${formatTL(g.toplamTutar)}</div>
      </div>`)
    .join('');
}

export default {
  render() {
    const gelirler = getGelirler();
    const giderler = getGiderler();
    const ay = bugun().slice(0, 7);
    const { brutGelir, kdvGelir, topGider, netKar, ayGelir } = calcMetrics(gelirler, giderler, ay);

    return `
      <div class="warning-banner">
        ⚠️ Tüm hesaplamalar tahminidir. Kesin rakamlar için mali müşavirinize danışınız.
      </div>

      <div class="month-selector">
        <button disabled>&#8249;</button>
        <span class="month-display">${formatAy(bugun())}</span>
        <button disabled>&#8250;</button>
      </div>

      <div class="metrics-grid">
        ${metricCard('Brüt Gelir',   brutGelir, 'success')}
        ${metricCard('Tahsil KDV',   kdvGelir,  'warning')}
        ${metricCard('Toplam Gider', topGider,  'danger')}
        ${metricCard('Net Kar',      netKar,    netKar >= 0 ? 'success' : 'danger')}
      </div>

      <div class="section-header">
        <span class="section-title">Bu Ay — Son Gelirler</span>
        <a href="#gelir" class="btn btn-secondary btn-sm">Tümü →</a>
      </div>
      ${recentList(ayGelir)}

      <div class="section-header">
        <span class="section-title">Hızlı İşlem</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;padding-bottom:4px">
        <button class="btn btn-primary" data-action="add-gelir">+ Gelir Ekle</button>
        <a href="#gider" class="btn btn-secondary">+ Gider Ekle</a>
        <a href="#rapor" class="btn btn-secondary">Raporlar</a>
      </div>
    `;
  },

  afterRender() {
    document.querySelector('[data-action="add-gelir"]')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('smm:open-gelir-form'));
    });
  }
};
