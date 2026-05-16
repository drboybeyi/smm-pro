import { getCariler, getKategoriler, getIslemler, getSabitGiderler, getVadeler, getKasalar } from '../state.js';
import { formatTL, formatTarih, bugun, odendiIsaretle, odendiKontrol, vadeRengiSinifi, buAyOdemeTarihi } from '../utils.js';
import { hesaplaCariBakiye, addIslem, updateSabitGider } from '../db.js';
import { show as showToast } from '../components/toast.js';
import { openMaasOde } from './maasOde.js';
import { openOdemeFormu } from './cariDetay.js';

const AYLAR_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

let _seciliAy = bugun().slice(0, 7); // "2026-05"

// ─── Yardımcılar ──────────────────────────────────────────────

function getMaasKatIds(kategoriler) {
  return new Set(kategoriler
    .filter(k => k.tip === 'gider' &&
      (k.ad.toLowerCase().includes('maaş') || k.ad.toLowerCase().includes('maas') ||
       k.ad.toLowerCase().includes('personel')))
    .map(k => k.id));
}

function maasOdenmiMi(cari, ayStr, islemler, kategoriler) {
  const [yStr, mStr] = ayStr.split('-');
  if (odendiKontrol('personel', cari.id, parseInt(yStr), parseInt(mStr))) return true;
  const katIds = getMaasKatIds(kategoriler);
  return islemler.some(i => {
    if (!i.tarih?.startsWith(ayStr)) return false;
    if (i.cariId === cari.id && i.cariEtkisi === 'tahsilat') return true;
    if (i.tip === 'gider' && katIds.has(i.kategoriId) &&
        i.aciklama?.toLowerCase().includes(cari.ad.toLowerCase())) return true;
    return false;
  });
}

function sabitGiderOdenmiMi(sg, ayStr, islemler) {
  const [yStr, mStr] = ayStr.split('-');
  if (odendiKontrol('sabit', sg.id, parseInt(yStr), parseInt(mStr))) return true;
  return islemler.some(i =>
    i.tarih?.startsWith(ayStr) &&
    i.tip === 'gider' &&
    i.aciklama?.toLowerCase().includes(sg.ad.toLowerCase())
  );
}

