import { getGiderler } from '../state.js';
import { formatTL, formatTarih, kategoriLabel } from '../utils.js';

const KATEGORI_ICON = {
  kira: '🏠', elektrik: '⚡', su: '💧', dogalgaz: '🔥',
  internet: '📶', telefon: '📱', personel: '👤', sgk: '🏥',
  sarf: '🧴', tibbi_malzeme: '💉', demirbas: '🖥️',
  musavir: '📋', vergi: '📑', diger: '📦'
};

function belgeLabel(tip) {
  const map = { fatura: 'Fatura', fis: 'Fiş', makbuz: 'Makbuz', belgesiz: 'Belgesiz' };
  return map[tip] || tip || 'Belgesiz';
}

function giderItem(x) {
  const icon = KATEGORI_ICON[x.kategori] || '📦';
  const kdvStr = x.kdvOrani > 0 ? `KDV %${x.kdvOrani}` : 'KDV yok';
  return `
    <div class="list-item">
      <div class="list-item-icon">${icon}</div>
      <div class="list-item-body">
        <div class="list-item-title">${kategoriLabel(x.kategori)}${x.tedarikci ? ' — ' + x.tedarikci : ''}</div>
        <div class="list-item-subtitle">
          <span>${formatTarih(x.tarih)}</span>
          <span>&middot;</span>
          <span>${belgeLabel(x.belgeTipi)}</span>
          <span>&middot;</span>
          <span>${kdvStr}</span>
          ${x.notlar ? `<span>&middot; ${x.notlar}</span>` : ''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div class="list-item-amount expense">${formatTL(x.brutTutar)}</div>
        ${x.kdvOrani > 0
          ? `<div style="font-size:11px;color:var(--text-secondary)">${formatTL(x.netTutar)} net</div>`
          : ''}
      </div>
    </div>`;
}

export default {
  render() {
    const giderler = [...getGiderler()].sort((a, b) => b.tarih.localeCompare(a.tarih));
    const toplamBrut = giderler.reduce((s, x) => s + (x.brutTutar || 0), 0);
    const toplamNet  = giderler.reduce((s, x) => s + (x.netTutar  || 0), 0);
    const toplamKDV  = giderler.reduce((s, x) => s + (x.kdvTutari || 0), 0);

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Gider Kayıtları (${giderler.length})</span>
        <button class="btn btn-primary btn-sm" id="btnYeniGider">+ Yeni</button>
      </div>

      <div class="card mb-4">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;color:var(--text-secondary)">Toplam (KDV dahil)</span>
          <span style="font-size:18px;font-weight:700;color:var(--danger)">${formatTL(toplamBrut)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span style="font-size:13px;color:var(--text-secondary)">Toplam (KDV hariç)</span>
          <span style="font-size:14px;font-weight:600;color:var(--text-primary)">${formatTL(toplamNet)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;color:var(--text-secondary)">İndirilecek KDV</span>
          <span style="font-size:14px;font-weight:600;color:var(--warning)">${formatTL(toplamKDV)}</span>
        </div>
      </div>

      ${giderler.length === 0
        ? `<div class="placeholder-view">
             <div class="placeholder-icon">🧾</div>
             <div class="placeholder-text">Henüz gider kaydı yok.<br>Sağ alttaki + butonuna dokun.</div>
           </div>`
        : giderler.map(giderItem).join('')
      }
    `;
  },

  afterRender() {
    document.getElementById('btnYeniGider')?.addEventListener('click', () => {
      console.log('TODO: Gider formu açılacak');
    });
  }
};
