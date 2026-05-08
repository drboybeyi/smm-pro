import { getIslemler, getKasalar, getKategoriler, getCariler } from '../state.js';
import {
  formatTL, formatTarih, bugun, aralikIcindeMi, kisaltilmisRakam,
  getTarihAraligiDegerleri, islemTipiEtiketi,
  kasaAralikIslemleri, kasaAralikOzet, kasaGunlukNet
} from '../utils.js';
import { hesaplaKasaBakiyesi, updateKasa } from '../db.js';
import { openIslemDetay } from '../components/islemDetay.js';
import { showKasaModal } from './kasalar.js';
import { show as showToast } from '../components/toast.js';

const MONTHS      = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                     'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAY_HEADERS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

let currentKasaId = null;
let aralikTipi    = 'buAy';
let ozelBas       = '';
let ozelBit       = '';
let calYear       = new Date().getFullYear();
let calMonth      = new Date().getMonth();

// ─── Aralık ───────────────────────────────────────────────────

function getAralik() {
  if (aralikTipi === 'ozel' && ozelBas && ozelBit && ozelBas <= ozelBit) {
    return { baslangic: ozelBas, bitis: ozelBit };
  }
  const valid = ['buHafta','buAy','gecenAy'];
  return getTarihAraligiDegerleri(valid.includes(aralikTipi) ? aralikTipi : 'buAy');
}

function syncCal(baslangic) {
  const [y, m] = baslangic.split('-').map(Number);
  calYear  = y;
  calMonth = m - 1;
}

// ─── Özet Kartı ───────────────────────────────────────────────

function buildOzet(kasaId, baslangic, bitis, islemler) {
  const { gelen, cikan, net, gelenAdet, cikanAdet } = kasaAralikOzet(kasaId, baslangic, bitis, islemler);
  const [by, bm, bd] = baslangic.split('-').map(Number);
  const [ey, em, ed] = bitis.split('-').map(Number);
  const baslikStr = (by === ey && bm === em)
    ? `${bd}–${ed} ${MONTHS[bm - 1]} ${by}`
    : `${formatTarih(baslangic)} – ${formatTarih(bitis)}`;
  const netRenk = net >= 0 ? 'var(--success)' : 'var(--danger)';

  return `
    <div class="kd-ozet-kart">
      <div class="kd-ozet-baslik">📊 ${baslikStr}</div>
      <div class="kd-ozet-satirlar">
        <div class="kd-ozet-satir">
          <span class="kd-ozet-etiket">Giren</span>
          <span class="kd-ozet-deger income">+${formatTL(gelen)}</span>
          <span class="kd-ozet-adet">${gelenAdet} işlem</span>
        </div>
        <div class="kd-ozet-satir">
          <span class="kd-ozet-etiket">Çıkan</span>
          <span class="kd-ozet-deger expense">-${formatTL(cikan)}</span>
          <span class="kd-ozet-adet">${cikanAdet} işlem</span>
        </div>
        <div class="kd-ozet-satir kd-ozet-net-satir">
          <span class="kd-ozet-etiket">Net</span>
          <span class="kd-ozet-deger" style="color:${netRenk}">${net >= 0 ? '+' : ''}${formatTL(net)}</span>
          <span class="kd-ozet-adet"></span>
        </div>
      </div>
    </div>`;
}

// ─── Mini Takvim ──────────────────────────────────────────────

