import { addSabitGider, updateSabitGider } from '../db.js';
import { show as showToast } from '../components/toast.js';

export function showSabitGiderModal(sg, kategoriler) {
  const isEdit = sg !== null;
  if (document.getElementById('sg-modal')) return;

  const giderKatlar = kategoriler.filter(k => k.tip === 'gider');

  const modal = document.createElement('div');
  modal.id = 'sg-modal';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '230';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">${isEdit ? 'Sabit Gider Düzenle' : 'Yeni Sabit Gider'}</span>
        <button class="modal-close" id="sgm-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Emoji <span class="form-label-opt">(isteğe bağlı)</span></label>
          <input class="form-control" id="sgm-emoji" type="text" maxlength="2"
            placeholder="💸" value="${sg?.emoji || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Ad <span class="req">*</span></label>
          <input class="form-control" id="sgm-ad" type="text" maxlength="100"
            placeholder="Örn: Kira, Elektrik, Su..." value="${sg?.ad || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Kategori <span class="form-label-opt">(isteğe bağlı)</span></label>
          <select class="form-control" id="sgm-kat">
            <option value="">Seçme</option>
            ${giderKatlar.map(k =>
              `<option value="${k.id}" ${sg?.kategoriId === k.id ? 'selected' : ''}>${k.emoji} ${k.ad}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Varsayılan Tutar <span class="req">*</span></label>
          <input class="form-control" id="sgm-tutar" type="number"
            step="0.01" min="0.01" inputmode="decimal" placeholder="0,00"
            autocomplete="off" value="${sg?.varsayilanTutar || ''}">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Ödeme Günü <span class="form-label-opt">(ayın kaçında, 1-31)</span></label>
          <input class="form-control" id="sgm-gun" type="number"
            min="1" max="31" placeholder="Örn: 5"
            value="${sg?.odemeGunu || ''}">
        </div>
      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" id="sgm-sil" style="flex:0;padding:10px 14px">Sil</button>` : ''}
        <button class="btn btn-secondary" id="sgm-iptal">İptal</button>
        <button class="btn btn-primary" id="sgm-kaydet">Kaydet</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add('modal-closing');
    setTimeout(() => modal.remove(), 220);
  };

  modal.querySelector('#sgm-close')?.addEventListener('click', close);
  modal.querySelector('#sgm-iptal')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelector('#sgm-sil')?.addEventListener('click', async () => {
    if (!sg) return;
    if (!confirm(`"${sg.ad}" sabit giderini silmek istediğinizden emin misiniz?`)) return;
    await updateSabitGider(sg.id, { silindi: true });
    close();
    showToast(`${sg.emoji || ''} ${sg.ad} silindi`, 'info');
  });

  modal.querySelector('#sgm-kaydet')?.addEventListener('click', async () => {
    const ad       = modal.querySelector('#sgm-ad').value.trim();
    const emoji    = modal.querySelector('#sgm-emoji').value.trim() || '💸';
    const katId    = modal.querySelector('#sgm-kat').value || null;
    const tutarStr = modal.querySelector('#sgm-tutar').value;
    const gun      = parseInt(modal.querySelector('#sgm-gun').value) || null;
    const tutar    = parseFloat(tutarStr);

    const adEl    = modal.querySelector('#sgm-ad');
    const tutarEl = modal.querySelector('#sgm-tutar');
    adEl.classList.remove('error');
    tutarEl.classList.remove('error');

    if (!ad)                                        { adEl.classList.add('error');    adEl.focus();    return; }
    if (!tutarStr || isNaN(tutar) || tutar < 0.01) { tutarEl.classList.add('error'); tutarEl.focus(); return; }

    const btn = modal.querySelector('#sgm-kaydet');
    btn.disabled = true;

    try {
      const data = { ad, emoji, kategoriId: katId, varsayilanTutar: tutar, odemeGunu: gun };
      if (isEdit) {
        await updateSabitGider(sg.id, data);
        showToast('Sabit gider güncellendi', 'success');
      } else {
        await addSabitGider(data);
        showToast('Sabit gider eklendi', 'success');
      }
      close();
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen'), 'error');
      btn.disabled = false;
    }
  });

  setTimeout(() => modal.querySelector('#sgm-ad')?.focus(), 80);
}
