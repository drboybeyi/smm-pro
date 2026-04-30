import { addGider } from '../db.js';
import { bugun, kdvAyristirGider, formatTL } from '../utils.js';
import { show as showToast } from './toast.js';

const CATEGORIES = [
  { value: 'kira',          emoji: '🏠', label: 'Kira' },
  { value: 'elektrik',      emoji: '⚡', label: 'Elektrik' },
  { value: 'su',            emoji: '💧', label: 'Su' },
  { value: 'dogalgaz',      emoji: '🔥', label: 'Doğalgaz' },
  { value: 'internet',      emoji: '📶', label: 'İnternet' },
  { value: 'telefon',       emoji: '☎️', label: 'Telefon' },
  { value: 'personel',      emoji: '👤', label: 'Personel' },
  { value: 'sgk',           emoji: '📋', label: 'SGK/Bağ-Kur' },
  { value: 'sarf',          emoji: '📦', label: 'Sarf Malzeme' },
  { value: 'tibbi_malzeme', emoji: '🩺', label: 'Tıbbi Malzeme' },
  { value: 'demirbas',      emoji: '🪑', label: 'Demirbaş' },
  { value: 'musavir',       emoji: '📊', label: 'Mali Müşavir' },
  { value: 'vergi',         emoji: '🏛️', label: 'Vergi/Harç' },
  { value: 'diger',         emoji: '📌', label: 'Diğer' },
];

function setSyncStatus(text, color) {
  const el = document.querySelector('.sync-status');
  if (!el) return;
  el.textContent = text;
  el.style.color = color;
}

// ─── Canlı KDV Önizlemesi ──────────────────────────────────────

function updatePreview(overlay) {
  const tutarEl  = overlay.querySelector('#dgf-tutar');
  const kdvEl    = overlay.querySelector('#dgf-kdv');
  const preview  = overlay.querySelector('#dgf-kdv-preview');
  if (!tutarEl || !kdvEl || !preview) return;

  const tutar    = parseFloat(tutarEl.value) || 0;
  const kdvOrani = Number(kdvEl.value) || 0;

  if (tutar <= 0) {
    preview.textContent = 'Tutar giriniz...';
    return;
  }

  const { net, kdv, brut } = kdvAyristirGider(tutar, kdvOrani);

  if (kdvOrani === 0) {
    preview.innerHTML =
      `Net: <strong>${formatTL(net)}</strong> &nbsp;·&nbsp; ` +
      `KDV: yok &nbsp;·&nbsp; ` +
      `Toplam: <strong>${formatTL(brut)}</strong>`;
  } else {
    preview.innerHTML =
      `Net: <strong>${formatTL(net)}</strong> &nbsp;·&nbsp; ` +
      `KDV (%${kdvOrani}): <strong>${formatTL(kdv)}</strong> &nbsp;·&nbsp; ` +
      `Toplam: <strong>${formatTL(brut)}</strong>`;
  }
}

// ─── Hata Gösterimi ────────────────────────────────────────────

function setFieldError(el, msg) {
  if (!el) return;
  el.classList.add('error');
  let errEl = el.parentNode.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    el.parentNode.appendChild(errEl);
  }
  errEl.textContent = msg;
}

function clearFieldError(el) {
  if (!el) return;
  el.classList.remove('error');
  el.parentNode.querySelector('.form-error')?.remove();
}

function setGridError(gridEl, msg) {
  if (!gridEl) return;
  gridEl.classList.add('error-grid');
  let errEl = gridEl.parentNode.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    gridEl.parentNode.appendChild(errEl);
  }
  errEl.textContent = msg;
}

function clearGridError(gridEl) {
  if (!gridEl) return;
  gridEl.classList.remove('error-grid');
  gridEl.parentNode.querySelector('.form-error')?.remove();
}

// ─── Validasyon ────────────────────────────────────────────────