function buildMiniTakvim(kasaId, aralikBas, aralikBit, islemler) {
  const todayStr    = bugun();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay    = new Date(calYear, calMonth, 1);
  let startDow      = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  let cells = '';
  for (let i = 0; i < startDow; i++) {
    cells += `<div class="cal-cell cal-cell-empty"></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const inRange = aralikIcindeMi(dateStr, aralikBas, aralikBit);
    const net     = inRange ? kasaGunlukNet(kasaId, dateStr, islemler) : 0;
    const hasNet  = inRange && net !== 0;

    const netHtml = hasNet
      ? `<span class="kd-cal-net ${net > 0 ? 'kd-cal-net-pos' : 'kd-cal-net-neg'}">${net > 0 ? '+' : '-'}${kisaltilmisRakam(Math.abs(net))}</span>`
      : '';

    cells += `
      <div class="cal-cell${isToday ? ' cal-today' : ''}${!inRange ? ' cal-cell-other-month' : ''}${hasNet ? ' cal-has-data' : ''}"
           data-date="${dateStr}">
        <span class="cal-day-num">${d}</span>
        ${netHtml}
      </div>`;
  }

  const aralikStartMon = aralikBas.slice(0, 7);
  const aralikEndMon   = aralikBit.slice(0, 7);
  const prevY = calMonth === 0 ? calYear - 1 : calYear;
  const prevM = calMonth === 0 ? 11 : calMonth - 1;
  const nextY = calMonth === 11 ? calYear + 1 : calYear;
  const nextM = calMonth === 11 ? 0 : calMonth + 1;
  const prevKey = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;
  const nextKey = `${nextY}-${String(nextM + 1).padStart(2, '0')}`;
  const showPrev = prevKey >= aralikStartMon;
  const showNext = nextKey <= aralikEndMon;

  const navHtml = (showPrev || showNext) ? `
    <div class="kd-cal-nav">
      ${showPrev ? `<button class="btn btn-secondary btn-sm" id="kdCalPrev">‹ ${MONTHS[prevM]}</button>` : '<span></span>'}
      <span class="kd-cal-nav-title">${MONTHS[calMonth]} ${calYear}</span>
      ${showNext ? `<button class="btn btn-secondary btn-sm" id="kdCalNext">${MONTHS[nextM]} ›</button>` : '<span></span>'}
    </div>` : `
    <div class="kd-cal-nav">
      <span class="kd-cal-nav-title">${MONTHS[calMonth]} ${calYear}</span>
    </div>`;

  return `
    <div class="kd-mini-takvim-section">
      <div class="kd-section-baslik">📅 Günlük Hareketler</div>
      ${navHtml}
      <div class="cal-grid kd-mini-grid">
        ${DAY_HEADERS.map((h, i) =>
          `<div class="cal-header-cell${i >= 5 ? ' cal-header-weekend' : ''}">${h}</div>`
        ).join('')}
        ${cells}
      </div>
    </div>`;
}

// ─── İşlem Listesi ────────────────────────────────────────────

function buildListe(kasaId, baslangic, bitis, islemler, kasalar, kategoriler, cariler) {
  const hareketler = kasaAralikIslemleri(kasaId, baslangic, bitis, islemler)
    .sort((a, b) => (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0));

  if (!hareketler.length) {
    return `
      <div class="kd-islem-section">
        <div class="kd-section-baslik">📋 Hareketler (0)</div>
        <p style="text-align:center;font-size:13px;color:var(--text-secondary);padding:16px 0">Bu dönemde hareket yok</p>
      </div>`;
  }

  const rows = hareketler.map(islem => {
    const kasa     = kasalar.find(k => k.id === islem.kasaId);
    const kategori = kategoriler.find(k => k.id === islem.kategoriId);
    const cari     = islem.cariId ? cariler.find(c => c.id === islem.cariId) : null;

    const isGelen  = (islem.tip === 'gelir'    && islem.kasaId      === kasaId) ||
                     (islem.tip === 'transfer' && islem.hedefKasaId === kasaId);
    const dirStr   = isGelen ? `+${formatTL(islem.tutar)}` : `-${formatTL(islem.tutar)}`;
    const dirRenk  = isGelen ? 'var(--success)' : 'var(--danger)';

    let title, icon;
    if (islem.tip === 'transfer') {
      const hedef = kasalar.find(k => k.id === islem.hedefKasaId);
      icon  = '↔';
      title = `${kasa?.ad || '?'} → ${hedef?.ad || '?'}`;
    } else if (islem.cariEtkisi) {
      icon  = kategori?.emoji || (islem.tip === 'gelir' ? '▲' : '▼');
      title = islem.aciklama || islemTipiEtiketi(islem) + (cari ? ` — ${cari.ad}` : '');
    } else {
      icon  = kategori?.emoji || (islem.tip === 'gelir' ? '▲' : '▼');
      title = islem.aciklama || kategori?.ad || (islem.tip === 'gelir' ? 'Gelir' : 'Gider');
    }

    return `
      <div class="list-item kd-islem-item" data-islem-id="${islem.id}" data-date="${islem.tarih}" style="cursor:pointer">
        <div class="list-item-icon" style="font-size:16px;background:transparent">${icon}</div>
        <div class="list-item-body">
          <div class="list-item-title">${title}</div>
          <div class="list-item-subtitle">${formatTarih(islem.tarih)}</div>
        </div>
        <div class="list-item-amount" style="color:${dirRenk}">${dirStr}</div>
      </div>`;
  }).join('');

  return `
    <div class="kd-islem-section">
      <div class="kd-section-baslik">📋 Hareketler (${hareketler.length})</div>
      <div id="kd-islemler-liste">${rows}</div>
    </div>`;
}

// ─── Açık Fonksiyon ───────────────────────────────────────────

export function openKasaDetay(kasaId) {
  currentKasaId = kasaId;
  aralikTipi    = 'buAy';
  ozelBas       = '';
  ozelBit       = '';
  const now  = new Date();
  calYear    = now.getFullYear();
  calMonth   = now.getMonth();
  location.hash = '#kasaDetay';
}

// ─── Page View ────────────────────────────────────────────────

export default {
  render() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const cariler     = getCariler();
    const kasa        = kasalar.find(k => k.id === currentKasaId);

    if (!kasa) {
      return `<div style="padding:32px;text-align:center;color:var(--text-secondary)">Kasa bulunamadı. <a href="#dashboard">Dashboard'a dön</a></div>`;
    }

    const bakiye           = hesaplaKasaBakiyesi(kasa.id, islemler);
    const { baslangic, bitis } = getAralik();

    const aralikBtnler = [
      { tip: 'buHafta',  label: 'Bu Hafta'  },
      { tip: 'buAy',     label: 'Bu Ay'     },
      { tip: 'gecenAy',  label: 'Geçen Ay'  },
      { tip: 'ozel',     label: 'Özel'      }
    ].map(({ tip, label }) =>
      `<button class="kd-aralik-btn${aralikTipi === tip ? ' aktif' : ''}" data-tip="${tip}">${label}</button>`
    ).join('');

    return `
      <div class="kasa-detay-page">

        <div class="kd-header">
          <div class="kd-header-top">
            <button class="kd-geri-btn" id="kdGeriBtn">◀ Geri</button>
            <span class="kd-kasa-baslik">${kasa.emoji} ${kasa.ad}</span>
            <button class="kd-menu-btn" id="kdMenuBtn">⋯</button>
          </div>
          <div class="kd-bakiye">
            <div class="kd-bakiye-label">Güncel Bakiye</div>
            <div class="kd-bakiye-tutar" style="color:${bakiye >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${formatTL(bakiye)}
            </div>
          </div>
        </div>

        <div class="kd-aralik-bar">${aralikBtnler}</div>

        <div class="kd-ozel-wrap" id="kdOzelWrap" style="${aralikTipi === 'ozel' ? '' : 'display:none'}">
          <input type="date" class="form-control" id="kdOzelBas" value="${ozelBas}">
          <span class="kd-ozel-sep">—</span>
          <input type="date" class="form-control" id="kdOzelBit" value="${ozelBit}">
          <button class="btn btn-primary btn-sm" id="kdOzelUygula">Uygula</button>
        </div>

        ${buildOzet(kasa.id, baslangic, bitis, islemler)}
        ${buildMiniTakvim(kasa.id, baslangic, bitis, islemler)}
        ${buildListe(kasa.id, baslangic, bitis, islemler, kasalar, kategoriler, cariler)}

      </div>`;
  },

  afterRender() {
    const appEl = document.getElementById('app');

    const rerender = (scrollTop = true) => {
      appEl.innerHTML = this.render();
      this.afterRender();
      if (scrollTop) window.scrollTo({ top: 0, behavior: 'instant' });
    };

    document.getElementById('kdGeriBtn')?.addEventListener('click', () => {
      location.hash = '#dashboard';
    });

    document.getElementById('kdMenuBtn')?.addEventListener('click', e => {
      showKasaMenuPopup(e.currentTarget, currentKasaId, () => rerender());
    });

    document.querySelectorAll('.kd-aralik-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        aralikTipi = btn.dataset.tip;
        if (aralikTipi !== 'ozel') {
          const d = getTarihAraligiDegerleri(aralikTipi);
          if (d) syncCal(d.baslangic);
        }
        rerender();
      });
    });

    document.getElementById('kdOzelUygula')?.addEventListener('click', () => {
      const b = document.getElementById('kdOzelBas')?.value;
      const t = document.getElementById('kdOzelBit')?.value;
      if (b && t && b <= t) { ozelBas = b; ozelBit = t; syncCal(b); rerender(); }
    });

    document.getElementById('kdCalPrev')?.addEventListener('click', () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
      rerender(false);
    });

    document.getElementById('kdCalNext')?.addEventListener('click', () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
      rerender(false);
    });

    // Takvim hücre → listeye scroll
    document.querySelectorAll('.kd-mini-grid .cal-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dateStr = cell.dataset.date;
        const target  = document.querySelector(`.kd-islem-item[data-date="${dateStr}"]`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('kd-highlight');
          setTimeout(() => target.classList.remove('kd-highlight'), 1500);
        }
      });
    });

    // İşlem tıklama → İşlem Detay modal
    const islemler = getIslemler();
    document.querySelectorAll('.kd-islem-item').forEach(item => {
      item.addEventListener('click', () => {
        const islem = islemler.find(i => i.id === item.dataset.islemId);
        if (islem) openIslemDetay(islem);
      });
    });
  }
};

