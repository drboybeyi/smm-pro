import { getAyarlar, addGelir } from '../state.js';
import { bugun, kdvAyristir, formatTL } from '../utils.js';

const KDV_DEFAULT = {
  muayene: 'muaf',
  kontrol:  'muaf',
  tetkik:   '10',
  islem:    '10',
  diger:    'muaf'
};

function nextSmmNo() {
  return (getAyarlar().sonSmmNo || 0) + 1;
}

function kdvOraniNum(durum) {
  return durum === 'muaf' ? 0 : Number(durum);
}

// ─── Canlı KDV Önizlemesi ──────────────────────────────────────

function updatePreview(overlay) {
  const tutarEl = overlay.querySelector('#gf-tutar');
  const preview = overlay.querySelector('#gf-kdv-preview');
  if (!tutarEl || !preview) return;

  const tutar = parseFloat(tutarEl.value) || 0;
  const durum = overlay.querySelector('.gf-kdv-btn.active')?.dataset.val || 'muaf';

  if (tutar <= 0) {
    preview.textContent = 'Tutar giriniz...';
    return;
  }

  const orani = kdvOraniNum(durum);
  const { brut, kdv, toplam } = kdvAyristir(tutar, orani);

  if (durum === 'muaf') {
    preview.innerHTML =
      `Brüt: <strong>${formatTL(brut)}</strong> &nbsp;·&nbsp; ` +
      `KDV: yok &nbsp;·&nbsp; ` +
      `Toplam: <strong>${formatTL(toplam)}</strong>`;
  } else {
    preview.innerHTML =
      `Brüt: <strong>${formatTL(brut)}</strong> &nbsp;·&nbsp; ` +
      `KDV (%${orani}): <strong>${formatTL(kdv)}</strong> &nbsp;·&nbsp; ` +
      `Toplam: <strong>${formatTL(toplam)}</strong>`;
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

function setGroupError(groupEl) {
  if (!groupEl) return;
  groupEl.classList.add('error-group');
  let errEl = groupEl.parentNode.querySelector('.form-error');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error';
    groupEl.parentNode.appendChild(errEl);
  }
  errEl.textContent = 'Bu alan zorunludur';
}

function clearGroupError(groupEl) {
  if (!groupEl) return;
  groupEl.classList.remove('error-group');
  groupEl.parentNode.querySelector('.form-error')?.remove();
}

// ─── Validasyon ────────────────────────────────────────────────

function validate(overlay) {
  let firstError = null;
  let valid = true;

  const tarihEl   = overlay.querySelector('#gf-tarih');
  const tutarEl   = overlay.querySelector('#gf-tutar');
  const hizmetGrp = overlay.querySelector('.gf-hizmet-group');
  const kdvGrp    = overlay.querySelector('.gf-kdv-group');
  const odemeGrp  = overlay.querySelector('.gf-odeme-group');

  // Tarih
  if (!tarihEl?.value) {
    setFieldError(tarihEl, 'Tarih zorunludur');
    if (!firstError) firstError = tarihEl;
    valid = false;
  } else {
    clearFieldError(tarihEl);
  }

  // Hizmet tipi
  if (!overlay.querySelector('.gf-hizmet-btn.active')) {
    setGroupError(hizmetGrp);
    if (!firstError) firstError = hizmetGrp;
    valid = false;
  } else {
    clearGroupError(hizmetGrp);
  }

  // KDV durumu
  if (!overlay.querySelector('.gf-kdv-btn.active')) {
    setGroupError(kdvGrp);
    if (!firstError) firstError = kdvGrp;
    valid = false;
  } else {
    clearGroupError(kdvGrp);
  }

  // Tutar
  const tutarVal = parseFloat(tutarEl?.value || '');
  if (!tutarEl?.value || isNaN(tutarVal) || tutarVal < 0.01) {
    setFieldError(tutarEl, "Geçerli bir tutar girin (0'dan büyük)");
    if (!firstError) firstError = tutarEl;
    valid = false;
  } else {
    clearFieldError(tutarEl);
  }

  // Ödeme şekli
  if (!overlay.querySelector('.gf-odeme-btn.active')) {
    setGroupError(odemeGrp);
    if (!firstError) firstError = odemeGrp;
    valid = false;
  } else {
    clearGroupError(odemeGrp);
  }

  if (firstError) {
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof firstError.focus === 'function') firstError.focus();
  }

  return valid;
}

// ─── Veri Toplama ──────────────────────────────────────────────

function collectData(overlay) {
  const tarih      = overlay.querySelector('#gf-tarih').value;
  const hizmetTipi = overlay.querySelector('.gf-hizmet-btn.active').dataset.val;
  const kdvDurumu  = overlay.querySelector('.gf-kdv-btn.active').dataset.val;
  const odemeSekli = overlay.querySelector('.gf-odeme-btn.active').dataset.val;
  const tutar      = parseFloat(overlay.querySelector('#gf-tutar').value);
  const hastaAdi   = overlay.querySelector('#gf-hasta').value.trim().slice(0, 100);
  const notlar     = overlay.querySelector('#gf-notlar').value.trim().slice(0, 500);

  const { brut, kdv, toplam } = kdvAyristir(tutar, kdvOraniNum(kdvDurumu));

  return { tarih, hizmetTipi, kdvDurumu, odemeSekli, toplamTutar: toplam, brutTutar: brut, kdvTutari: kdv, hastaAdi, notlar };
}

// ─── Form HTML ─────────────────────────────────────────────────