function validate(overlay) {
  let firstError = null;
  let valid = true;

  const tarihEl   = overlay.querySelector('#dgf-tarih');
  const gridEl    = overlay.querySelector('#dgf-kategori-grid');
  const tutarEl   = overlay.querySelector('#dgf-tutar');

  if (!tarihEl?.value) {
    setFieldError(tarihEl, 'Tarih zorunludur');
    if (!firstError) firstError = tarihEl;
    valid = false;
  } else {
    clearFieldError(tarihEl);
  }

  if (!gridEl?.querySelector('.kategori-btn[aria-pressed="true"]')) {
    setGridError(gridEl, 'Kategori seçin');
    if (!firstError) firstError = gridEl;
    valid = false;
  } else {
    clearGridError(gridEl);
  }

  const tutarVal = parseFloat(tutarEl?.value || '');
  if (!tutarEl?.value || isNaN(tutarVal) || tutarVal < 0.01) {
    setFieldError(tutarEl, "Geçerli bir tutar girin (0'dan büyük)");
    if (!firstError) firstError = tutarEl;
    valid = false;
  } else {
    clearFieldError(tutarEl);
  }

  if (firstError) {
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof firstError.focus === 'function') firstError.focus();
  }

  return valid;
}

// ─── Veri Toplama ──────────────────────────────────────────────

function collectData(overlay) {
  const tarih     = overlay.querySelector('#dgf-tarih').value;
  const kategori  = overlay.querySelector('.kategori-btn[aria-pressed="true"]').dataset.value;
  const tedarikci = overlay.querySelector('#dgf-tedarikci').value.trim().slice(0, 100);
  const belgeTipi = overlay.querySelector('#dgf-belge-tipi').value;
  const belgeNo   = overlay.querySelector('#dgf-belge-no').value.trim().slice(0, 50);
  const brutTutar = parseFloat(overlay.querySelector('#dgf-tutar').value);
  const kdvOrani  = Number(overlay.querySelector('#dgf-kdv').value) || 0;
  const notlar    = overlay.querySelector('#dgf-notlar').value.trim().slice(0, 500);

  const { net, kdv } = kdvAyristirGider(brutTutar, kdvOrani);

  return {
    tarih, kategori, tedarikci, belgeTipi, belgeNo,
    brutTutar, kdvOrani, kdvTutari: kdv, netTutar: net,
    notlar, belgeFotoUrl: null
  };
}

// ─── Form HTML ─────────────────────────────────────────────────

function buildHTML() {
  const gridBtns = CATEGORIES.map(c => `
    <button type="button" class="kategori-btn" role="radio"
      aria-pressed="false" data-value="${c.value}">
      <span class="k-emoji">${c.emoji}</span>
      <span class="k-label">${c.label}</span>
    </button>`).join('');

  return `
<div id="gider-form-overlay" class="modal-overlay">
  <div class="modal-box">

    <div class="modal-header">
      <span class="modal-title">Yeni Gider Kaydı</span>
      <button class="modal-close" id="dgf-close" aria-label="Kapat">&#x2715;</button>
    </div>

    <div class="modal-body">

      <div class="form-group">
        <label class="form-label">Tarih <span class="req">*</span></label>
        <input class="form-control" id="dgf-tarih" type="date" value="${bugun()}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Kategori <span class="req">*</span></label>
        <div class="kategori-grid" id="dgf-kategori-grid" role="radiogroup" aria-label="Kategori">
          ${gridBtns}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">
          Tedarikçi
          <span class="form-label-opt">(isteğe bağlı)</span>
        </label>
        <input class="form-control" id="dgf-tedarikci" type="text"
          maxlength="100" placeholder="Migros, Türk Telekom, vb."
          autocomplete="off" autocorrect="off" autocapitalize="words">
      </div>

      <div class="form-group">
        <label class="form-label">Belge Tipi</label>
        <select class="form-control" id="dgf-belge-tipi">
          <option value="fatura">Fatura</option>
          <option value="fis">Fiş</option>
          <option value="makbuz">Makbuz</option>
          <option value="belgesiz">Belgesiz</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">
          Belge No
          <span class="form-label-opt">(isteğe bağlı)</span>
        </label>
        <input class="form-control" id="dgf-belge-no" type="text"
          maxlength="50" placeholder="Fatura / fiş numarası"
          autocomplete="off">
      </div>

      <div class="form-group">
        <label class="form-label">Toplam Tutar — KDV dahil <span class="req">*</span></label>
        <input class="form-control" id="dgf-tutar" type="number"
          step="0.01" min="0.01" inputmode="decimal"
          placeholder="Ödenen toplam (₺)" autocomplete="off">
      </div>

      <div class="form-group">
        <label class="form-label">KDV Oranı</label>
        <select class="form-control" id="dgf-kdv">
          <option value="0">KDV yok (%0)</option>
          <option value="1">%1</option>
          <option value="10">%10</option>
          <option value="20" selected>%20</option>
        </select>
        <div class="kdv-preview" id="dgf-kdv-preview">Tutar giriniz...</div>
      </div>

      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">
          Notlar
          <span class="form-label-opt">(isteğe bağlı)</span>
        </label>
        <textarea class="form-control" id="dgf-notlar" rows="2"
          maxlength="500" placeholder="İsteğe bağlı not..."></textarea>
      </div>

    </div><!-- /modal-body -->

    <div class="modal-footer">
      <button class="btn btn-secondary" id="dgf-vazgec">Vazgeç</button>
      <button class="btn btn-primary"   id="dgf-kaydet">Kaydet</button>
    </div>

  </div>
</div>`;
}

