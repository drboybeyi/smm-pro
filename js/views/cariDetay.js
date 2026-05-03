import { getCariler, getIslemler, getKasalar, getKategoriler, subscribe } from '../state.js';
import {
  hesaplaCariBakiye, hesaplaSonrakiVade, gunFarki,
  formatTL, formatTarih, bugun
} from '../utils.js';
import { updateCari, addIslem } from '../db.js';
import { show as showToast } from '../components/toast.js';
import { openIslemDetay } from '../components/islemDetay.js';
import { openCariForm } from '../components/cariForm.js';

const ETKI_LABEL = {
  borc_yaz:   '📋 Borç',
  borc_cikar: '📋 Alacak',
  odeme:      '💸 Ödeme',
  avans_ver:  '💳 Avans',
  tahsilat:   '💰 Tahsilat',
};

function tipIcon(tip) {
  if (tip === 'tedarikci') return '💊';
  if (tip === 'personel')  return '👤';
  return '🏥';
}

function tipLabel(tip) {
  if (tip === 'tedarikci') return 'Tedarikçi';
  if (tip === 'personel')  return 'Personel';
  return 'Müşteri';
}

function bakiyeCard(bakiye, tip) {
  const sifir = Math.abs(bakiye) < 0.01;
  if (sifir) {
    return `<div class="cari-bakiye-card cari-bakiye-sifir">
      <div class="cari-bakiye-tutar">0,00 TL</div>
      <div class="cari-bakiye-etiket">✓ Hesap Kapalı</div>
    </div>`;
  }
  const pos   = bakiye > 0;
  const cls   = pos ? 'cari-bakiye-alacak' : 'cari-bakiye-borc';
  const label = pos
    ? (tip === 'tedarikci' ? 'Fazla Ödeme' : 'Alacaklısınız')
    : (tip === 'tedarikci' ? 'Borcunuz' : 'Ödenecek');
  return `<div class="cari-bakiye-card ${cls}">
    <div class="cari-bakiye-tutar">${pos ? '+' : ''}${formatTL(bakiye)}</div>
    <div class="cari-bakiye-etiket">${label}</div>
  </div>`;
}

function vadeCard(cari, bugunStr) {
  const vade = hesaplaSonrakiVade(cari, bugunStr);
  if (!vade) return '';
  const fark  = gunFarki(vade, bugunStr);
  if (fark < 0) return '';
  const acil  = fark <= 7;
  const text  = fark === 0 ? 'Bugün!' : `${fark} gün sonra`;
  const periyot = cari.vadeTipi === 'her_ay'
    ? `Her ayın ${cari.vadeGunu}. günü`
    : formatTarih(cari.vadeTarih);
  return `<div class="cari-vade-card${acil ? ' cari-vade-card-acil' : ''}">
    <span>⚠️ Ödeme Vadesi: ${periyot}</span>
    <span class="cari-vade-fark">${text}</span>
  </div>`;
}

function aksiyonBtns(tip) {
  if (tip === 'tedarikci') return [
    { etkisi: 'borc_yaz', label: 'Borç Yaz',  cls: 'btn-danger' },
    { etkisi: 'odeme',    label: 'Ödeme Yap', cls: 'btn-success' },
  ];
  if (tip === 'personel') return [
    { etkisi: 'avans_ver', label: 'Avans Ver',  cls: 'btn-secondary' },
    { etkisi: 'tahsilat',  label: 'Tahsilat',   cls: 'btn-success' },
  ];
  return [
    { etkisi: 'borc_cikar', label: 'Borç Çıkar', cls: 'btn-secondary' },
    { etkisi: 'tahsilat',   label: 'Tahsilat',   cls: 'btn-success' },
  ];
}

