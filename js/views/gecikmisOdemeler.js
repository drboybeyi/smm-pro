import { getCariler, getSabitGiderler, getVadeler, getIslemler, getKategoriler, getKasalar } from '../state.js';
import { bugun, formatTL, formatTarih, odendiIsaretle, odendiKontrol, gunFarki, buAyOdemeTarihi, hesaplaCariBakiye } from '../utils.js';
import { addIslem, updateSabitGider } from '../db.js';
import { show as showToast } from '../components/toast.js';
import { openMaasOde } from './maasOde.js';
import { openOdemeFormu } from './cariDetay.js';

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

function gecikmisItemleriGetir() {
  const today  = bugun();
  const [yStr, mStr] = today.split('-');
  const yil    = parseInt(yStr);
  const ay     = parseInt(mStr);
  const ayStr  = `${yStr}-${mStr}`;
  const islemler    = getIslemler();
  const kategoriler = getKategoriler();
  const cariler     = getCariler();
  const sabitGiderler = getSabitGiderler();
  const vadeler     = getVadeler();
  const items       = [];

  // Sabit giderler: bu ay ödeme günü geçmiş, ödenmemiş
  for (const sg of sabitGiderler) {
    if (sg.silindi || sg.aktif === false) continue;
    if (odendiKontrol('sabit', sg.id, yil, ay)) continue;
    const odemeTarih = buAyOdemeTarihi(sg.odemeGunu);
    if (!odemeTarih || odemeTarih >= today) continue;
    const odendi = islemler.some(i =>
      i.tarih?.startsWith(ayStr) && i.tip === 'gider' &&
      i.aciklama?.toLowerCase().includes(sg.ad.toLowerCase())
    );
    if (odendi) continue;
    items.push({
      tip: 'sabit', id: sg.id, sg,
      ad: `${sg.emoji || '💸'} ${sg.ad}`,
      tutar: sg.varsayilanTutar || null,
      vadeTarih: odemeTarih,
      gecGun: gunFarki(today, odemeTarih)
    });
  }

  // Personel maaşları: bu ay maaş günü geçmiş, ödenmemiş
  const katIds = getMaasKatIds(kategoriler);
  for (const cari of cariler) {
    if (cari.tip !== 'personel' || cari.silindi || !cari.sabitBrutMaas) continue;
    if (odendiKontrol('personel', cari.id, yil, ay)) continue;
    const maasOdendi = islemler.some(i => {
      if (!i.tarih?.startsWith(ayStr)) return false;
      if (i.cariId === cari.id && i.cariEtkisi === 'tahsilat') return true;
      if (i.tip === 'gider' && katIds.has(i.kategoriId) &&
          i.aciklama?.toLowerCase().includes(cari.ad.toLowerCase())) return true;
      return false;
    });
    if (maasOdendi) continue;
    const odemeTarih = buAyOdemeTarihi(cari.maasOdemeGunu || 5);
    if (!odemeTarih || odemeTarih >= today) continue;
    const avans = Math.max(0, hesaplaCariBakiye(cari.id, islemler));
    const brut  = cari.sabitBrutMaas || 0;
    const net   = Math.max(0, brut - avans);
    items.push({
      tip: 'maas', id: cari.id, cari,
      ad: `👤 ${cari.ad}`,
      tutar: net || brut,
      vadeTarih: odemeTarih,
      gecGun: gunFarki(today, odemeTarih)
    });
  }

  // Cari vadeler: vadeTarih < bugün, durum=bekliyor
  for (const v of vadeler) {
    if (v.durum !== 'bekliyor' || !v.vadeTarih || v.vadeTarih >= today) continue;
    const cari = cariler.find(c => c.id === v.cariId);
    items.push({
      tip: 'vade', id: v.id, vade: v, cari,
      ad: `💊 ${cari ? cari.ad : '?'}`,
      tutar: v.tutar || null,
      vadeTarih: v.vadeTarih,
      gecGun: gunFarki(today, v.vadeTarih)
    });
  }

  // En çok gecikmiş üstte
  return items.sort((a, b) => b.gecGun - a.gecGun);
}

function gecGunMetni(n) {
  if (n >= 30) return '30+ gün gecikmiş';
  if (n === 1) return '1 gün gecikmiş';
  return `${n} gün gecikmiş`;
}

// ─── Render ─────────────────────────────────────────────────────

export function renderGecikmisOdemelerKarti() {
  const items = gecikmisItemleriGetir();
  if (!items.length) return '<div id="gecikmis-odemeler-wrap"></div>';

  const rows = items.map(item => `
    <div class="dash-gecikmis-row vade-gecmis">
      <div class="dash-gecikmis-sol">
        <div class="dash-gecikmis-ad">${item.ad}</div>
        <div class="dash-gecikmis-meta">${gecGunMetni(item.gecGun)} · ${formatTarih(item.vadeTarih)}${item.tutar ? ` · ${formatTL(item.tutar)}` : ''}</div>
      </div>
      <div class="dash-gecikmis-butonlar">
        ${item.tip !== 'vade'
          ? `<button class="dash-gecikmis-isaretle" data-tip="${item.tip}" data-id="${item.id}">✓</button>`
          : ''}
        <button class="dash-gecikmis-ode" data-tip="${item.tip}" data-id="${item.id}">Öde →</button>
      </div>
    </div>`).join('');

  return `
    <div id="gecikmis-odemeler-wrap">
      <div class="section-header">
        <span class="section-title gecikmis-title">🚨 GECİKMİŞ ÖDEMELER (${items.length})</span>
      </div>
      <div class="card mb-3 gecikmis-kart">${rows}</div>
    </div>`;
}