function oncekiAy(ayStr) {
  const [y, m] = ayStr.split('-').map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${String(pm).padStart(2, '0')}`;
}

function sonrakiAy(ayStr) {
  const [y, m] = ayStr.split('-').map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

// ─── İçerik HTML ──────────────────────────────────────────────

function renderIcerik(ayStr) {
  const cariler       = getCariler();
  const sabitGiderler = getSabitGiderler();
  const vadeler       = getVadeler();
  const islemler      = getIslemler();
  const kategoriler   = getKategoriler();
  const [y, m]        = ayStr.split('-').map(Number);

  // Maaşlar — tüm personeller (ödenmiş ve ödenmemiş)
  const personeller = cariler.filter(c => c.tip === 'personel' && !c.silindi);
  const maaslarHtml = personeller.length > 0 ? `
    <div class="bay-section-baslik">MAAŞLAR</div>
    ${personeller.map(p => {
      const odendi = maasOdenmiMi(p, ayStr, islemler, kategoriler);
      const avans  = Math.max(0, hesaplaCariBakiye(p.id, islemler));
      const brut   = p.sabitBrutMaas || null;
      const net    = brut !== null ? Math.max(0, brut - avans) : null;
      const sinif  = odendi ? '' : vadeRengiSinifi(buAyOdemeTarihi(p.maasOdemeGunu || 5));
      return `
        <div class="bay-satir${sinif ? ' ' + sinif : ''}${odendi ? ' od-odendi' : ''}">
          <div class="bay-satir-sol">
            <div class="bay-satir-ad">👤 ${p.ad}${odendi ? ' <span class="od-etiket">✓ Ödendi</span>' : ''}</div>
            <div class="bay-satir-detay">${
              brut !== null
                ? `Brüt ${formatTL(brut)}${avans > 0.01 ? ` · Avans ${formatTL(avans)}` : ''}${net !== brut ? ` → Net ${formatTL(net)}` : ''}`
                : 'Brüt maaş belirtilmedi'
            }</div>
          </div>
          <div class="bay-satir-butonlar">
            ${odendi
              ? `<span class="od-odendi-ikon">✓</span>`
              : `<button class="odendi-isaretle-btn" data-type="maas" data-id="${p.id}">✓ Ödendi</button>
                 <button class="btn btn-sm btn-primary bay-ode-btn" data-type="maas" data-id="${p.id}">Öde →</button>`}
          </div>
        </div>`;
    }).join('')}` : '';

  // Sabit Giderler — tümü (ödenmiş ve ödenmemiş)
  const aktifSabitler = sabitGiderler.filter(sg => sg.aktif !== false && !sg.silindi);
  const sabitlerHtml = aktifSabitler.length > 0 ? `
    <div class="bay-section-baslik${personeller.length > 0 ? ' bay-section-separator' : ''}">SABİT GİDERLER</div>
    ${aktifSabitler.map(sg => {
      const odendi = sabitGiderOdenmiMi(sg, ayStr, islemler);
      const sinif  = odendi ? '' : vadeRengiSinifi(buAyOdemeTarihi(sg.odemeGunu));
      return `
        <div class="bay-satir${sinif ? ' ' + sinif : ''}${odendi ? ' od-odendi' : ''}">
          <div class="bay-satir-sol">
            <div class="bay-satir-ad">${sg.emoji || '💸'} ${sg.ad}${sg.odemeGunu ? ` <span class="bay-gun">(${sg.odemeGunu}'i)</span>` : ''}${odendi ? ' <span class="od-etiket">✓ Ödendi</span>' : ''}</div>
            <div class="bay-satir-detay">${sg.varsayilanTutar ? `~${formatTL(sg.varsayilanTutar)}` : 'Tutar belirtilmedi'}</div>
          </div>
          <div class="bay-satir-butonlar">
            ${odendi
              ? `<span class="od-odendi-ikon">✓</span>`
              : `<button class="odendi-isaretle-btn" data-type="sabit" data-id="${sg.id}">✓ Ödendi</button>
                 <button class="btn btn-sm btn-secondary bay-ode-btn" data-type="sabit" data-id="${sg.id}">Öde →</button>`}
          </div>
        </div>`;
    }).join('')}` : '';

  // Cari Vadeler — sadece bu ay bekleyenler
  const ayVadeler = vadeler
    .filter(v => v.vadeTarih?.startsWith(ayStr) && (v.durum === 'bekliyor' || !v.durum))
    .sort((a, b) => (a.vadeTarih || '').localeCompare(b.vadeTarih || ''));

  const hepsiBos = personeller.length + aktifSabitler.length;

  const vadelerHtml = ayVadeler.length > 0 ? `
    <div class="bay-section-baslik${hepsiBos > 0 ? ' bay-section-separator' : ''}">CARİ VADELERİ</div>
    ${ayVadeler.map(v => {
      const cari  = cariler.find(c => c.id === v.cariId);
      if (!cari) return '';
      const sinif = vadeRengiSinifi(v.vadeTarih);
      return `
        <div class="bay-satir${sinif ? ' ' + sinif : ''}">
          <div class="bay-satir-sol">
            <div class="bay-satir-ad">👤 ${cari.ad}</div>
            <div class="bay-satir-detay">${formatTarih(v.vadeTarih)} · ${formatTL(v.tutar)}</div>
          </div>
          <div class="bay-satir-butonlar">
            <button class="btn btn-sm btn-primary bay-ode-btn" data-type="vade" data-vade-id="${v.id}" data-cari-id="${v.cariId}">Öde →</button>
          </div>
        </div>`;
    }).filter(Boolean).join('')}` : '';

  // Toplam (sadece ödenmemişler)
  let toplam = 0;
  personeller.forEach(p => {
    if (!maasOdenmiMi(p, ayStr, islemler, kategoriler)) {
      const brut  = p.sabitBrutMaas || 0;
      const avans = Math.max(0, hesaplaCariBakiye(p.id, islemler));
      toplam += brut ? Math.max(0, brut - avans) : 0;
    }
  });
  aktifSabitler.forEach(sg => {
    if (!sabitGiderOdenmiMi(sg, ayStr, islemler)) toplam += sg.varsayilanTutar || 0;
  });
  ayVadeler.forEach(v => { toplam += v.tutar || 0; });

  const hicYok = personeller.length === 0 && aktifSabitler.length === 0 && ayVadeler.length === 0;

  if (hicYok) return `<p style="text-align:center;padding:24px 0;font-size:14px;color:var(--text-secondary)">Bu ay için ödeme yok ✓</p>`;

  return `
    ${maaslarHtml}${sabitlerHtml}${vadelerHtml}
    ${toplam > 0.01 ? `
      <div class="bay-toplam">
        <span>Toplam Bekleyen (${AYLAR_TR[m - 1]} ${y})</span>
        <strong>${formatTL(toplam)}</strong>
      </div>` : ''}`;
}

// ─── Rebuild ──────────────────────────────────────────────────

function rebuildIcerik() {
  const el = document.getElementById('od-icerik');
  if (!el) return;
  el.innerHTML = renderIcerik(_seciliAy);
  bindIcerikEvents();
}

// ─── Event Handlers ───────────────────────────────────────────

function bindIcerikEvents() {
  const cariler       = getCariler();
  const sabitGiderler = getSabitGiderler();
  const vadeler       = getVadeler();

  // ✓ Ödendi işaret butonu
  document.querySelectorAll('#od-icerik .odendi-isaretle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const id   = btn.dataset.id;
      const [yStr, mStr] = _seciliAy.split('-');
      const yil  = parseInt(yStr);
      const ay   = parseInt(mStr);
      const ad   = type === 'maas'
        ? (cariler.find(c => c.id === id)?.ad || 'Bu kayıt')
        : (sabitGiderler.find(s => s.id === id)?.ad || 'Bu kayıt');
      if (!confirm(`"${ad}" bu ay için ödendi olarak işaretlensin mi?`)) return;
      odendiIsaretle(type === 'maas' ? 'personel' : 'sabit', id, yil, ay);
      rebuildIcerik();
      showToast(`${ad} ödendi olarak işaretlendi`, 'success');
    });
  });

  // Öde → butonu
  document.querySelectorAll('#od-icerik .bay-ode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      if (type === 'maas') {
        const cari = cariler.find(c => c.id === btn.dataset.id);
        if (cari) openMaasOde(cari);
      } else if (type === 'sabit') {
        const sg = sabitGiderler.find(s => s.id === btn.dataset.id);
        if (sg) openSabitGiderOdeFormu(sg);
      } else if (type === 'vade') {
        const vade = vadeler.find(v => v.id === btn.dataset.vadeId);
        const cari = cariler.find(c => c.id === btn.dataset.cariId);
        if (vade && cari) openOdemeFormu(cari, vade);
      }
    });
  });
}

