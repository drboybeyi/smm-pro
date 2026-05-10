import { getKasalar, getKategoriler, getIslemler } from '../state.js';
import { bugun, formatTL, kasaTipiBul, hesaplaCariBakiye } from '../utils.js';
import { addIslem } from '../db.js';
import { show as showToast } from '../components/toast.js';

export function openMaasOde(cari) {
  if (document.getElementById('maas-ode-overlay')) return;

  const kasalar     = getKasalar();
  const kategoriler = getKategoriler();
  const islemler    = getIslemler();

  const avans    = hesaplaCariBakiye(cari.id, islemler);
  const avansVar = avans > 0.01;

  const nakitKasa = kasaTipiBul(kasalar, 'nakit', 'cash');
  const bankaKasa = kasaTipiBul(kasalar, 'banka', 'bankalar', 'bank');

  const STORAGE_KEY = `personel-${cari.id}-son-dagilim`;
  let sonDagilim = { nakit: 0, banka: 0 };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) sonDagilim = JSON.parse(stored);
  } catch {}

  const overlay = document.createElement('div');
  overlay.id = 'maas-ode-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '225';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">💰 Maaş Öde — ${cari.ad}</span>
        <button class="modal-close" id="mo-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Tarih</label>
          <input class="form-control" id="mo-tarih" type="date" value="${bugun()}">
        </div>
        <div class="form-group">
          <label class="form-label">Brüt Maaş <span class="req">*</span></label>
          <input class="form-control" id="mo-brut" type="number"
            step="0.01" min="0.01" inputmode="decimal" placeholder="0,00" autocomplete="off"
            value="${cari.sabitBrutMaas || ''}">
        </div>
        ${avansVar ? `
        <div class="maas-avans-satir">
          <div class="maas-avans-info">
            <span>💳 Personel Avansı</span>
            <strong>${formatTL(avans)}</strong>
          </div>
          <label class="maas-toggle-label">
            <input type="checkbox" id="mo-avans-mahsup" checked>
            <span>Avansı mahsup et</span>
          </label>
        </div>` : ''}
        <div class="maas-net-satir">
          <span>Net Ödeme</span>
          <strong id="mo-net-goster">—</strong>
        </div>
        <div class="maas-dagilim-baslik">Ödeme Dağılımı</div>
        <div class="maas-dagilim-grid">
          ${nakitKasa ? `
          <div class="maas-dagilim-item">
            <label class="form-label">💵 ${nakitKasa.ad}</label>
            <input class="form-control" id="mo-nakit" type="number"
              step="0.01" min="0" inputmode="decimal" placeholder="0,00"
              autocomplete="off" value="${sonDagilim.nakit || ''}">
          </div>` : ''}
          ${bankaKasa ? `
          <div class="maas-dagilim-item">
            <label class="form-label">💳 ${bankaKasa.ad}</label>
            <input class="form-control" id="mo-banka" type="number"
              step="0.01" min="0" inputmode="decimal" placeholder="0,00"
              autocomplete="off" value="${sonDagilim.banka || ''}">
          </div>` : ''}
          ${!nakitKasa && !bankaKasa ? `
          <p style="font-size:13px;color:var(--text-secondary);grid-column:1/-1">
            Nakit veya Banka kasası bulunamadı.
          </p>` : ''}
        </div>
        <div id="mo-dogrulama" class="maas-dogrulama" style="display:none"></div>
        <div class="form-group" style="margin-bottom:0;margin-top:12px">
          <label class="form-label">Açıklama <span class="form-label-opt">(isteğe bağlı)</span></label>
          <input class="form-control" id="mo-aciklama" type="text"
            maxlength="200" placeholder="${cari.ad} maaşı..." autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="mo-vazgec">Vazgeç</button>
        <button class="btn btn-primary" id="mo-kaydet" disabled>💰 Maaşı Öde</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  function guncelle() {
    const brut     = parseFloat(overlay.querySelector('#mo-brut')?.value) || 0;
    const avansChk = overlay.querySelector('#mo-avans-mahsup')?.checked ?? true;
    const mahsup   = avansVar && avansChk ? Math.min(avans, brut) : 0;
    const net      = Math.max(0, brut - mahsup);
    const nakit    = parseFloat(overlay.querySelector('#mo-nakit')?.value) || 0;
    const banka    = parseFloat(overlay.querySelector('#mo-banka')?.value) || 0;
    const toplam   = nakit + banka;
    const valid    = brut > 0 && Math.abs(toplam - net) < 0.01;

    const netEl = overlay.querySelector('#mo-net-goster');
    if (netEl) netEl.textContent = brut > 0 ? formatTL(net) : '—';

    const dogEl = overlay.querySelector('#mo-dogrulama');
    if (dogEl) {
      if (brut > 0) {
        dogEl.style.display = '';
        dogEl.className = 'maas-dogrulama ' + (valid ? 'maas-valid' : 'maas-invalid');
        dogEl.textContent = valid
          ? '✓ Dağılım doğru'
          : `Toplam: ${formatTL(toplam)} / Gereken: ${formatTL(net)}`;
      } else {
        dogEl.style.display = 'none';
      }
    }

    const kaydetBtn = overlay.querySelector('#mo-kaydet');
    if (kaydetBtn) kaydetBtn.disabled = !valid;
  }

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#mo-close')?.addEventListener('click', close);
  overlay.querySelector('#mo-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#mo-brut')?.addEventListener('input', guncelle);
  overlay.querySelector('#mo-nakit')?.addEventListener('input', guncelle);
  overlay.querySelector('#mo-banka')?.addEventListener('input', guncelle);
  overlay.querySelector('#mo-avans-mahsup')?.addEventListener('change', guncelle);

  overlay.querySelector('#mo-kaydet')?.addEventListener('click', async () => {
    const tarih      = overlay.querySelector('#mo-tarih')?.value || bugun();
    const brut       = parseFloat(overlay.querySelector('#mo-brut')?.value) || 0;
    const avansChk   = overlay.querySelector('#mo-avans-mahsup')?.checked ?? true;
    const mahsup     = avansVar && avansChk ? Math.min(avans, brut) : 0;
    const nakitTutar = parseFloat(overlay.querySelector('#mo-nakit')?.value) || 0;
    const bankaTutar = parseFloat(overlay.querySelector('#mo-banka')?.value) || 0;
    const aciklama   = overlay.querySelector('#mo-aciklama')?.value.trim() || `${cari.ad} maaşı`;

    const maasKat = getKategoriler().find(k =>
      k.tip === 'gider' &&
      (k.ad.toLowerCase().includes('maaş') || k.ad.toLowerCase().includes('maas') ||
       k.ad.toLowerCase().includes('personel'))
    );

    const islemListesi = [];

    if (nakitTutar > 0.001 && nakitKasa) {
      islemListesi.push({
        tarih, tip: 'gider', tutar: nakitTutar,
        kasaId: nakitKasa.id,
        kategoriId: maasKat?.id || null,
        aciklama,
        cariId: null, cariEtkisi: null,
      });
    }

    if (bankaTutar > 0.001 && bankaKasa) {
      islemListesi.push({
        tarih, tip: 'gider', tutar: bankaTutar,
        kasaId: bankaKasa.id,
        kategoriId: maasKat?.id || null,
        aciklama,
        cariId: null, cariEtkisi: null,
      });
    }

    if (mahsup > 0.001) {
      islemListesi.push({
        tarih, tip: 'gelir', tutar: mahsup,
        kasaId: null,
        kategoriId: null,
        aciklama: `${cari.ad} avans mahsup`,
        cariId: cari.id,
        cariEtkisi: 'tahsilat',
      });
    }

    if (islemListesi.length === 0) return;

    const btn = overlay.querySelector('#mo-kaydet');
    if (btn) btn.disabled = true;

    try {
      for (const islem of islemListesi) await addIslem(islem);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nakit: nakitTutar, banka: bankaTutar }));
      } catch {}

      close();
      showToast(`Maaş ödendi (${islemListesi.length} işlem)`, 'success');
    } catch (err) {
      showToast('Kayıt hatası: ' + (err.message || 'Bilinmeyen hata'), 'error');
      if (btn) btn.disabled = false;
    }
  });

  guncelle();
  setTimeout(() => overlay.querySelector('#mo-brut')?.focus(), 80);
}
