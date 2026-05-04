import { getVadeler } from '../state.js';
import { addVade, deleteVade } from '../db.js';
import { formatTL, formatTarih, bugun, gunFarki } from '../utils.js';
import { show as showToast } from '../components/toast.js';

// "Vade Planı Oluştur" — tüm mevcut bekliyor vadeleri siler, yenileri ekler
export function openVadePlani(cari, bakiye) {
  if (document.getElementById('vp-overlay')) return;

  const mevcutVadeler = getVadeler().filter(v => v.cariId === cari.id && v.durum === 'bekliyor');
  const absBorc       = Math.abs(bakiye);

  const overlay = document.createElement('div');
  overlay.id = 'vp-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '230';

  function satirHTML(idx, tutar = '', tarih = '') {
    return `
      <div class="vp-satir" data-idx="${idx}">
        <input class="form-control vp-tutar" type="number" step="0.01" min="0.01"
          inputmode="decimal" placeholder="Tutar" value="${tutar}">
        <input class="form-control vp-tarih" type="date" value="${tarih}">
        <button type="button" class="vp-sil-btn" title="Sil">✕</button>
      </div>`;
  }

  const baslangicSatirlar = mevcutVadeler.length > 0
    ? mevcutVadeler.map((v, i) => satirHTML(i, v.tutar, v.vadeTarih)).join('')
    : satirHTML(0, '', '');

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:440px">
      <div class="modal-header">
        <span class="modal-title">Vade Planı — ${cari.ad}</span>
        <button class="modal-close" id="vp-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="vp-borc-info">
          Mevcut Bakiye:
          <strong style="color:${bakiye < 0 ? 'var(--danger)' : 'var(--success)'}">
            ${bakiye >= 0 ? '+' : ''}${formatTL(bakiye)}
          </strong>
        </div>

        <div id="vp-satirlar">${baslangicSatirlar}</div>

        <button class="btn btn-secondary btn-sm" id="vp-ekle-btn" style="margin-top:8px;width:100%">+ Vade Ekle</button>

        <div class="vp-ozet" id="vp-ozet">
          <span>Planlanmış: <strong id="vp-toplam">0,00 TL</strong></span>
          <span>Borç: <strong>${formatTL(absBorc)}</strong></span>
          <span id="vp-kalan-wrap">Kalan: <strong id="vp-kalan">0,00 TL</strong></span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="vp-vazgec">Vazgeç</button>
        <button class="btn btn-primary" id="vp-kaydet">Kaydet</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  let satirSay = mevcutVadeler.length > 0 ? mevcutVadeler.length : 1;

  function hesaplaOzet() {
    const tutarlar = [...overlay.querySelectorAll('.vp-tutar')]
      .map(el => parseFloat(el.value) || 0);
    const toplam   = tutarlar.reduce((s, t) => s + t, 0);
    const kalan    = absBorc - toplam;

    overlay.querySelector('#vp-toplam').textContent   = formatTL(toplam);
    const kalanEl  = overlay.querySelector('#vp-kalan');
    const kalanWrap = overlay.querySelector('#vp-kalan-wrap');
    if (Math.abs(kalan) < 0.01) {
      kalanEl.textContent = '✓ Tam planlandı';
      kalanWrap.style.color = 'var(--success)';
    } else {
      kalanEl.textContent = formatTL(Math.abs(kalan));
      kalanWrap.style.color = kalan > 0 ? 'var(--warning)' : 'var(--danger)';
    }
  }

  function bindSatirEvents() {
    overlay.querySelectorAll('.vp-sil-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (overlay.querySelectorAll('.vp-satir').length <= 1) return;
        btn.closest('.vp-satir').remove();
        hesaplaOzet();
      });
    });
    overlay.querySelectorAll('.vp-tutar').forEach(el => {
      el.addEventListener('input', hesaplaOzet);
    });
  }

  bindSatirEvents();
  hesaplaOzet();

  overlay.querySelector('#vp-ekle-btn')?.addEventListener('click', () => {
    const container = overlay.querySelector('#vp-satirlar');
    const tmp       = document.createElement('div');
    tmp.innerHTML   = satirHTML(satirSay++, '', '');
    container.appendChild(tmp.firstElementChild);
    bindSatirEvents();
    hesaplaOzet();
    container.lastElementChild?.querySelector('.vp-tutar')?.focus();
  });

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#vp-close')?.addEventListener('click', close);
  overlay.querySelector('#vp-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#vp-kaydet')?.addEventListener('click', async () => {
    const satirlar = [...overlay.querySelectorAll('.vp-satir')].map(row => ({
      tutar: parseFloat(row.querySelector('.vp-tutar').value) || 0,
      tarih: row.querySelector('.vp-tarih').value,
    }));

    const gecersiz = satirlar.filter(s => s.tutar <= 0 || !s.tarih);
    if (gecersiz.length) {
      showToast('Her satırda tutar ve tarih zorunludur', 'error');
      return;
    }

    const btn = overlay.querySelector('#vp-kaydet');
    btn.disabled = true;
    btn.textContent = 'Kaydediliyor...';

    try {
      for (const v of mevcutVadeler) await deleteVade(v.id);
      for (const s of satirlar) {
        await addVade({ cariId: cari.id, tutar: s.tutar, vadeTarih: s.tarih, durum: 'bekliyor', notlar: '' });
      }
      showToast('Vade planı kaydedildi', 'success');
      close();
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Kayıt başarısız'), 'error');
      btn.disabled = false;
      btn.textContent = 'Kaydet';
    }
  });
}

