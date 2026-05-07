import { getCariler, getIslemler, getVadeler } from '../state.js';
import {
  hesaplaCariBakiye, formatTL, formatTarih, bugun,
  tedarikciBorclari, cariEnYakinVade, borcSiraOnceligi
} from '../utils.js';

function vadeMetni(yakinVade) {
  if (!yakinVade) {
    return `<span class="cb-vade-yok">📅 Vade tanımlanmamış</span>`;
  }

  const { gunFark, vadeTarih } = yakinVade;
  const tarihStr = formatTarih(vadeTarih);

  if (gunFark === 0) {
    return `<span class="cb-vade-bugun">🚨 BUGÜN ÖDEME</span>`;
  }
  if (gunFark === 1) {
    return `<span class="cb-vade-yakin">⚠️ Yarın ödeme · ${tarihStr}</span>`;
  }
  if (gunFark > 1 && gunFark <= 7) {
    return `<span class="cb-vade-yakin">⚠️ ${gunFark} gün sonra · ${tarihStr}</span>`;
  }
  if (gunFark > 7) {
    return `<span class="cb-vade-uzak">📅 ${gunFark} gün sonra · ${tarihStr}</span>`;
  }
  // gunFark < 0 → gecikmiş
  return `<span class="cb-vade-gecmis">🔴 ${Math.abs(gunFark)} gün gecikti · ${tarihStr}</span>`;
}

export function openCariBorclar() {
  if (document.getElementById('cari-borclar-modal')) return;

  const cariler  = getCariler();
  const islemler = getIslemler();
  const vadeler  = getVadeler();

  const borcluCariler = cariler
    .filter(c => c.tip === 'tedarikci' && !c.silindi)
    .map(c => {
      const bakiye    = hesaplaCariBakiye(c.id, islemler);
      const yakinVade = cariEnYakinVade(c.id, vadeler, c);
      const priority  = borcSiraOnceligi(yakinVade?.gunFark ?? null);
      return { ...c, bakiye, yakinVade, priority };
    })
    .filter(c => c.bakiye < 0)
    .sort((a, b) => a.priority - b.priority);

  const toplamBorc = borcluCariler.reduce((s, c) => s + c.bakiye, 0);

  const ozetHtml = borcluCariler.length > 0 ? `
    <div class="cb-ozet-kart">
      <div class="cb-ozet-tutar">${formatTL(toplamBorc)}</div>
      <div class="cb-ozet-alt">${borcluCariler.length} tedarikçi · ⚠️ Vadeleri yaklaşan üstte</div>
    </div>` : '';

  const listeHtml = borcluCariler.length === 0
    ? `<div class="cb-bos">
         <div class="cb-bos-ikon">✓</div>
         <div class="cb-bos-baslik">Cari borcunuz yok</div>
         <div class="cb-bos-alt">Tüm tedarikçilere ödeme yapılmış</div>
       </div>`
    : borcluCariler.map(c => `
        <div class="cb-satir" data-cari-id="${c.id}">
          <div class="cb-satir-ust">
            <span class="cb-cari-ad">💊 ${c.ad}</span>
            <span class="cb-cari-borc">${formatTL(c.bakiye)}</span>
          </div>
          <div class="cb-satir-alt">${vadeMetni(c.yakinVade)}</div>
        </div>`
      ).join('');

  const modal = document.createElement('div');
  modal.id = 'cari-borclar-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '210';

  modal.innerHTML = `
    <div class="modal-box cb-modal-box">
      <div class="modal-header">
        <span class="modal-title">💸 Cari Borçlarım</span>
        <button class="modal-close" id="cb-kapat-x">✕</button>
      </div>
      <div class="modal-body" style="padding:0">
        ${ozetHtml}
        <div class="cb-liste">${listeHtml}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cb-kapat-btn" style="width:100%">Kapat</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add('modal-closing');
    setTimeout(() => modal.remove(), 220);
  };

  modal.querySelector('#cb-kapat-x')?.addEventListener('click', close);
  modal.querySelector('#cb-kapat-btn')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelectorAll('.cb-satir').forEach(row => {
    row.addEventListener('click', () => {
      const cariId = row.dataset.cariId;
      close();
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent('defter:open-cari-detay', {
          detail: { cariId }
        }));
      }, 240);
    });
  });
}