export function openCariDetay(cariInput) {
  if (document.getElementById('cari-detay-overlay')) return;

  const cariId = cariInput.id;
  let cari     = cariInput;

  const overlay = document.createElement('div');
  overlay.id = 'cari-detay-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '210';
  document.body.appendChild(overlay);

  const unsubIslemler = subscribe('islemler', renderContent);
  const unsubCariler  = subscribe('cariler', () => {
    const updated = getCariler().find(c => c.id === cariId);
    if (!updated) { close(); return; }
    cari = updated;
    renderContent();
  });

  function renderContent() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const today       = bugun();
    const bakiye      = hesaplaCariBakiye(cariId, islemler);
    const hareketler  = islemler.filter(i => i.cariId === cariId);
    const btns        = aksiyonBtns(cari.tip);

    const hareketHtml = hareketler.length === 0
      ? `<p style="text-align:center;font-size:13px;color:var(--text-secondary);padding:16px 0">Henüz hareket yok.</p>`
      : hareketler.map(h => {
          const kasa    = kasalar.find(k => k.id === h.kasaId);
          const label   = ETKI_LABEL[h.cariEtkisi] || h.cariEtkisi;
          const tutar   = h.tutar || 0;
          const isGelir = h.tip === 'gelir';
          const cls     = isGelir ? 'income' : 'expense';
          const prefix  = isGelir ? '+' : '-';
          return `
            <div class="list-item hareket-item" data-islem-id="${h.id}" style="cursor:pointer">
              <div class="list-item-body">
                <div class="list-item-title">${label}${h.aciklama ? ' · ' + h.aciklama : ''}</div>
                <div class="list-item-subtitle">${formatTarih(h.tarih)}${kasa ? ' · ' + kasa.ad : ''}</div>
              </div>
              <div class="list-item-amount ${cls}">${prefix}${formatTL(tutar)}</div>
            </div>`;
        }).join('');

    overlay.innerHTML = `
      <div class="modal-box cari-detay-box">
        <div class="modal-header">
          <span class="modal-title" style="display:flex;align-items:center;gap:8px">
            <span>${tipIcon(cari.tip)}</span>
            <span>${cari.ad}</span>
            <span class="cari-tip-chip">${tipLabel(cari.tip)}</span>
          </span>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn btn-secondary btn-sm" id="cd-duzenle">Düzenle</button>
            <button class="btn btn-sm" style="background:#faeaea;color:var(--danger);border:1px solid #e8c0c0" id="cd-sil">Sil</button>
            <button class="modal-close" id="cd-close">✕</button>
          </div>
        </div>
        <div class="modal-body" style="padding-top:12px">

          ${bakiyeCard(bakiye, cari.tip)}
          ${vadeCard(cari, today)}

          <div class="cari-aksiyonlar">
            ${btns.map(b => `
              <button class="btn ${b.cls} cari-aksiyon-btn" data-etkisi="${b.etkisi}">${b.label}</button>
            `).join('')}
          </div>

          <div class="section-header" style="margin-top:16px">
            <span class="section-title" style="font-size:13px">Hareket Geçmişi (${hareketler.length})</span>
          </div>
          <div id="cd-hareketler">${hareketHtml}</div>

        </div>
      </div>`;

    overlay.querySelector('#cd-close')?.addEventListener('click', close);

    overlay.querySelector('#cd-duzenle')?.addEventListener('click', () => {
      openCariForm(cari);
    });

    overlay.querySelector('#cd-sil')?.addEventListener('click', () => {
      showSilOnay(cari, close);
    });

    overlay.querySelectorAll('.cari-aksiyon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openCariIslemForm(cari, btn.dataset.etkisi);
      });
    });

    overlay.querySelectorAll('.hareket-item').forEach(item => {
      item.addEventListener('click', () => {
        const id    = item.dataset.islemId;
        const islem = getIslemler().find(i => i.id === id);
        if (islem) openIslemDetay(islem);
      });
    });
  }

  function close() {
    unsubIslemler();
    unsubCariler();
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  renderContent();
}

// ─── Sil Onay ─────────────────────────────────────────────────

function showSilOnay(cari, onSuccess) {
  if (document.getElementById('cari-sil-onay')) return;

  const modal = document.createElement('div');
  modal.id = 'cari-sil-onay';
  modal.className = 'modal-overlay';
  modal.style.zIndex = '230';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <div class="modal-header">
        <span class="modal-title">Cariyi Sil?</span>
        <button class="modal-close" id="cso-close">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:15px;color:var(--text-primary);line-height:1.6">
          <strong>${cari.ad}</strong> cari hesabı silinecek.
        </p>
        <p style="font-size:13px;color:var(--text-secondary);margin-top:8px">
          İlişkili işlemler kasa kayıtlarında kalacak, cari bağlantısı kopacak.
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cso-vazgec">Vazgeç</button>
        <button class="btn btn-danger" id="cso-onayla">Evet, Sil</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  modal.querySelector('#cso-close')?.addEventListener('click', closeModal);
  modal.querySelector('#cso-vazgec')?.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  modal.querySelector('#cso-onayla')?.addEventListener('click', async () => {
    try {
      await updateCari(cari.id, { silindi: true });
      closeModal();
      onSuccess();
      showToast('Cari silindi', 'info');
    } catch (err) {
      showToast('Silinemedi: ' + (err.message || 'Hata'), 'error');
    }
  });
}

// ─── Cari İşlem Formu ─────────────────────────────────────────