// ─── Ana Fonksiyon ─────────────────────────────────────────────

export function openGiderForm() {
  if (document.getElementById('gider-form-overlay')) return;

  document.body.insertAdjacentHTML('beforeend', buildHTML());
  const overlay = document.getElementById('gider-form-overlay');

  overlay.querySelector('#dgf-kategori-grid').addEventListener('click', e => {
    const btn = e.target.closest('.kategori-btn');
    if (!btn) return;
    overlay.querySelectorAll('.kategori-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    clearGridError(overlay.querySelector('#dgf-kategori-grid'));
  });

  overlay.querySelector('#dgf-kategori-grid').addEventListener('keydown', e => {
    if (e.key === ' ') {
      const btn = e.target.closest('.kategori-btn');
      if (!btn) return;
      e.preventDefault();
      btn.click();
    }
  });

  overlay.querySelector('#dgf-tutar')?.addEventListener('input', () => updatePreview(overlay));
  overlay.querySelector('#dgf-kdv')?.addEventListener('change', () => updatePreview(overlay));

  function close() {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
    document.removeEventListener('keydown', onEsc);
  }

  function onEsc(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onEsc);

  overlay.querySelector('#dgf-close')?.addEventListener('click', close);
  overlay.querySelector('#dgf-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#dgf-kaydet')?.addEventListener('click', async () => {
    if (!validate(overlay)) return;

    const kaydetBtn = overlay.querySelector('#dgf-kaydet');
    kaydetBtn.disabled = true;
    kaydetBtn.textContent = 'Kaydediliyor...';
    setSyncStatus('🟡 Kaydediliyor...', '#ffd780');

    try {
      const data  = collectData(overlay);
      const kayit = await addGider(data);

      setSyncStatus('🟢 Bağlı', '#b8f0b8');
      close();
      document.dispatchEvent(new CustomEvent('smm:gider-saved', { detail: { kayit } }));
    } catch (err) {
      console.error('[GiderForm] Kayıt hatası:', err);
      setSyncStatus('🔴 Hata', '#ffb3b3');
      const msg = err.message?.includes('network') || err.message?.includes('offline')
        ? 'İnternet bağlantısı yok, daha sonra tekrar deneyin'
        : 'Kayıt başarısız: ' + (err.message || 'Bilinmeyen hata');
      showToast(msg, 'error');
      kaydetBtn.disabled = false;
      kaydetBtn.textContent = 'Kaydet';
    }
  });

  setTimeout(() => overlay.querySelector('#dgf-tarih')?.focus(), 80);
}
