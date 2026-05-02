import { getKasalar, getIslemler } from '../state.js';
import { addKasa, updateKasa, hesaplaKasaBakiyesi } from '../db.js';
import { formatTL } from '../utils.js';
import { show as showToast } from '../components/toast.js';

function kasaItem(kasa, bakiye) {
  return `
    <div class="list-item">
      <div class="list-item-icon" style="background:var(--bg-secondary);font-size:22px">${kasa.emoji}</div>
      <div class="list-item-body">
        <div class="list-item-title">${kasa.ad}</div>
        ${kasa.aciklama ? `<div class="list-item-subtitle">${kasa.aciklama}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
        <span class="list-item-amount ${bakiye >= 0 ? 'income' : 'expense'}">${formatTL(bakiye)}</span>
        <button class="btn btn-secondary btn-sm" style="min-height:32px;padding:4px 10px"
          data-kasa-id="${kasa.id}">✎</button>
      </div>
    </div>`;
}

export default {
  render() {
    const kasalar  = getKasalar();
    const islemler = getIslemler();
    const toplam   = kasalar.reduce((sum, k) => sum + hesaplaKasaBakiyesi(k.id, islemler), 0);

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Kasalar</span>
        <button class="btn btn-primary btn-sm" id="btnYeniKasa">+ Yeni Kasa</button>
      </div>

      <div class="card mb-4" style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:13px;color:var(--text-secondary)">Toplam Bakiye</span>
        <span style="font-size:20px;font-weight:700;color:${toplam >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatTL(toplam)}</span>
      </div>

      ${kasalar.length === 0
        ? `<div class="placeholder-view">
             <div class="placeholder-icon">💰</div>
             <div class="placeholder-text">Henüz kasa yok.<br>+ Yeni Kasa ile ekleyin.</div>
           </div>`
        : kasalar.map(k => kasaItem(k, hesaplaKasaBakiyesi(k.id, islemler))).join('')
      }
    `;
  },

  afterRender() {
    document.getElementById('btnYeniKasa')?.addEventListener('click', () => showKasaModal(null));

    document.querySelectorAll('[data-kasa-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const kasa = getKasalar().find(k => k.id === btn.dataset.kasaId);
        if (kasa) showKasaModal(kasa);
      });
    });
  }
};

function showKasaModal(kasa) {
  const isEdit = kasa !== null;
  if (document.getElementById('kasa-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'kasa-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">${isEdit ? 'Kasayı Düzenle' : 'Yeni Kasa'}</span>
        <button class="modal-close" id="km-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Emoji</label>
          <input class="form-control" id="km-emoji" type="text" maxlength="2"
            value="${kasa?.emoji || '💰'}" placeholder="💰">
        </div>
        <div class="form-group">
          <label class="form-label">Kasa Adı <span class="req">*</span></label>
          <input class="form-control" id="km-ad" type="text" maxlength="50"
            value="${kasa?.ad || ''}" placeholder="Nakit, Banka...">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Açıklama <span class="form-label-opt">(isteğe bağlı)</span></label>
          <input class="form-control" id="km-aciklama" type="text" maxlength="100"
            value="${kasa?.aciklama || ''}" placeholder="">
        </div>
      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" id="km-sil" style="flex:0;padding:10px 14px">Sil</button>` : ''}
        <button class="btn btn-secondary" id="km-iptal">İptal</button>
        <button class="btn btn-primary" id="km-kaydet">Kaydet</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add('modal-closing');
    setTimeout(() => modal.remove(), 220);
  };

  document.getElementById('km-close')?.addEventListener('click', close);
  document.getElementById('km-iptal')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('km-sil')?.addEventListener('click', async () => {
    if (!kasa || !confirm(`"${kasa.ad}" kasasını silmek istediğinizden emin misiniz?`)) return;
    await updateKasa(kasa.id, { silindi: true });
    close();
    showToast(`${kasa.emoji} ${kasa.ad} silindi`, 'info');
  });

  document.getElementById('km-kaydet')?.addEventListener('click', async () => {
    const ad       = document.getElementById('km-ad')?.value.trim();
    const emoji    = document.getElementById('km-emoji')?.value.trim() || '💰';
    const aciklama = document.getElementById('km-aciklama')?.value.trim() || '';

    if (!ad) {
      document.getElementById('km-ad')?.classList.add('error');
      return;
    }
    try {
      if (isEdit) {
        await updateKasa(kasa.id, { ad, emoji, aciklama });
        showToast('Kasa güncellendi', 'success');
      } else {
        await addKasa({ ad, emoji, aciklama });
        showToast('Kasa eklendi', 'success');
      }
      close();
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen'), 'error');
    }
  });

  document.getElementById('km-ad')?.focus();
}
