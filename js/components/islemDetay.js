import { getKasalar, getKategoriler } from '../state.js';
import { deleteIslem } from '../db.js';
import { formatTL, formatTarih } from '../utils.js';
import { show as showToast } from './toast.js';
import { openIslemForm } from './islemForm.js';

export function openIslemDetay(islem) {
  if (document.getElementById('islem-detay-overlay')) return;

  const kasalar     = getKasalar();
  const kategoriler = getKategoriler();
  const kasa        = kasalar.find(k => k.id === islem.kasaId);
  const hedefKasa   = kasalar.find(k => k.id === islem.hedefKasaId);
  const kategori    = kategoriler.find(k => k.id === islem.kategoriId);

  let tipIcon, tipLabel, tipColor, amountCls, prefix;
  if (islem.tip === 'gelir') {
    tipIcon = '▲'; tipLabel = 'Gelir'; tipColor = 'var(--success)';
    amountCls = 'income'; prefix = '+';
  } else if (islem.tip === 'gider') {
    tipIcon = '▼'; tipLabel = 'Gider'; tipColor = 'var(--danger)';
    amountCls = 'expense'; prefix = '-';
  } else {
    tipIcon = '↔'; tipLabel = 'Transfer'; tipColor = 'var(--accent)';
    amountCls = 'transfer'; prefix = '';
  }

  const olusturmaTarih = islem.olusturmaTarihi
    ? new Date(islem.olusturmaTarihi).toLocaleString('tr-TR')
    : '';

  const overlay = document.createElement('div');
  overlay.id = 'islem-detay-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:440px">
      <div class="modal-header">
        <span class="modal-title" style="display:flex;align-items:center;gap:8px">
          <span style="color:${tipColor}">${tipIcon}</span>
          <span>${tipLabel} &middot; ${formatTarih(islem.tarih)}</span>
        </span>
        <button class="modal-close" id="detay-close">✕</button>
      </div>
      <div class="modal-body">

        <div style="text-align:center;padding:16px 0 20px">
          <div class="list-item-amount ${amountCls}" style="font-size:28px;font-weight:800;display:block">
            ${prefix}${formatTL(islem.tutar)}
          </div>
        </div>

        <div class="detay-rows">
          ${kasa ? `
            <div class="detay-row">
              <span class="detay-label">Kasa</span>
              <span class="detay-value">${kasa.emoji} ${kasa.ad}</span>
            </div>` : ''}
          ${hedefKasa ? `
            <div class="detay-row">
              <span class="detay-label">Hedef Kasa</span>
              <span class="detay-value">${hedefKasa.emoji} ${hedefKasa.ad}</span>
            </div>` : ''}
          ${kategori ? `
            <div class="detay-row">
              <span class="detay-label">Kategori</span>
              <span class="detay-value">${kategori.emoji} ${kategori.ad}</span>
            </div>` : ''}
          ${islem.aciklama ? `
            <div class="detay-row">
              <span class="detay-label">Açıklama</span>
              <span class="detay-value">${islem.aciklama}</span>
            </div>` : ''}
        </div>

        ${olusturmaTarih ? `
          <div style="text-align:center;margin-top:16px;font-size:11px;color:var(--text-secondary)">
            Oluşturulma: ${olusturmaTarih}
          </div>` : ''}

      </div>
      <div class="modal-footer">
        <button class="btn btn-danger" id="detay-sil" style="flex:0;padding:10px 14px">Sil</button>
        <button class="btn btn-secondary" id="detay-kapat">Kapat</button>
        <button class="btn btn-primary" id="detay-duzenle">Düzenle</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  document.getElementById('detay-close')?.addEventListener('click', close);
  document.getElementById('detay-kapat')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  document.getElementById('detay-duzenle')?.addEventListener('click', () => {
    close();
    setTimeout(() => openIslemForm(islem.tip, islem), 240);
  });

  document.getElementById('detay-sil')?.addEventListener('click', () => {
    showSilOnay(islem, kategori, close);
  });
}

function showSilOnay(islem, kategori, onSuccess) {
  if (document.getElementById('sil-onay-modal')) return;

  const label = islem.tip === 'transfer'
    ? 'Transfer'
    : (kategori?.ad || (islem.tip === 'gelir' ? 'Gelir' : 'Gider'));

  const modal = document.createElement('div');
  modal.id = 'sil-onay-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '210';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <div class="modal-header">
        <span class="modal-title">Emin misiniz?</span>
        <button class="modal-close" id="sil-onay-close">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:15px;color:var(--text-primary);line-height:1.6">
          Bu işlem silinecek:<br>
          <strong>${label} — ${formatTL(islem.tutar)} — ${formatTarih(islem.tarih)}</strong>
        </p>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:8px">
          Bu işlem geri alınamaz.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="sil-onay-vazgec">Vazgeç</button>
        <button class="btn btn-danger" id="sil-onay-onayla">Evet, sil</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('sil-onay-close')?.addEventListener('click', closeModal);
  document.getElementById('sil-onay-vazgec')?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  document.getElementById('sil-onay-onayla')?.addEventListener('click', async () => {
    try {
      await deleteIslem(islem.id);
      closeModal();
      onSuccess();
      showToast('İşlem silindi', 'info');
    } catch (err) {
      showToast('Silinemedi: ' + (err.message || 'Hata'), 'error');
    }
  });
}
