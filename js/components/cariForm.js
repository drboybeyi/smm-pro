import { addCari, updateCari } from '../db.js';
import { show as showToast } from './toast.js';
import { bugun } from '../utils.js';

const TIP_LABELS = { tedarikci: '💊 Tedarikçi', personel: '👤 Personel', musteri: '🏥 Müşteri' };

export function openCariForm(cariToEdit = null) {
  if (document.getElementById('cari-form-overlay')) return;

  const isEdit = cariToEdit !== null;

  const overlay = document.createElement('div');
  overlay.id = 'cari-form-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '220';

  const vadeVal = cariToEdit?.vadeTipi || 'yok';
  const gunVal  = cariToEdit?.vadeGunu  || 15;
  const tarVal  = cariToEdit?.vadeTarih || bugun();

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">${isEdit ? 'Cari Düzenle' : 'Yeni Cari'}</span>
        <button class="modal-close" id="cf-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Ad <span class="req">*</span></label>
          <input class="form-control" id="cf-ad" type="text" maxlength="100"
            placeholder="Cari adı..." value="${cariToEdit?.ad || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Tip <span class="req">*</span></label>
          <div class="btn-group">
            <button type="button" class="btn-option cf-tip-btn" data-val="tedarikci">💊 Tedarikçi</button>
            <button type="button" class="btn-option cf-tip-btn" data-val="personel">👤 Personel</button>
            <button type="button" class="btn-option cf-tip-btn" data-val="musteri">🏥 Müşteri</button>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Telefon <span class="form-label-opt">(isteğe bağlı)</span></label>
          <input class="form-control" id="cf-telefon" type="tel"
            placeholder="05xx xxx xx xx" value="${cariToEdit?.telefon || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Notlar <span class="form-label-opt">(isteğe bağlı)</span></label>
          <input class="form-control" id="cf-notlar" type="text" maxlength="200"
            placeholder="Not..." value="${cariToEdit?.notlar || ''}">
        </div>
        <div class="form-group" id="cf-vade-group" style="display:none">
          <label class="form-label" style="margin-bottom:8px">Ödeme Vadesi</label>
          <div class="cf-vade-radios">
            <label class="cf-radio-row">
              <input type="radio" name="cf-vt" value="yok" ${vadeVal==='yok'?'checked':''}>
              <span>Vade yok</span>
            </label>
            <label class="cf-radio-row">
              <input type="radio" name="cf-vt" value="her_ay" ${vadeVal==='her_ay'?'checked':''}>
              <span>Her ayın</span>
              <input class="form-control cf-inline-input" id="cf-vade-gun" type="number"
                min="1" max="31" value="${gunVal}">
              <span>. günü</span>
            </label>
            <label class="cf-radio-row">
              <input type="radio" name="cf-vt" value="tarih" ${vadeVal==='tarih'?'checked':''}>
              <span>Belirli tarih:</span>
              <input class="form-control cf-inline-input" id="cf-vade-tarih" type="date"
                value="${tarVal}" style="flex:1">
            </label>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cf-vazgec">Vazgeç</button>
        <button class="btn btn-primary" id="cf-kaydet">${isEdit ? 'Güncelle' : 'Kaydet'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  let selectedTip = cariToEdit?.tip || 'tedarikci';

  function updateTipUI(tip) {
    overlay.querySelectorAll('.cf-tip-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.val === tip)
    );
    overlay.querySelector('#cf-vade-group').style.display =
      tip === 'tedarikci' ? '' : 'none';
  }

  overlay.querySelectorAll('.cf-tip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTip = btn.dataset.val;
      updateTipUI(selectedTip);
    });
  });

  updateTipUI(selectedTip);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#cf-close')?.addEventListener('click', close);
  overlay.querySelector('#cf-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#cf-kaydet')?.addEventListener('click', async () => {
    const ad      = overlay.querySelector('#cf-ad').value.trim();
    const telefon = overlay.querySelector('#cf-telefon').value.trim();
    const notlar  = overlay.querySelector('#cf-notlar').value.trim();
    const vadeTip = overlay.querySelector('input[name="cf-vt"]:checked')?.value || 'yok';
    const vadeGun = parseInt(overlay.querySelector('#cf-vade-gun')?.value) || 15;
    const vadeTar = overlay.querySelector('#cf-vade-tarih')?.value || '';

    const adEl = overlay.querySelector('#cf-ad');
    adEl.classList.remove('error');
    overlay.querySelector('.form-error')?.remove();

    if (!ad) {
      adEl.classList.add('error');
      const err = document.createElement('div');
      err.className = 'form-error';
      err.textContent = 'Ad zorunludur';
      adEl.after(err);
      adEl.focus();
      return;
    }

    const data = { ad, tip: selectedTip, telefon, notlar };
    if (selectedTip === 'tedarikci') {
      data.vadeTipi = vadeTip;
      if (vadeTip === 'her_ay') data.vadeGunu  = vadeGun;
      if (vadeTip === 'tarih')  data.vadeTarih = vadeTar;
    } else {
      data.vadeTipi = 'yok';
    }

    const btn = overlay.querySelector('#cf-kaydet');
    btn.disabled = true;

    try {
      if (isEdit) {
        await updateCari(cariToEdit.id, data);
        showToast('Cari güncellendi', 'success');
      } else {
        await addCari(data);
        showToast('Cari eklendi', 'success');
      }
      close();
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Kayıt başarısız'), 'error');
      btn.disabled = false;
    }
  });

  setTimeout(() => overlay.querySelector('#cf-ad')?.focus(), 80);
}
