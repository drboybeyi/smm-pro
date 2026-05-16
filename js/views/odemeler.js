import { getCariler, getSabitGiderler, getVadeler, getIslemler, getKategoriler, getKasalar } from '../state.js';
import { bugun, formatTL, formatTarih, odendiIsaretle, odendiKontrol, vadeRengiSinifi, hesaplaCariBakiye } from '../utils.js';
import { addIslem, updateSabitGider } from '../db.js';
import { show as showToast } from '../components/toast.js';
import { openMaasOde } from './maasOde.js';
import { openOdemeFormu } from './cariDetay.js';

const AYLAR_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

// ─── Ay State ───────────────────────────────────────────────────

if (!window._odemelerAy) {
  const t = bugun();
  window._odemelerAy = t.slice(0, 7);
}

function seciliAy()       { return window._odemelerAy; }
function ayBasligiFmt(ay) {
  const [y, m] = ay.split('-').map(Number);
  return `${AYLAR_TR[m - 1]} ${y}`;
}
function oncekiAy(ay) {
  const [y, m] = ay.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
function sonrakiAy(ay) {
  const [y, m] = ay.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

// ─── Ödendi kontrolleri ─────────────────────────────────────────

function getMaasKatIds(kategoriler) {
  return new Set(
    kategoriler
      .filter(k => k.tip === 'gider' &&
        (k.ad.toLowerCase().includes('maaş') || k.ad.toLowerCase().includes('maas') ||
         k.ad.toLowerCase().includes('personel')))
      .map(k => k.id)
  );
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

// Seçili aya göre ödeme tarihi ("YYYY-MM-DD")
function ayinOdemeTarihi(odemeGunu, ayStr) {
  if (!odemeGunu || odemeGunu < 1 || odemeGunu > 31) return null;
  const [y, m] = ayStr.split('-').map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const gun    = Math.min(odemeGunu, maxDay);
  return `${ayStr}-${String(gun).padStart(2, '0')}`;
}

// ─── İçerik render ─────────────────────────────────────────────

function renderIcerik() {
  const ayStr       = seciliAy();
  const islemler    = getIslemler();
  const kategoriler = getKategoriler();
  const cariler     = getCariler();
  const sabitGiderler = getSabitGiderler();
  const vadeler     = getVadeler();
  const [yil, ayNum] = ayStr.split('-').map(Number);

  // Maaşlar — personel + sabitBrutMaas
  const maaslar = cariler
    .filter(c => c.tip === 'personel' && !c.silindi && c.sabitBrutMaas)
    .map(c => {
      const odendi     = maasOdenmiMi(c, ayStr, islemler, kategoriler);
      const avans      = Math.max(0, hesaplaCariBakiye(c.id, islemler));
      const brut       = c.sabitBrutMaas || 0;
      const net        = Math.max(0, brut - avans);
      const odemeTarih = ayinOdemeTarihi(c.maasOdemeGunu || 5, ayStr);
      const renkSinif  = odendi ? '' : vadeRengiSinifi(odemeTarih);
      const detay      = `Brüt ${formatTL(brut)}${avans > 0.01 ? ` · Avans ${formatTL(avans)}` : ''}${net !== brut ? ` → Net ${formatTL(net)}` : ''}`;
      return { c, odendi, net, renkSinif, detay };
    });

  // Sabit Giderler
  const sabitler = sabitGiderler
    .filter(sg => sg.aktif !== false && !sg.silindi)
    .map(sg => {
      const odendi     = sabitGiderOdenmiMi(sg, ayStr, islemler);
      const odemeTarih = ayinOdemeTarihi(sg.odemeGunu, ayStr);
      const renkSinif  = odendi ? '' : vadeRengiSinifi(odemeTarih);
      return { sg, odendi, renkSinif };
    });

  // Cari Vadeleri — seçili ay içinde, sadece bekleyenler
  const ayBaslangic = `${ayStr}-01`;
  const ayBitis     = `${ayStr}-${String(new Date(yil, ayNum, 0).getDate()).padStart(2, '0')}`;
  const ayVadeleri  = vadeler
    .filter(v => v.vadeTarih >= ayBaslangic && v.vadeTarih <= ayBitis && v.durum === 'bekliyor')
    .sort((a, b) => a.vadeTarih.localeCompare(b.vadeTarih))
    .map(v => ({ vade: v, cari: cariler.find(c => c.id === v.cariId) }));

  const hicItem = maaslar.length === 0 && sabitler.length === 0 && ayVadeleri.length === 0;

  // Aktif toplam
  let aktifToplam = 0;
  maaslar.forEach(({ odendi, net })   => { if (!odendi && net)                    aktifToplam += net; });
  sabitler.forEach(({ odendi, sg })   => { if (!odendi && sg.varsayilanTutar)     aktifToplam += sg.varsayilanTutar; });
  ayVadeleri.forEach(({ vade })       => { if (vade.tutar)                        aktifToplam += vade.tutar; });

  if (hicItem) {
    return `
      <div class="odm-bos">
        <div class="odm-bos-ikon">✓</div>
        <div class="odm-bos-metin">Bu ay için ödeme yok</div>
      </div>`;
  }

  let html = '';

  if (maaslar.length > 0) {
    html += `<div class="odm-bolum-baslik">MAAŞLAR</div>`;
    html += maaslar.map(({ c, odendi, renkSinif, detay }) => `
      <div class="odm-satir${odendi ? ' odm-odendi' : ''}${renkSinif ? ' ' + renkSinif : ''}">
        <div class="odm-satir-sol">
          <div class="odm-satir-ad">👤 ${c.ad}${c.maasOdemeGunu ? ` <span class="odm-gun">(${c.maasOdemeGunu}'i)</span>` : ''}</div>
          <div class="odm-satir-detay">${detay}</div>
        </div>
        <div class="odm-satir-butonlar">
          ${odendi
            ? `<span class="odm-odendi-etiketi">✓ Ödendi</span>`
            : `<button class="odm-isaretle-btn" data-type="maas" data-id="${c.id}">✓ Ödendi</button>
               <button class="odm-ode-btn btn btn-sm btn-primary" data-type="maas" data-id="${c.id}">Öde →</button>`
          }
        </div>
      </div>`).join('');
  }

  if (sabitler.length > 0) {
    html += `<div class="odm-bolum-baslik${maaslar.length > 0 ? ' odm-bolum-separator' : ''}">SABİT GİDERLER</div>`;
    html += sabitler.map(({ sg, odendi, renkSinif }) => `
      <div class="odm-satir${odendi ? ' odm-odendi' : ''}${renkSinif ? ' ' + renkSinif : ''}">
        <div class="odm-satir-sol">
          <div class="odm-satir-ad">${sg.emoji || '💸'} ${sg.ad}${sg.odemeGunu ? ` <span class="odm-gun">(${sg.odemeGunu}'i)</span>` : ''}</div>
          <div class="odm-satir-detay">${sg.varsayilanTutar ? `~${formatTL(sg.varsayilanTutar)}` : 'Tutar belirtilmedi'}</div>
        </div>
        <div class="odm-satir-butonlar">
          ${odendi
            ? `<span class="odm-odendi-etiketi">✓ Ödendi</span>`
            : `<button class="odm-isaretle-btn" data-type="sabit" data-id="${sg.id}">✓ Ödendi</button>
               <button class="odm-ode-btn btn btn-sm btn-secondary" data-type="sabit" data-id="${sg.id}">Öde →</button>`
          }
        </div>
      </div>`).join('');
  }

  if (ayVadeleri.length > 0) {
    html += `<div class="odm-bolum-baslik${(maaslar.length > 0 || sabitler.length > 0) ? ' odm-bolum-separator' : ''}">CARİ VADELERİ</div>`;
    html += ayVadeleri.map(({ vade, cari }) => `
      <div class="odm-satir">
        <div class="odm-satir-sol">
          <div class="odm-satir-ad">💊 ${cari ? cari.ad : '?'} — ${formatTarih(vade.vadeTarih)}</div>
          ${vade.tutar ? `<div class="odm-satir-detay">${formatTL(vade.tutar)}</div>` : ''}
        </div>
        <div class="odm-satir-butonlar">
          <button class="odm-ode-btn btn btn-sm btn-primary" data-type="vade" data-id="${vade.id}">Öde →</button>
        </div>
      </div>`).join('');
  }

  if (aktifToplam > 0.01) {
    html += `
      <div class="odm-toplam">
        <span>Toplam Tahmini (${ayBasligiFmt(ayStr)})</span>
        <strong>${formatTL(aktifToplam)}</strong>
      </div>`;
  }

  return html;
}

// ─── Event binding ──────────────────────────────────────────────

function _bindIcerik() {
  const ay     = seciliAy();
  const [yStr, mStr] = ay.split('-');
  const yil    = parseInt(yStr);
  const ayNo   = parseInt(mStr);
  const cariler       = getCariler();
  const sabitGiderler = getSabitGiderler();
  const vadeler       = getVadeler();

  document.querySelectorAll('.odm-isaretle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type  = btn.dataset.type;
      const id    = btn.dataset.id;
      const adObj = type === 'maas'
        ? cariler.find(c => c.id === id)
        : sabitGiderler.find(s => s.id === id);
      const ad = adObj?.ad || 'Bu kayıt';
      if (!confirm(`"${ad}" ${ayBasligiFmt(ay)} ayı için ödendi olarak işaretlensin mi?`)) return;
      odendiIsaretle(type === 'maas' ? 'personel' : 'sabit', id, yil, ayNo);
      _refreshIcerik();
      showToast(`${ad} ödendi olarak işaretlendi`, 'success');
    });
  });

  document.querySelectorAll('.odm-ode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const id   = btn.dataset.id;
      if (type === 'maas') {
        const cari = cariler.find(c => c.id === id);
        if (cari) openMaasOde(cari);
      } else if (type === 'sabit') {
        const sg = sabitGiderler.find(s => s.id === id);
        if (sg) _openSabitGiderOde(sg, ay);
      } else if (type === 'vade') {
        const vade = vadeler.find(v => v.id === id);
        const cari = vade ? cariler.find(c => c.id === vade.cariId) : null;
        if (vade && cari) openOdemeFormu(cari, vade);
      }
    });
  });
}

function _refreshIcerik() {
  const ayMetin = document.getElementById('odm-ay-metin');
  if (ayMetin) ayMetin.textContent = ayBasligiFmt(seciliAy());
  const icerik = document.getElementById('odm-icerik');
  if (icerik) {
    icerik.innerHTML = renderIcerik();
    _bindIcerik();
  }
}

// ─── Sabit Gider Öde Formu ──────────────────────────────────────

function _openSabitGiderOde(sg, ayStr) {
  if (document.getElementById('odm-sgo-overlay')) return;

  const kasalar  = getKasalar();
  const [y, m]   = ayStr.split('-').map(Number);
  const autoAcik = `${AYLAR_TR[m - 1]} ${y} - ${sg.ad}`;
  const kasaOpts = kasalar.map(k =>
    `<option value="${k.id}" ${sg.varsayilanKasaId === k.id ? 'selected' : ''}>${k.emoji} ${k.ad}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id    = 'odm-sgo-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '225';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">${sg.emoji || '💸'} ${sg.ad} — Öde</span>
        <button class="modal-close" id="odm-sgo-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Tarih</label>
          <input class="form-control" id="odm-sgo-tarih" type="date" value="${bugun()}">
        </div>
        <div class="form-group">
          <label class="form-label">Tutar <span class="req">*</span></label>
          <input class="form-control" id="odm-sgo-tutar" type="number"
            step="0.01" min="0.01" inputmode="decimal" placeholder="0,00"
            autocomplete="off" value="${sg.varsayilanTutar || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Kasa <span class="req">*</span></label>
          <select class="form-control" id="odm-sgo-kasa">
            <option value="">Kasa seçin...</option>
            ${kasaOpts}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Açıklama</label>
          <input class="form-control" id="odm-sgo-aciklama" type="text"
            maxlength="200" value="${autoAcik}" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="odm-sgo-vazgec">Vazgeç</button>
        <button class="btn btn-primary"   id="odm-sgo-kaydet">💸 Öde</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => { overlay.classList.add('modal-closing'); setTimeout(() => overlay.remove(), 220); };
  overlay.querySelector('#odm-sgo-close')?.addEventListener('click', close);
  overlay.querySelector('#odm-sgo-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#odm-sgo-kaydet')?.addEventListener('click', async () => {
    const tarih    = overlay.querySelector('#odm-sgo-tarih').value;
    const tutarStr = overlay.querySelector('#odm-sgo-tutar').value;
    const kasaId   = overlay.querySelector('#odm-sgo-kasa').value;
    const aciklama = overlay.querySelector('#odm-sgo-aciklama').value.trim();
    const tutar    = parseFloat(tutarStr);

    overlay.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
    let valid = true;
    if (!tutarStr || isNaN(tutar) || tutar < 0.01) { overlay.querySelector('#odm-sgo-tutar').classList.add('error'); valid = false; }
    if (!kasaId)                                    { overlay.querySelector('#odm-sgo-kasa').classList.add('error');  valid = false; }
    if (!valid) return;

    const btn = overlay.querySelector('#odm-sgo-kaydet');
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

  setTimeout(() => overlay.querySelector('#odm-sgo-tutar')?.focus(), 80);
}

// ─── View export ────────────────────────────────────────────────

const OdemelerView = {
  render() {
    return `
      <div class="odemeler-view">
        <div class="odm-header">
          <h2 class="odm-baslik">💰 Ödemeler</h2>
          <div class="odm-ay-secici">
            <button class="odm-ay-btn" id="odm-onceki">◀</button>
            <span class="odm-ay-metin" id="odm-ay-metin">${ayBasligiFmt(seciliAy())}</span>
            <button class="odm-ay-btn" id="odm-sonraki">▶</button>
          </div>
        </div>
        <div class="card mb-3 odm-kart" id="odm-icerik">
          ${renderIcerik()}
        </div>
      </div>`;
  },

  afterRender() {
    document.getElementById('odm-onceki')?.addEventListener('click', () => {
      window._odemelerAy = oncekiAy(seciliAy());
      _refreshIcerik();
    });
    document.getElementById('odm-sonraki')?.addEventListener('click', () => {
      window._odemelerAy = sonrakiAy(seciliAy());
      _refreshIcerik();
    });
    _bindIcerik();
  }
};

export default OdemelerView;