// ─── ⋯ Menü Popup ─────────────────────────────────────────────

function showKasaMenuPopup(triggerEl, kasaId, onUpdate) {
  const existing = document.getElementById('kd-menu-popup');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'kd-menu-popup';
  popup.className = 'kd-menu-popup';
  popup.innerHTML = `
    <button class="kd-menu-item" id="kdPopupDuzenle">✎ Düzenle</button>
    <button class="kd-menu-item kd-menu-item-danger" id="kdPopupSil">🗑 Sil</button>`;
  document.body.appendChild(popup);

  const rect  = triggerEl.getBoundingClientRect();
  popup.style.top   = `${rect.bottom + window.scrollY + 4}px`;
  popup.style.right = `${window.innerWidth - rect.right}px`;

  const closePopup = () => popup.remove();

  document.getElementById('kdPopupDuzenle')?.addEventListener('click', () => {
    closePopup();
    const kasa = getKasalar().find(k => k.id === kasaId);
    if (kasa) showKasaModal(kasa);
  });

  document.getElementById('kdPopupSil')?.addEventListener('click', async () => {
    closePopup();
    const kasa = getKasalar().find(k => k.id === kasaId);
    if (!kasa) return;
    if (!confirm(`"${kasa.ad}" kasasını silmek istediğinizden emin misiniz?`)) return;
    await updateKasa(kasaId, { silindi: true });
    showToast(`${kasa.emoji} ${kasa.ad} silindi`, 'info');
    location.hash = '#dashboard';
  });

  setTimeout(() => document.addEventListener('click', closePopup, { once: true }), 10);
}
