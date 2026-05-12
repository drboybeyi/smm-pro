import { getCariler, getIslemler } from '../state.js';
import { banaBorcluOlanlar, formatTL, formatTarih } from '../utils.js';
import { openCariDetay } from './cariDetay.js';

export function openBanaBorcluOlanlar() {
  if (document.getElementById('bana-borclu-modal')) return;

  const cariler  = getCariler();
  const islemler = getIslemler();
  const { musteriler, personel, toplam } = banaBorcluOlanlar(cariler, islemler);
  const tamListe = [...musteriler, ...personel];

  const ozetHtml = tamListe.length > 0 ? `
    <div class="cb-ozet-kart">
      <div class="cb-ozet-tutar" style="color:var(--success)">+${formatTL(toplam)}</div>
      <div class="cb-ozet-alt">${tamListe.length} cari · ${musteriler.length} müşteri + ${personel.length} personel avansı</div>
    </div>` : '';

  function borcluSatirHtml(c, icon) {
    const sonIslemStr = c.sonIslem ? formatTarih(c.sonIslem) : '';
    return `
      <div class="cb-satir" data-cari-id="${c.id}" style="cursor:pointer">
        <div class="cb-satir-ust">
          <span class="cb-cari-ad">${icon} ${c.ad}</span>
          <span class="cb-cari-borc" style="color:var(--success)">+${formatTL(c.bakiye)}</span>
        </div>
        ${sonIslemStr ? `<div class="cb-satir-alt"><span class="cb-vade-uzak">Son işlem: ${sonIslemStr}</span></div>` : ''}
      </div>`;
  }

  const musteriHtml = musteriler.length > 0 ? `
    <div class="bb-section-baslik">MÜŞTERİLER</div>
    ${musteriler.map(c => borcluSatirHtml(c, '🏥')).join('')}` : '';

  const personelHtml = personel.length > 0 ? `
    <div class="bb-section-baslik${musteriler.length > 0 ? ' bb-section-sep' : ''}">PERSONEL AVANSLARI</div>
    ${personel.map(c => borcluSatirHtml(c, '👤')).join('')}` : '';

  const listeHtml = tamListe.length === 0
    ? `<div class="cb-bos">
         <div class="cb-bos-ikon" style="color:var(--success)">✓</div>
         <div class="cb-bos-baslik">Size borçlu olan yok</div>
         <div class="cb-bos-alt">Tüm müşteri hesapları kapalı</div>
       </div>`
    : musteriHtml + personelHtml;

  const modal = document.createElement('div');
  modal.id = 'bana-borclu-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '210';

  modal.innerHTML = `
    <div class="modal-box cb-modal-box">
      <div class="modal-header">
        <span class="modal-title">💰 Bana Borçlu Olanlar</span>
        <button class="modal-close" id="bb-kapat-x">✕</button>
      </div>
      <div class="modal-body" style="padding:0">
        ${ozetHtml}
        <div class="cb-liste">${listeHtml}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="bb-kapat-btn" style="width:100%">Kapat</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add('modal-closing');
    setTimeout(() => modal.remove(), 220);
  };

  modal.querySelector('#bb-kapat-x')?.addEventListener('click', close);
  modal.querySelector('#bb-kapat-btn')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelectorAll('.cb-satir').forEach(row => {
    row.addEventListener('click', () => {
      const cariId = row.dataset.cariId;
      const cari   = getCariler().find(c => c.id === cariId);
      close();
      if (cari) setTimeout(() => openCariDetay(cari), 240);
    });
  });
}