function _rebuildGecikmisKart() {
  const wrap = document.getElementById('gecikmis-odemeler-wrap');
  if (!wrap) return;
  const temp = document.createElement('div');
  temp.innerHTML = renderGecikmisOdemelerKarti();
  const newWrap = temp.querySelector('#gecikmis-odemeler-wrap');
  if (newWrap) {
    wrap.replaceWith(newWrap);
    afterGecikmisOdemelerKarti();
  }
}

export function afterGecikmisOdemelerKarti() {
  const today  = bugun();
  const [yStr, mStr] = today.split('-');
  const yil    = parseInt(yStr);
  const ay     = parseInt(mStr);
  const ayStr  = `${yStr}-${mStr}`;

  document.querySelectorAll('.dash-gecikmis-isaretle').forEach(btn => {
    btn.addEventListener('click', () => {
      const tip = btn.dataset.tip;
      const id  = btn.dataset.id;
      const src = tip === 'maas'
        ? getCariler().find(c => c.id === id)
        : getSabitGiderler().find(s => s.id === id);
      const ad  = src?.ad || 'Bu kayıt';
      if (!confirm(`"${ad}" ödendi olarak işaretlensin mi?`)) return;
      odendiIsaretle(tip === 'maas' ? 'personel' : 'sabit', id, yil, ay);
      _rebuildGecikmisKart();
      showToast(`${ad} ödendi olarak işaretlendi`, 'success');
    });
  });

  document.querySelectorAll('.dash-gecikmis-ode').forEach(btn => {
    btn.addEventListener('click', () => {
      const tip = btn.dataset.tip;
      const id  = btn.dataset.id;
      if (tip === 'maas') {
        const cari = getCariler().find(c => c.id === id);
        if (cari) openMaasOde(cari);
      } else if (tip === 'sabit') {
        const sg = getSabitGiderler().find(s => s.id === id);
        if (sg) _openSabitGiderOde(sg, ayStr);
      } else if (tip === 'vade') {
        const vade = getVadeler().find(v => v.id === id);
        const cari = vade ? getCariler().find(c => c.id === vade.cariId) : null;
        if (vade && cari) openOdemeFormu(cari, vade);
      }
    });
  });
}

// ─── Sabit Gider Öde Formu ──────────────────────────────────────

function _openSabitGiderOde(sg, ayStr) {
  if (document.getElementById('gec-sgo-overlay')) return;
  const kasalar  = getKasalar();
  const [y, m]   = ayStr.split('-').map(Number);
  const autoAcik = `${AYLAR_TR[m - 1]} ${y} - ${sg.ad}`;
  const kasaOpts = kasalar.map(k =>
    `<option value="${k.id}" ${sg.varsayilanKasaId === k.id ? 'selected' : ''}>${k.emoji} ${k.ad}</option>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.id    = 'gec-sgo-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '225';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:400px">
      <div class="modal-header">
        <span class="modal-title">${sg.emoji || '💸'} ${sg.ad} — Öde</span>
        <button class="modal-close" id="gec-sgo-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Tarih</label>
          <input class="form-control" id="gec-sgo-tarih" type="date" value="${bugun()}">
        </div>
        <div class="form-group">
          <label class="form-label">Tutar <span class="req">*</span></label>
          <input class="form-control" id="gec-sgo-tutar" type="number"
            step="0.01" min="0.01" inputmode="decimal" placeholder="0,00"
            autocomplete="off" value="${sg.varsayilanTutar || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Kasa <span class="req">*</span></label>
          <select class="form-control" id="gec-sgo-kasa">
            <option value="">Kasa seçin...</option>
            ${kasaOpts}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Açıklama</label>
          <input class="form-control" id="gec-sgo-aciklama" type="text"
            maxlength="200" value="${autoAcik}" autocomplete="off">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="gec-sgo-vazgec">Vazgeç</button>
        <button class="btn btn-primary"   id="gec-sgo-kaydet">💸 Öde</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const close = () => { overlay.classList.add('modal-closing'); setTimeout(() => overlay.remove(), 220); };
  overlay.querySelector('#gec-sgo-close')?.addEventListener('click', close);
  overlay.querySelector('#gec-sgo-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#gec-sgo-kaydet')?.addEventListener('click', async () => {
    const tarih    = overlay.querySelector('#gec-sgo-tarih').value;
    const tutarStr = overlay.querySelector('#gec-sgo-tutar').value;
    const kasaId   = overlay.querySelector('#gec-sgo-kasa').value;
    const aciklama = overlay.querySelector('#gec-sgo-aciklama').value.trim();
    const tutar    = parseFloat(tutarStr);
    overlay.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
    let valid = true;
    if (!tutarStr || isNaN(tutar) || tutar < 0.01) { overlay.querySelector('#gec-sgo-tutar').classList.add('error'); valid = false; }
    if (!kasaId)                                    { overlay.querySelector('#gec-sgo-kasa').classList.add('error');  valid = false; }
    if (!valid) return;
    const btn = overlay.querySelector('#gec-sgo-kaydet');
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

  setTimeout(() => overlay.querySelector('#gec-sgo-tutar')?.focus(), 80);
}
