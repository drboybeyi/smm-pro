import { getKasalar, getKategoriler } from '../state.js';
import { addIslem, updateIslem } from '../db.js';
import { bugun } from '../utils.js';
import { show as showToast } from './toast.js';

function setSyncStatus(text, color) {
  const el = document.querySelector('.sync-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

function buildKategoriGrid(kategoriler, tip) {
  const filtered = kategoriler.filter(k => k.tip === tip);
  if (!filtered.length) {
    return `<p style="text-align:center;font-size:13px;color:var(--text-secondary);grid-column:1/-1;padding:8px 0">Kategori yok. Kategoriler ekranından ekleyin.</p>`;
  }
  return filtered.map(k => `
    <button type="button" class="kategori-btn" role="radio" aria-pressed="false" data-id="${k.id}">
      <span class="k-emoji">${k.emoji}</span>
      <span class="k-label">${k.ad}</span>
    </button>`).join('');
}

function buildHTML(kasalar, title = 'Yeni İşlem', saveLabel = 'Kaydet') {
  const kasaOpts = kasalar.length
    ? kasalar.map(k => `<option value="${k.id}">${k.emoji} ${k.ad}</option>`).join('')
    : '<option value="" disabled>Önce kasa ekleyin</option>';

  return `
<div id="islem-form-overlay" class="modal-overlay">
  <div class="modal-box">
    <div class="modal-header">
      <span class="modal-title">${title}</span>
      <button class="modal-close" id="if-close">&#x2715;</button>
    </div>
    <div class="modal-body">

      <div class="form-group">
        <label class="form-label">İşlem Tipi <span class="req">*</span></label>
        <div class="btn-group">
          <button type="button" class="btn-option if-tip-btn" data-val="gider">▼ Gider</button>
          <button type="button" class="btn-option if-tip-btn" data-val="gelir">▲ Gelir</button>
          <button type="button" class="btn-option if-tip-btn" data-val="transfer">↔ Transfer</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Tarih <span class="req">*</span></label>
        <input class="form-control" id="if-tarih" type="date" value="${bugun()}">
      </div>

      <div class="form-group">
        <label class="form-label">Tutar <span class="req">*</span></label>
        <input class="form-control" id="if-tutar" type="number"
          step="0.01" min="0.01" inputmode="decimal" placeholder="0,00" autocomplete="off">
      </div>

      <div class="form-group">
        <label class="form-label">Kasa <span class="req">*</span></label>
        <select class="form-control" id="if-kasa">
          <option value="">Kasa seçin...</option>
          ${kasaOpts}
        </select>
      </div>

      <div class="form-group" id="if-hedef-group" style="display:none">
        <label class="form-label">Hedef Kasa <span class="req">*</span></label>
        <select class="form-control" id="if-hedef-kasa">
          <option value="">Hedef kasa seçin...</option>
          ${kasaOpts}
        </select>
      </div>

      <div class="form-group" id="if-kategori-group">
        <label class="form-label">Kategori <span class="req">*</span></label>
        <div class="kategori-grid" id="if-kategori-grid" role="radiogroup"></div>
      </div>

      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Açıklama <span class="form-label-opt">(isteğe bağlı)</span></label>
        <input class="form-control" id="if-aciklama" type="text"
          maxlength="200" placeholder="İsteğe bağlı not..." autocomplete="off">
      </div>

    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="if-vazgec">Vazgeç</button>
      <button class="btn btn-primary" id="if-kaydet">${saveLabel}</button>
    </div>
  </div>
</div>`;
}

// ─── Ana Fonksiyon ─────────────────────────────────────────────

export function openIslemForm(defaultTip = 'gider', islemToEdit = null) {
  if (document.getElementById('islem-form-overlay')) return;

  const kasalar     = getKasalar();
  const kategoriler = getKategoriler();

  const isEdit  = islemToEdit !== null;
  const title   = isEdit ? 'İşlem Düzenle' : 'Yeni İşlem';
  const saveLabel = isEdit ? 'Güncelle' : 'Kaydet';

  document.body.insertAdjacentHTML('beforeend', buildHTML(kasalar, title, saveLabel));
  const overlay = document.getElementById('islem-form-overlay');

  let selectedTip        = isEdit ? islemToEdit.tip : defaultTip;
  let selectedKategoriId = null;

  function updateFormForTip(tip, preselectedKatId = null) {
    overlay.querySelectorAll('.if-tip-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.val === tip)
    );
    const hedefGroup    = overlay.querySelector('#if-hedef-group');
    const kategoriGroup = overlay.querySelector('#if-kategori-group');
    const grid          = overlay.querySelector('#if-kategori-grid');

    if (tip === 'transfer') {
      hedefGroup.style.display    = '';
      kategoriGroup.style.display = 'none';
    } else {
      hedefGroup.style.display    = 'none';
      kategoriGroup.style.display = '';
      grid.innerHTML = buildKategoriGrid(kategoriler, tip);
      selectedKategoriId = null;
      grid.querySelectorAll('.kategori-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.kategori-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
          btn.setAttribute('aria-pressed', 'true');
          selectedKategoriId = btn.dataset.id;
          grid.classList.remove('error-grid');
          grid.parentNode.querySelector('.form-error')?.remove();
        });
        if (preselectedKatId && btn.dataset.id === preselectedKatId) {
          btn.setAttribute('aria-pressed', 'true');
          selectedKategoriId = preselectedKatId;
        }
      });
    }
  }

  overlay.querySelectorAll('.if-tip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTip = btn.dataset.val;
      selectedKategoriId = null;
      updateFormForTip(selectedTip);
    });
  });

  // Initial render with pre-selection if editing
  updateFormForTip(selectedTip, isEdit ? (islemToEdit.kategoriId || null) : null);

  // Pre-fill fields for edit mode
  if (isEdit) {
    overlay.querySelector('#if-tarih').value   = islemToEdit.tarih || bugun();
    overlay.querySelector('#if-tutar').value   = islemToEdit.tutar != null ? islemToEdit.tutar : '';
    overlay.querySelector('#if-kasa').value    = islemToEdit.kasaId || '';
    overlay.querySelector('#if-aciklama').value = islemToEdit.aciklama || '';
    if (islemToEdit.tip === 'transfer' && islemToEdit.hedefKasaId) {
      overlay.querySelector('#if-hedef-kasa').value = islemToEdit.hedefKasaId;
    }
  }

  function close() {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
    document.removeEventListener('keydown', onEsc);
  }

  function onEsc(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onEsc);

  overlay.querySelector('#if-close')?.addEventListener('click', close);
  overlay.querySelector('#if-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#if-kaydet')?.addEventListener('click', async () => {
    const tarih       = overlay.querySelector('#if-tarih').value;
    const tutarStr    = overlay.querySelector('#if-tutar').value;
    const kasaId      = overlay.querySelector('#if-kasa').value;
    const hedefKasaId = overlay.querySelector('#if-hedef-kasa').value;
    const aciklama    = overlay.querySelector('#if-aciklama').value.trim();
    const tutarVal    = parseFloat(tutarStr);

    overlay.querySelectorAll('.form-error').forEach(e => e.remove());
    overlay.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
    overlay.querySelectorAll('.error-grid').forEach(e => e.classList.remove('error-grid'));

    let valid    = true;
    let firstErr = null;

    function fieldErr(el, msg) {
      el.classList.add('error');
      const err = document.createElement('div');
      err.className = 'form-error';
      err.textContent = msg;
      el.after(err);
      if (!firstErr) firstErr = el;
      valid = false;
    }

    const tarihEl = overlay.querySelector('#if-tarih');
    const tutarEl = overlay.querySelector('#if-tutar');
    const kasaEl  = overlay.querySelector('#if-kasa');

    if (!tarih) fieldErr(tarihEl, 'Tarih zorunludur');
    if (!tutarStr || isNaN(tutarVal) || tutarVal < 0.01) fieldErr(tutarEl, 'Geçerli tutar girin');
    if (!kasaId) fieldErr(kasaEl, 'Kasa seçin');

    if (selectedTip === 'transfer') {
      const hedefEl = overlay.querySelector('#if-hedef-kasa');
      if (!hedefKasaId) {
        fieldErr(hedefEl, 'Hedef kasa seçin');
      } else if (kasaId && kasaId === hedefKasaId) {
        fieldErr(hedefEl, 'Kaynak ve hedef kasa aynı olamaz');
      }
    } else if (!selectedKategoriId) {
      const grid = overlay.querySelector('#if-kategori-grid');
      grid.classList.add('error-grid');
      const err = document.createElement('div');
      err.className = 'form-error';
      err.textContent = 'Kategori seçin';
      grid.after(err);
      if (!firstErr) firstErr = grid;
      valid = false;
    }

    if (!valid) {
      firstErr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const kaydetBtn = overlay.querySelector('#if-kaydet');
    kaydetBtn.disabled = true;
    kaydetBtn.textContent = isEdit ? 'Güncelleniyor...' : 'Kaydediliyor...';
    setSyncStatus('🟡 Kaydediliyor...', '#ffd780');

    try {
      if (isEdit) {
        const updates = { tarih, tip: selectedTip, tutar: tutarVal, kasaId, aciklama };
        if (selectedTip === 'transfer') {
          updates.hedefKasaId = hedefKasaId;
          updates.kategoriId  = null;
        } else {
          updates.kategoriId  = selectedKategoriId;
          updates.hedefKasaId = null;
        }
        await updateIslem(islemToEdit.id, updates);
        setSyncStatus('🟢 Bağlı', '#b8f0b8');
        close();
        document.dispatchEvent(new CustomEvent('defter:islem-updated', { detail: { id: islemToEdit.id } }));
      } else {
        const islemData = { tarih, tip: selectedTip, tutar: tutarVal, kasaId, aciklama };
        if (selectedTip === 'transfer') {
          islemData.hedefKasaId = hedefKasaId;
        } else {
          islemData.kategoriId = selectedKategoriId;
        }
        const kayit = await addIslem(islemData);
        setSyncStatus('🟢 Bağlı', '#b8f0b8');
        close();
        document.dispatchEvent(new CustomEvent('defter:islem-saved', { detail: { kayit } }));
      }
    } catch (err) {
      console.error('[IslemForm] Kayıt hatası:', err);
      setSyncStatus('🔴 Hata', '#ffb3b3');
      const msg = err.message?.includes('network') || err.message?.includes('offline')
        ? 'İnternet bağlantısı yok'
        : 'Kayıt başarısız: ' + (err.message || 'Bilinmeyen hata');
      showToast(msg, 'error');
      kaydetBtn.disabled = false;
      kaydetBtn.textContent = isEdit ? 'Güncelle' : 'Kaydet';
    }
  });

  setTimeout(() => overlay.querySelector('#if-tutar')?.focus(), 80);
}
