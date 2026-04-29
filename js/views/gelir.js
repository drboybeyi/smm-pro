import { getGelirler } from '../state.js';
import { formatTL, formatTarih, hizmetTipiLabel, odemeSekliLabel } from '../utils.js';

function kdvBadge(kdvDurumu) {
  if (kdvDurumu === 'muaf') return '<span class="badge badge-muaf">KDV Muaf</span>';
  return `<span class="badge badge-kdv">KDV %${kdvDurumu}</span>`;
}

function odemeBadge(sekil) {
  return `<span class="badge badge-${sekil}">${odemeSekliLabel(sekil)}</span>`;
}

function gelirItem(g) {
  return `
    <div class="list-item">
      <div class="list-item-icon" style="background:#e8f4e8;color:var(--success);font-weight:700;font-size:12px;flex-shrink:0">
        #${g.smmNo}
      </div>
      <div class="list-item-body">
        <div class="list-item-title">${g.hastaAdi || '—'}</div>
        <div class="list-item-subtitle">
          <span>${formatTarih(g.tarih)}</span>
          <span>&middot;</span>
          <span>${hizmetTipiLabel(g.hizmetTipi)}</span>
          <span>&middot;</span>
          ${kdvBadge(g.kdvDurumu)}
          ${odemeBadge(g.odemeSekli)}
        </div>
        ${g.notlar ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:3px">${g.notlar}</div>` : ''}
      </div>
      <div class="list-item-amount income">${formatTL(g.toplamTutar)}</div>
    </div>`;
}

export default {
  render() {
    const gelirler  = [...getGelirler()].sort((a, b) => b.tarih.localeCompare(a.tarih));
    const toplamTah = gelirler.reduce((s, g) => s + (g.toplamTutar || 0), 0);
    const toplamKDV = gelirler.reduce((s, g) => s + (g.kdvTutari  || 0), 0);

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Gelir Kayıtları (${gelirler.length})</span>
        <button class="btn btn-primary btn-sm" data-action="add-gelir">+ Yeni</button>
      </div>

      <div class="card mb-4">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;color:var(--text-secondary)">Toplam Tahsilat</span>
          <span style="font-size:18px;font-weight:700;color:var(--success)">${formatTL(toplamTah)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:var(--text-secondary)">Tahsil Edilen KDV</span>
          <span style="font-size:14px;font-weight:600;color:var(--warning)">${formatTL(toplamKDV)}</span>
        </div>
      </div>

      ${gelirler.length === 0
        ? `<div class="placeholder-view">
             <div class="placeholder-icon">₺</div>
             <div class="placeholder-text">Henüz gelir kaydı yok.<br>Sağ alttaki + butonuna dokun.</div>
           </div>`
        : gelirler.map(gelirItem).join('')
      }
    `;
  },

};
