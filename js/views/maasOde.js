import { getKasalar, getKategoriler, getIslemler, subscribe } from '../state.js';
import { bugun, formatTL, kasaTipiBul } from '../utils.js';
import { maasOzeti, kurus } from '../maas.js';
import { addMaasOdeme } from '../db.js';
import { show as showToast } from '../components/toast.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function openMaasOde(cari, donem = bugun().slice(0, 7)) {
  if (document.getElementById('maas-ode-overlay')) return;
  const kasalar = getKasalar();
  const today = bugun();
  const initial = maasOzeti(cari, getIslemler(), donem, today);
  const tercih = kasaTipiBul(kasalar, 'banka', 'bankalar', 'bank') || kasalar[0];
  const overlay = document.createElement('div');
  overlay.id = 'maas-ode-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '225';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:460px">
      <div class="modal-header">
        <span class="modal-title">Maaş Öde — ${esc(cari.ad)}</span>
        <button class="modal-close" id="mo-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label" for="mo-donem">Maaş ayı</label>
          <input class="form-control" id="mo-donem" type="month" value="${esc(donem)}"></div>
        <div class="form-group"><label class="form-label" for="mo-tarih">Ödeme tarihi</label>
          <input class="form-control" id="mo-tarih" type="date" value="${today}"></div>
        <div class="form-group"><label class="form-label" for="mo-maas">Aylık net maaş</label>
          <input class="form-control" id="mo-maas" type="number" min="0.01" step="0.01" inputmode="decimal" value="${initial.aylik || ''}"></div>
        <details class="form-group" ${initial.eski ? 'open' : ''}>
          <summary>Eski kayıtlardaki maaş ödemesi</summary>
          <p style="font-size:12px;color:var(--text-secondary)">Bu maaş ayı için eski ekrandan ödediğiniz maaş ve önceden mahsup ettiğiniz avans toplamını bir kez belirtin. Henüz mahsup edilmemiş avansı buraya eklemeyin. Yeni ödemeler otomatik izlenir; bu alan kasadan tekrar para düşmez.</p>
          <label class="form-label" for="mo-eski">Önceden karşılanan tutar</label>
          <input class="form-control" id="mo-eski" type="number" min="0" step="0.01" value="${initial.eski}">
        </details>
        <div id="mo-ozet" aria-live="polite"></div>
        <label class="maas-toggle-label" style="margin:12px 0">
          <input type="checkbox" id="mo-mahsup" checked> Mevcut avansı bu maaştan düş
        </label>
        <div class="maas-dagilim-baslik">Şimdi ödenecek tutar</div>
        <p style="font-size:12px;color:var(--text-secondary)">Kalanın tamamını veya bir kısmını ödeyebilirsiniz.</p>
        ${kasalar.map(k => `<div class="form-group">
          <label class="form-label" for="mo-kasa-${esc(k.id)}">${esc(k.emoji)} ${esc(k.ad)}</label>
          <div style="display:flex;gap:8px">
            <input class="form-control mo-tutar" id="mo-kasa-${esc(k.id)}" data-kasa="${esc(k.id)}" type="number" min="0" step="0.01" inputmode="decimal" value="0">
            <button type="button" class="btn btn-secondary mo-kalan" data-kasa="${esc(k.id)}">Kalanı ekle</button>
          </div></div>`).join('')}
        ${!kasalar.length ? '<p>Ödeme için önce kasa ekleyin. Avans maaşı karşılıyorsa yalnızca mahsup yapabilirsiniz.</p>' : ''}
        <div id="mo-dogrulama" class="maas-dogrulama" aria-live="polite"></div>
        <div class="form-group" style="margin-top:12px"><label class="form-label" for="mo-aciklama">Açıklama</label>
          <input class="form-control" id="mo-aciklama" maxlength="200" placeholder="İsteğe bağlı"></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="mo-vazgec">Vazgeç</button>
        <button class="btn btn-primary" id="mo-kaydet">Ödemeyi Kaydet</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const el = id => overlay.querySelector('#' + id);
  const inputs = [...overlay.querySelectorAll('.mo-tutar')];
  const num = id => Number(el(id).value);
  let saving = false;
  const ids = Array.from({ length: kasalar.length + 1 }, () => crypto.randomUUID());
  function hesap() {
    const ozet = maasOzeti(cari, getIslemler(), el('mo-donem').value, el('mo-tarih').value, num('mo-maas'), num('mo-eski'));
    const mahsup = el('mo-mahsup').checked ? ozet.mahsup : 0;
    const toplam = inputs.reduce((s, i) => s + kurus(i.value), 0);
    const gereken = kurus(ozet.kalan) - kurus(mahsup);
    const values = [num('mo-maas'), num('mo-eski'), ...inputs.map(i => Number(i.value))];
    const valid = values.every(v => Number.isFinite(v) && v >= 0 && Number.isSafeInteger(kurus(v))) &&
      num('mo-maas') > 0 && kurus(ozet.eski) + kurus(ozet.odenen) <= kurus(ozet.aylik) &&
      toplam <= gereken && toplam + kurus(mahsup) > 0 &&
      ['mo-donem','mo-tarih','mo-maas','mo-eski'].every(id => el(id).value && el(id).checkValidity()) &&
      inputs.every(i => i.checkValidity());
    return { ozet, mahsup, toplam, gereken, valid };
  }
  function guncelle() {
    const { ozet, mahsup, toplam, gereken, valid } = hesap();
    el('mo-ozet').innerHTML = `
      <div class="maas-net-satir"><span>Bu ay karşılanan maaş</span><strong>${formatTL(ozet.odenen + ozet.eski)}</strong></div>
      <div class="maas-net-satir"><span>Mevcut avans bakiyesi</span><strong>${formatTL(ozet.avans)}</strong></div>
      <div class="maas-net-satir"><span>Bu ödemede avans mahsubu</span><strong>${formatTL(mahsup)}</strong></div>
      <div class="maas-net-satir"><span>Ödenecek kalan maaş</span><strong>${formatTL(gereken / 100)}</strong></div>`;
    el('mo-dogrulama').className = 'maas-dogrulama ' + (valid ? 'maas-valid' : 'maas-invalid');
    el('mo-dogrulama').textContent = valid
      ? `Şimdi ödeme: ${formatTL(toplam / 100)} · Sonrasında kalan: ${formatTL((gereken - toplam) / 100)}`
      : ozet.kalan === 0 && ozet.aylik > 0 && ozet.eski + ozet.odenen === ozet.aylik
        ? 'Bu ayın maaşı tamamlandı.' : 'Tarih ve tutarları kontrol edin. Ödeme kalan maaşı aşamaz.';
    el('mo-kaydet').disabled = saving || !valid;
    el('mo-kaydet').textContent = saving ? 'Kaydediliyor…' : toplam === 0 && mahsup > 0 ? 'Avansı Mahsup Et' : 'Ödemeyi Kaydet';
  }
  function doldur() {
    const { gereken } = hesap();
    inputs.forEach(i => { i.value = i.dataset.kasa === tercih?.id ? (gereken / 100).toFixed(2) : '0'; });
    guncelle();
  }
  const unsub = subscribe('islemler', () => { if (!saving) guncelle(); });
  function close() {
    if (saving) return;
    unsub();
    overlay.remove();
  }
  el('mo-close').onclick = close;
  el('mo-vazgec').onclick = close;
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  inputs.forEach(i => i.addEventListener('input', guncelle));
  ['mo-maas','mo-eski','mo-tarih'].forEach(id => el(id).addEventListener('input', doldur));
  el('mo-mahsup').addEventListener('change', doldur);
  el('mo-donem').addEventListener('change', () => {
    const o = maasOzeti(cari, getIslemler(), el('mo-donem').value, el('mo-tarih').value);
    el('mo-maas').value = o.aylik || '';
    el('mo-eski').value = o.eski;
    doldur();
  });
  overlay.querySelectorAll('.mo-kalan').forEach(b => b.onclick = () => {
    const { gereken } = hesap();
    const other = inputs.filter(i => i.dataset.kasa !== b.dataset.kasa).reduce((s, i) => s + kurus(i.value), 0);
    inputs.find(i => i.dataset.kasa === b.dataset.kasa).value = (Math.max(0, gereken - other) / 100).toFixed(2);
    guncelle();
  });
  el('mo-kaydet').onclick = async () => {
    if (saving) return;
    const { ozet, mahsup, valid } = hesap();
    if (!valid) { guncelle(); return; }
    const kat = getKategoriler().find(k => k.tip === 'gider' && /maaş|maas|personel/i.test(k.ad));
    const request = { cari: { id: cari.id, ad: cari.ad }, donem: el('mo-donem').value,
      tarih: el('mo-tarih').value, maas: num('mo-maas'), eskiOdeme: num('mo-eski'), mahsup,
      dagilim: inputs.map(i => ({ kasaId: i.dataset.kasa, tutar: Number(i.value) })),
      beklenen: ozet, kategoriId: kat?.id || null, aciklama: el('mo-aciklama').value.trim(), timestamp: Date.now() };
    saving = true;
    overlay.querySelectorAll('input,button').forEach(i => { i.disabled = true; });
    guncelle();
    try {
      await addMaasOdeme(request, ids);
      saving = false;
      close();
      showToast('Maaş ödemesi ve avans mahsubu kaydedildi', 'success');
    } catch (err) {
      saving = false;
      overlay.querySelectorAll('input,button').forEach(i => { i.disabled = false; });
      guncelle();
      showToast('Kayıt hatası: ' + (err.message || 'Bilinmeyen hata'), 'error');
    }
  };
  doldur();
}
