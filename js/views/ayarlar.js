import { getAyarlar } from '../state.js';
import { updateAyarlar } from '../db.js';

export default {
  render() {
    const a = getAyarlar();

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Ayarlar</span>
      </div>

      <div class="warning-banner">
        ⚠️ Tüm hesaplamalar tahminidir. Kesin rakamlar için mali müşavirinize danışınız.
      </div>

      <div class="card mb-3">
        <div style="font-weight:700;margin-bottom:14px;color:var(--accent)">Muayenehane Bilgileri</div>
        <div class="form-group">
          <label class="form-label">İsim / Unvan</label>
          <input class="form-control" id="set-isim" type="text"
            value="${a.isimUnvan || ''}" placeholder="Dr. Ad Soyad">
        </div>
        <div class="form-group">
          <label class="form-label">Vergi Numarası</label>
          <input class="form-control" id="set-vergino" type="text" inputmode="numeric"
            value="${a.vergiNo || ''}" placeholder="1234567890">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Adres</label>
          <textarea class="form-control" id="set-adres" rows="2"
            placeholder="Muayenehane adresi">${a.adres || ''}</textarea>
        </div>
      </div>

      <div class="card mb-3">
        <div style="font-weight:700;margin-bottom:12px;color:var(--accent)">SMM Bilgileri</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">
          <span style="font-size:14px;color:var(--text-secondary)">Son SMM No</span>
          <span style="font-size:20px;font-weight:700;color:var(--text-primary)">#${a.sonSmmNo}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px">
          Bir sonraki kayıt <strong>#${a.sonSmmNo + 1}</strong> numarası alacak.
        </div>
      </div>

      <div class="card mb-4">
        <div style="font-weight:700;margin-bottom:12px;color:var(--accent)">Uygulama Durumu</div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px">Versiyon</span>
          <span style="font-size:14px;color:var(--text-secondary)">0.1.0 (iskelet)</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px">Firebase</span>
          <span style="font-size:14px;color:var(--warning)">Bağlı değil (mock)</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0">
          <span style="font-size:14px">Depolama</span>
          <span style="font-size:14px;color:var(--text-secondary)">LocalStorage</span>
        </div>
      </div>

      <button class="btn btn-primary btn-block" id="btnAyarlarKaydet">Kaydet</button>
    `;
  },

  afterRender() {
    document.getElementById('btnAyarlarKaydet')?.addEventListener('click', async () => {
      updateAyarlar({
        isimUnvan: document.getElementById('set-isim')?.value?.trim() || '',
        vergiNo:   document.getElementById('set-vergino')?.value?.trim() || '',
        adres:     document.getElementById('set-adres')?.value?.trim() || ''
      });
      const btn = document.getElementById('btnAyarlarKaydet');
      if (btn) {
        btn.textContent = '✓ Kaydedildi';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = 'Kaydet';
          btn.disabled = false;
        }, 1800);
      }
    });
  }
};
