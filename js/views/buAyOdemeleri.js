import { getKasalar, getKategoriler, getIslemler, getCariler, getSabitGiderler } from '../state.js';
import { hesaplaCariBakiye, formatTL, bugun, odendiIsaretle, odendiKontrol } from '../utils.js';
import { addIslem, updateSabitGider } from '../db.js';
import { show as showToast } from '../components/toast.js';
import { openMaasOde } from './maasOde.js';

const AYLAR_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                  'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

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

export function renderBuAyOdemeKarti(cariler, sabitGiderler, islemler, kategoriler) {
  const today = bugun();
  const ayStr = today.slice(0, 7);

  const bekleyenMaaslar = cariler
    .filter(c => c.tip === 'personel' && !c.silindi)
    .filter(c => !maasOdenmiMi(c, ayStr, islemler, kategoriler))
    .map(c => {
      const avans = Math.max(0, hesaplaCariBakiye(c.id, islemler));
      const brut  = c.sabitBrutMaas || null;
      const net   = brut !== null ? Math.max(0, brut - avans) : null;
      return { ...c, avans, brut, net };
    });

  const bekleyenSabitler = sabitGiderler
    .filter(sg => sg.aktif !== false && !sg.silindi)
    .filter(sg => !sabitGiderOdenmiMi(sg, ayStr, islemler));

  if (bekleyenMaaslar.length === 0 && bekleyenSabitler.length === 0) {
    return '<div id="bay-karti-wrap"></div>';
  }

  let toplam = 0;
  bekleyenMaaslar.forEach(p => { if (p.net !== null) toplam += p.net; });
  bekleyenSabitler.forEach(sg => { toplam += sg.varsayilanTutar || 0; });

  const [y, m] = today.split('-').map(Number);
  const ayBaslik = `${AYLAR_TR[m - 1]} ${y}`;

  const maaslarHtml = bekleyenMaaslar.length > 0 ? `
    <div class="bay-section-baslik">MAAŞLAR</div>
    ${bekleyenMaaslar.map(p => `
      <div class="bay-satir">
        <div class="bay-satir-sol">
          <div class="bay-satir-ad">👤 ${p.ad}</div>
          <div class="bay-satir-detay">${
            p.brut !== null
              ? `Brüt ${formatTL(p.brut)}${p.avans > 0.01 ? ` · Avans ${formatTL(p.avans)}` : ''}${p.net !== p.brut ? ` → Net ${formatTL(p.net)}` : ''}`
              : 'Brüt maaş belirtilmedi'
          }</div>
        </div>
        <div class="bay-satir-butonlar">
          <button class="odendi-isaretle-btn" data-type="maas" data-id="${p.id}">✓ Ödendi</button>
          <button class="btn btn-sm btn-primary bay-ode-btn"
            data-type="maas" data-id="${p.id}">Öde →</button>
        </div>
      </div>`).join('')}
  ` : '';

  const sabitlerHtml = bekleyenSabitler.length > 0 ? `
    <div class="bay-section-baslik${bekleyenMaaslar.length > 0 ? ' bay-section-separator' : ''}">SABİT GİDERLER</div>
    ${bekleyenSabitler.map(sg => `
      <div class="bay-satir">
        <div class="bay-satir-sol">
          <div class="bay-satir-ad">${sg.emoji || '💸'} ${sg.ad}${sg.odemeGunu ? ` <span class="bay-gun">(${sg.odemeGunu}'i)</span>` : ''}</div>
          <div class="bay-satir-detay">${sg.varsayilanTutar ? `~${formatTL(sg.varsayilanTutar)}` : 'Tutar belirtilmedi'}</div>
        </div>
        <div class="bay-satir-butonlar">
          <button class="odendi-isaretle-btn" data-type="sabit" data-id="${sg.id}">✓ Ödendi</button>
          <button class="btn btn-sm btn-secondary bay-ode-btn"
            data-type="sabit" data-id="${sg.id}">Öde →</button>
        </div>
      </div>`).join('')}
  ` : '';

  const toplamHtml = toplam > 0.01 ? `
    <div class="bay-toplam">
      <span>Toplam Tahmini (${ayBaslik})</span>
      <strong>${formatTL(toplam)}</strong>
    </div>` : '';

  return `
    <div id="bay-karti-wrap">
      <div class="section-header">
        <span class="section-title">📅 BU AY ÖDEMELERİM</span>
      </div>
      <div class="card mb-3 bay-kart" style="padding:12px 16px">
        ${maaslarHtml}${sabitlerHtml}${toplamHtml}
      </div>
    </div>`;
}

function rebuildBuAyKarti() {
  const wrap = document.getElementById('bay-karti-wrap');
  if (!wrap) return;
  const cariler       = getCariler();
  const sabitGiderler = getSabitGiderler();
  const islemler      = getIslemler();
  const kategoriler   = getKategoriler();
  const temp = document.createElement('div');
  temp.innerHTML = renderBuAyOdemeKarti(cariler, sabitGiderler, islemler, kategoriler);
  const newWrap = temp.querySelector('#bay-karti-wrap');
  if (newWrap) {
    wrap.replaceWith(newWrap);
    afterBuAyOdemeKarti(cariler, sabitGiderler);
  }
}

export function afterBuAyOdemeKarti(cariler, sabitGiderler) {
  document.querySelectorAll('.bay-ode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const id   = btn.dataset.id;
      if (type === 'maas') {
        const cari = cariler.find(c => c.id === id);
        if (cari) openMaasOde(cari);
      } else if (type === 'sabit') {
        const sg = sabitGiderler.find(s => s.id === id);
        if (sg) openSabitGiderOdeFormu(sg);
      }
    });
  });

  document.querySelectorAll('.odendi-isaretle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const id   = btn.dataset.id;
      const today = bugun();
      const [yStr, mStr] = today.split('-');
      const yil = parseInt(yStr);
      const ay  = parseInt(mStr);
      const ad = type === 'maas'
        ? (cariler.find(c => c.id === id)?.ad || 'Bu kayıt')
        : (sabitGiderler.find(s => s.id === id)?.ad || 'Bu kayıt');
      if (!confirm(`"${ad}" bu ay için ödendi olarak işaretlensin mi?`)) return;
      odendiIsaretle(type === 'maas' ? 'personel' : 'sabit', id, yil, ay);
      rebuildBuAyKarti();
      showToast(`${ad} ödendi olarak işaretlendi`, 'success');
    });
  });
}

function openSabitGiderOdeFormu(sg) {
  if (document.getElementById('sgo-overlay')) return;

  const kasalar = getKasalar();
  const today   = bugun();
  const [y, m]  = today.split('-').map(Number);
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
      await addIslem({
        tarih, tip: 'gider', tutar, kasaId,
        kategoriId: sg.kategoriId || null,
        aciklama,
        cariId: null, cariEtkisi: null,
      });
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