// ─── Sabit Gider Ödeme Formu (local) ─────────────────────────

function openSabitGiderOdeFormu(sg) {
  if (document.getElementById('sgo-overlay')) return;

  const kasalar      = getKasalar();
  const today        = bugun();
  const [y, m]       = today.split('-').map(Number);
  const autoAciklama = `${AYLAR_TR[m - 1]} ${y} - ${sg.ad}`;

  const kasaOpts = kasalar.map(k =>
    `<option value="${k.id}" ${sg.varsayilanKasaId === k.id ? 'selected' : ''}>${k.emoji} ${k.ad}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id = 'sgo-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '225';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">${sg.emoji || '💸'} ${sg.ad} — Öde</span>
        <button class="modal-close" id="sgo-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Tarih</label>
          <input class="form-control" id="sgo-tarih" type="date" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">Tutar <span class="req">*</span></label>
          <input class="form-control" id="sgo-tutar" type="number"
            step="0.01" min="0.01" inputmode="decimal" placeholder="0,00"
            autocomplete="off" value="${sg.varsayilanTutar || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Kasa <span class="req">*</span></label>
          <select class="form-control" id="sgo-kasa">
            <option value="">Kasa seçin...</option>
            ${kasaOpts}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Açıklama</label>
          <input class="form-control" id="sgo-aciklama" type="text"
            maxlength="200" value="${autoAciklama}" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="sgo-vazgec">Vazgeç</button>
        <button class="btn btn-primary" id="sgo-kaydet">💸 Öde</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#sgo-close')?.addEventListener('click', close);
  overlay.querySelector('#sgo-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#sgo-kaydet')?.addEventListener('click', async () => {
    const tarih    = overlay.querySelector('#sgo-tarih').value;
    const tutarStr = overlay.querySelector('#sgo-tutar').value;
    const kasaId   = overlay.querySelector('#sgo-kasa').value;
    const aciklama = overlay.querySelector('#sgo-aciklama').value.trim();
    const tutar    = parseFloat(tutarStr);

    overlay.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
    let valid = true;
    if (!tutarStr || isNaN(tutar) || tutar < 0.01) { overlay.querySelector('#sgo-tutar').classList.add('error'); valid = false; }
    if (!kasaId)                                    { overlay.querySelector('#sgo-kasa').classList.add('error');  valid = false; }
    if (!valid) return;

    const btn = overlay.querySelector('#sgo-kaydet');
    btn.disabled = true;
    try {
      await addIslem({ tarih, tip: 'gider', tutar, kasaId, kategoriId: sg.kategoriId || null, aciklama, cariId: null, cariEtkisi: null });
      await updateSabitGider(sg.id, { varsayilanTutar: tutar, varsayilanKasaId: kasaId });
      close();
      showToast(`${sg.ad} ödendi`, 'success');
    } catch (err) {
      showToast('Kayıt hatası: ' + (err.message || 'Hata'), 'error');
      btn.disabled = false;
    }
  });

  setTimeout(() => overlay.querySelector('#sgo-tutar')?.focus(), 80);
}

// ─── View Export ──────────────────────────────────────────────

export default {
  render() {
    const [y, m] = _seciliAy.split('-').map(Number);
    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">💰 ÖDEMELER</span>
      </div>

      <div class="month-selector" style="margin-bottom:4px">
        <button id="odAyGeri">&#8249;</button>
        <button class="month-display-btn" id="odAyBaslik">${AYLAR_TR[m - 1]} ${y}</button>
        <button id="odAySonraki">&#8250;</button>
      </div>

      <div class="card mb-3 bay-kart" style="padding:12px 16px" id="od-icerik">
        ${renderIcerik(_seciliAy)}
      </div>`;
  },

  afterRender() {
    document.getElementById('odAyGeri')?.addEventListener('click', () => {
      _seciliAy = oncekiAy(_seciliAy);
      const [y, m] = _seciliAy.split('-').map(Number);
      const baslik = document.getElementById('odAyBaslik');
      if (baslik) baslik.textContent = `${AYLAR_TR[m - 1]} ${y}`;
      rebuildIcerik();
    });

    document.getElementById('odAySonraki')?.addEventListener('click', () => {
      _seciliAy = sonrakiAy(_seciliAy);
      const [y, m] = _seciliAy.split('-').map(Number);
      const baslik = document.getElementById('odAyBaslik');
      if (baslik) baslik.textContent = `${AYLAR_TR[m - 1]} ${y}`;
      rebuildIcerik();
    });

    bindIcerikEvents();
  }
};