function openCariIslemForm(cari, etkiTipi) {
  if (document.getElementById('cif-overlay')) return;

  const kasalar     = getKasalar();
  const kategoriler = getKategoriler();

  const TITLE = {
    borc_yaz:   'Borç Yaz',
    odeme:      'Ödeme Yap',
    avans_ver:  'Avans Ver',
    tahsilat:   'Tahsilat',
    borc_cikar: 'Borç Çıkar',
  };

  const needsKasa    = ['odeme', 'avans_ver', 'tahsilat'].includes(etkiTipi);
  const needsKat     = ['borc_yaz', 'borc_cikar'].includes(etkiTipi);
  const katTip       = etkiTipi === 'borc_cikar' ? 'gelir' : 'gider';

  const kasaOpts = kasalar.length
    ? kasalar.map(k => `<option value="${k.id}">${k.emoji} ${k.ad}</option>`).join('')
    : '<option value="" disabled>Önce kasa ekleyin</option>';

  const katFiltered = kategoriler.filter(k => k.tip === katTip);
  const katGridHtml = needsKat
    ? (katFiltered.length
        ? `<div class="kategori-grid" id="cif-kat-grid" role="radiogroup">
             ${katFiltered.map(k => `
               <button type="button" class="kategori-btn" role="radio" aria-pressed="false" data-id="${k.id}">
                 <span class="k-emoji">${k.emoji}</span>
                 <span class="k-label">${k.ad}</span>
               </button>`).join('')}
           </div>`
        : `<p style="font-size:13px;color:var(--text-secondary)">Önce kategori ekleyin.</p>`)
    : '';

  const overlay = document.createElement('div');
  overlay.id = 'cif-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '220';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">${TITLE[etkiTipi]} — ${cari.ad}</span>
        <button class="modal-close" id="cif-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Tarih <span class="req">*</span></label>
          <input class="form-control" id="cif-tarih" type="date" value="${bugun()}">
        </div>
        <div class="form-group">
          <label class="form-label">Tutar <span class="req">*</span></label>
          <input class="form-control" id="cif-tutar" type="number"
            step="0.01" min="0.01" inputmode="decimal" placeholder="0,00" autocomplete="off">
        </div>
        ${needsKasa ? `
        <div class="form-group">
          <label class="form-label">Kasa <span class="req">*</span></label>
          <select class="form-control" id="cif-kasa">
            <option value="">Kasa seçin...</option>
            ${kasaOpts}
          </select>
        </div>` : ''}
        ${needsKat ? `
        <div class="form-group">
          <label class="form-label">Kategori <span class="form-label-opt">(isteğe bağlı)</span></label>
          ${katGridHtml}
        </div>` : ''}
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Açıklama <span class="form-label-opt">(isteğe bağlı)</span></label>
          <input class="form-control" id="cif-aciklama" type="text"
            maxlength="200" placeholder="Not..." autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cif-vazgec">Vazgeç</button>
        <button class="btn btn-primary" id="cif-kaydet">Kaydet</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  let selectedKatId = null;

  overlay.querySelectorAll('.kategori-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.kategori-btn').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      selectedKatId = btn.dataset.id;
    });
  });

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#cif-close')?.addEventListener('click', close);
  overlay.querySelector('#cif-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#cif-kaydet')?.addEventListener('click', async () => {
    const tarih    = overlay.querySelector('#cif-tarih').value;
    const tutarStr = overlay.querySelector('#cif-tutar').value;
    const kasaId   = overlay.querySelector('#cif-kasa')?.value || null;
    const aciklama = overlay.querySelector('#cif-aciklama').value.trim();
    const tutarVal = parseFloat(tutarStr);

    overlay.querySelectorAll('.form-error').forEach(e => e.remove());
    overlay.querySelectorAll('.error').forEach(e => e.classList.remove('error'));

    let valid = true;
    const tarihEl = overlay.querySelector('#cif-tarih');
    const tutarEl = overlay.querySelector('#cif-tutar');

    if (!tarih) { tarihEl.classList.add('error'); valid = false; }
    if (!tutarStr || isNaN(tutarVal) || tutarVal < 0.01) { tutarEl.classList.add('error'); valid = false; }

    if (needsKasa && !kasaId) {
      const kasaEl = overlay.querySelector('#cif-kasa');
      kasaEl?.classList.add('error');
      valid = false;
    }

    if (!valid) return;

    const islemTip = ['tahsilat', 'borc_cikar'].includes(etkiTipi) ? 'gelir' : 'gider';

    const islemData = {
      tarih, tip: islemTip, tutar: tutarVal,
      kasaId:     needsKasa ? kasaId : null,
      kategoriId: needsKat  ? (selectedKatId || null) : null,
      aciklama,
      cariId:     cari.id,
      cariEtkisi: etkiTipi,
    };

    const btn = overlay.querySelector('#cif-kaydet');
    btn.disabled = true;

    try {
      await addIslem(islemData);
      close();
      showToast(TITLE[etkiTipi] + ' kaydedildi', 'success');
      document.dispatchEvent(new CustomEvent('defter:islem-saved'));
    } catch (err) {
      showToast('Kayıt hatası: ' + (err.message || 'Bilinmeyen hata'), 'error');
      btn.disabled = false;
    }
  });

  setTimeout(() => overlay.querySelector('#cif-tutar')?.focus(), 80);
}