// "Tek Vade Ekle" — mevcut plana yeni bir vade ekler
export function openVadeEkle(cari) {
  if (document.getElementById('ve-overlay')) return;

  const biraysonra = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const overlay = document.createElement('div');
  overlay.id = 've-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '230';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <div class="modal-header">
        <span class="modal-title">Vade Ekle — ${cari.ad}</span>
        <button class="modal-close" id="ve-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Tutar <span class="req">*</span></label>
          <input class="form-control" id="ve-tutar" type="number" step="0.01" min="0.01"
            inputmode="decimal" placeholder="0,00" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label">Vade Tarihi <span class="req">*</span></label>
          <input class="form-control" id="ve-tarih" type="date" value="${biraysonra}">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Notlar <span class="form-label-opt">(isteğe bağlı)</span></label>
          <input class="form-control" id="ve-notlar" type="text" maxlength="200" placeholder="Not...">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="ve-vazgec">Vazgeç</button>
        <button class="btn btn-primary" id="ve-kaydet">Kaydet</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#ve-close')?.addEventListener('click', close);
  overlay.querySelector('#ve-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#ve-kaydet')?.addEventListener('click', async () => {
    const tutar  = parseFloat(overlay.querySelector('#ve-tutar').value);
    const tarih  = overlay.querySelector('#ve-tarih').value;
    const notlar = overlay.querySelector('#ve-notlar').value.trim();

    overlay.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
    overlay.querySelectorAll('.form-error').forEach(e => e.remove());

    let valid = true;
    if (!tutar || tutar <= 0) {
      overlay.querySelector('#ve-tutar').classList.add('error'); valid = false;
    }
    if (!tarih) {
      overlay.querySelector('#ve-tarih').classList.add('error'); valid = false;
    }
    if (!valid) return;

    const btn = overlay.querySelector('#ve-kaydet');
    btn.disabled = true;

    try {
      await addVade({ cariId: cari.id, tutar, vadeTarih: tarih, durum: 'bekliyor', notlar });
      showToast('Vade eklendi', 'success');
      close();
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Kayıt başarısız'), 'error');
      btn.disabled = false;
    }
  });

  setTimeout(() => overlay.querySelector('#ve-tutar')?.focus(), 80);
}