function buildHTML(nextNo) {
  return `
<div id="gelir-form-overlay" class="modal-overlay">
  <div class="modal-box">

    <div class="modal-header">
      <span class="modal-title">Yeni Gelir Kaydı</span>
      <button class="modal-close" id="gf-close" aria-label="Kapat">&#x2715;</button>
    </div>

    <div class="modal-body">

      <div class="form-group">
        <label class="form-label">Tarih <span class="req">*</span></label>
        <input class="form-control" id="gf-tarih" type="date" value="${bugun()}" required>
      </div>

      <div class="form-group">
        <label class="form-label">SMM No</label>
        <div class="smm-no-hint">Otomatik atanır, atlamasız sıra</div>
        <input class="form-control form-control-readonly" type="text"
          value="#${nextNo}" readonly tabindex="-1">
      </div>

      <div class="form-group">
        <label class="form-label">Hizmet Tipi <span class="req">*</span></label>
        <div class="btn-group gf-hizmet-group">
          <button type="button" class="btn-option gf-hizmet-btn active" data-val="muayene">Muayene</button>
          <button type="button" class="btn-option gf-hizmet-btn" data-val="kontrol">Kontrol</button>
          <button type="button" class="btn-option gf-hizmet-btn" data-val="tetkik">Tetkik</button>
          <button type="button" class="btn-option gf-hizmet-btn" data-val="islem">İşlem</button>
          <button type="button" class="btn-option gf-hizmet-btn" data-val="diger">Diğer</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">KDV Durumu <span class="req">*</span></label>
        <div class="btn-group gf-kdv-group">
          <button type="button" class="btn-option gf-kdv-btn active" data-val="muaf">Muaf</button>
          <button type="button" class="btn-option gf-kdv-btn" data-val="10">%10</button>
          <button type="button" class="btn-option gf-kdv-btn" data-val="20">%20</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Toplam Tutar — KDV dahil <span class="req">*</span></label>
        <input class="form-control" id="gf-tutar" type="number"
          step="0.01" min="0.01" inputmode="decimal"
          placeholder="Hastadan alınan toplam (₺)" autocomplete="off">
        <div class="kdv-preview" id="gf-kdv-preview">Tutar giriniz...</div>
      </div>

      <div class="form-group">
        <label class="form-label">Ödeme Şekli <span class="req">*</span></label>
        <div class="btn-group gf-odeme-group">
          <button type="button" class="btn-option gf-odeme-btn active" data-val="nakit">💵 Nakit</button>
          <button type="button" class="btn-option gf-odeme-btn" data-val="kart">💳 Kart</button>
          <button type="button" class="btn-option gf-odeme-btn" data-val="havale">🏦 Havale</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">
          Hasta Adı
          <span class="form-label-opt">(isteğe bağlı)</span>
        </label>
        <input class="form-control" id="gf-hasta" type="text"
          maxlength="100" placeholder="Hasta adı soyadı"
          autocomplete="off" autocorrect="off" autocapitalize="words">
      </div>

      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">
          Notlar
          <span class="form-label-opt">(isteğe bağlı)</span>
        </label>
        <textarea class="form-control" id="gf-notlar" rows="2"
          maxlength="500" placeholder="İsteğe bağlı not..."></textarea>
      </div>

    </div><!-- /modal-body -->

    <div class="modal-footer">
      <button class="btn btn-secondary" id="gf-vazgec">Vazgeç</button>
      <button class="btn btn-primary"   id="gf-kaydet">Kaydet</button>
    </div>

  </div>
</div>`;
}

// ─── Ana Fonksiyon ─────────────────────────────────────────────

export function openGelirForm() {
  if (document.getElementById('gelir-form-overlay')) return;

  const nextNo = nextSmmNo();
  document.body.insertAdjacentHTML('beforeend', buildHTML(nextNo));
  const overlay = document.getElementById('gelir-form-overlay');

  // Button group helper
  function initGroup(selector, onChange) {
    overlay.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll(selector).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange?.(btn.dataset.val);
      });
    });
  }

  // Hizmet tipi → KDV oto-seçimi
  initGroup('.gf-hizmet-btn', val => {
    const kdvDefault = KDV_DEFAULT[val] || 'muaf';
    overlay.querySelectorAll('.gf-kdv-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.val === kdvDefault)
    );
    updatePreview(overlay);
  });

  initGroup('.gf-kdv-btn',   () => updatePreview(overlay));
  initGroup('.gf-odeme-btn');

  overlay.querySelector('#gf-tutar')?.addEventListener('input', () => updatePreview(overlay));

  // İleri tarih uyarısı (izin ver, sadece uyar)
  overlay.querySelector('#gf-tarih')?.addEventListener('change', e => {
    const existing = overlay.querySelector('#gf-tarih-warn');
    if (e.target.value > bugun()) {
      if (!existing) {
        const w = document.createElement('div');
        w.id = 'gf-tarih-warn';
        w.className = 'form-warn';
        w.textContent = 'İleri tarih seçildi. İleri tarihli SMM kesilebilir, devam edebilirsiniz.';
        e.target.after(w);
      }
    } else {
      existing?.remove();
    }
  });

  // Kapat
  function close() {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
    document.removeEventListener('keydown', onEsc);
  }

  function onEsc(e) { if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onEsc);

  overlay.querySelector('#gf-close')?.addEventListener('click', close);
  overlay.querySelector('#gf-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Kaydet
  overlay.querySelector('#gf-kaydet')?.addEventListener('click', () => {
    if (!validate(overlay)) return;

    const data  = collectData(overlay);
    const kayit = addGelir(data);

    close();
    document.dispatchEvent(new CustomEvent('smm:gelir-saved', { detail: { kayit } }));
  });

  // İlk alana focus
  setTimeout(() => overlay.querySelector('#gf-tarih')?.focus(), 80);
}
