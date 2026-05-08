import { getIslemler, getKasalar, getKategoriler, getCariler } from '../state.js';
import {
  formatTL, formatTarih, bugun, aralikIcindeMi, kisaltilmisRakam,
  getTarihAraligiDegerleri, islemTipiEtiketi,
  tumKasalarOzet, tumKasalarDagilim, tumKasalarGunlukNet
} from '../utils.js';
import { hesaplaKasaBakiyesi } from '../db.js';
import { openIslemDetay } from '../components/islemDetay.js';
import { openKasaDetay } from './kasaDetay.js';

const MONTHS      = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                     'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAY_HEADERS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

let aralikTipi = 'buAy';
let ozelBas    = '';
let ozelBit    = '';
let calYear    = new Date().getFullYear();
let calMonth   = new Date().getMonth();

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

function buildOzet(kasalar, baslangic, bitis, islemler) {
  const { gelen, cikan, net, gelenAdet, cikanAdet } = tumKasalarOzet(kasalar, baslangic, bitis, islemler);
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

function buildDagilim(kasalar, baslangic, bitis, islemler) {
  const dagilim = tumKasalarDagilim(kasalar, baslangic, bitis, islemler);

  const rows = dagilim.map(({ kasaId, ad, emoji, gelen, cikan, net }) => {
    const netRenk = net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--text-secondary)';
    return `
      <div class="tkd-dagilim-satir" data-kasa-id="${kasaId}">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:600">${emoji} ${ad}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">
            <span style="color:var(--success)">+${kisaltilmisRakam(gelen)}</span>
            <span style="margin:0 4px">·</span>
            <span style="color:var(--danger)">-${kisaltilmisRakam(cikan)}</span>
          </div>
        </div>
        <span style="font-size:15px;font-weight:700;color:${netRenk}">${net >= 0 ? '+' : ''}${kisaltilmisRakam(Math.abs(net))}</span>
      </div>`;
  }).join('');

  return `
    <div class="kd-islem-section">
      <div class="kd-section-baslik">📋 Kasa Dağılımı</div>
      <div id="tkd-dagilim-liste">
        ${dagilim.length
          ? rows
          : `<p style="text-align:center;font-size:13px;color:var(--text-secondary);padding:16px 0">Bu dönemde hareket yok</p>`
        }
      </div>
    </div>`;
}

function buildMiniTakvim(kasalar, aralikBas, aralikBit, islemler) {
  const todayStr    = bugun();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay    = new Date(calYear, calMonth, 1);
  let startDow      = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += `<div class="cal-cell cal-cell-empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const inRange = aralikIcindeMi(dateStr, aralikBas, aralikBit);
    const net     = inRange ? tumKasalarGunlukNet(dateStr, kasalar, islemler) : 0;
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
      ${showPrev ? `<button class="btn btn-secondary btn-sm" id="tkdCalPrev">‹ ${MONTHS[prevM]}</button>` : '<span></span>'}
      <span class="kd-cal-nav-title">${MONTHS[calMonth]} ${calYear}</span>
      ${showNext ? `<button class="btn btn-secondary btn-sm" id="tkdCalNext">${MONTHS[nextM]} ›</button>` : '<span></span>'}
    </div>` : `
    <div class="kd-cal-nav"><span class="kd-cal-nav-title">${MONTHS[calMonth]} ${calYear}</span></div>`;

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

function buildListe(kasalar, baslangic, bitis, islemler, kategoriler, cariler) {
  const hareketler = islemler
    .filter(i => {
      if (!aralikIcindeMi(i.tarih, baslangic, bitis)) return false;
      if (i.cariEtkisi === 'borc_yaz' || i.cariEtkisi === 'borc_cikar') return false;
      return !!i.kasaId;
    })
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

    let title, icon, tutarStr, tutarRenk;
    if (islem.tip === 'transfer') {
      const hedef = kasalar.find(k => k.id === islem.hedefKasaId);
      icon = '↔'; title = `${kasa?.ad || '?'} → ${hedef?.ad || '?'}`;
      tutarStr = `↔ ${formatTL(islem.tutar)}`; tutarRenk = 'var(--accent)';
    } else if (islem.cariEtkisi) {
      icon = kategori?.emoji || (islem.tip === 'gelir' ? '▲' : '▼');
      title = islem.aciklama || islemTipiEtiketi(islem) + (cari ? ` — ${cari.ad}` : '');
      tutarStr = islem.tip === 'gelir' ? `+${formatTL(islem.tutar)}` : `-${formatTL(islem.tutar)}`;
      tutarRenk = islem.tip === 'gelir' ? 'var(--success)' : 'var(--danger)';
    } else if (islem.tip === 'gelir') {
      icon = kategori?.emoji || '▲'; title = islem.aciklama || kategori?.ad || 'Gelir';
      tutarStr = `+${formatTL(islem.tutar)}`; tutarRenk = 'var(--success)';
    } else {
      icon = kategori?.emoji || '▼'; title = islem.aciklama || kategori?.ad || 'Gider';
      tutarStr = `-${formatTL(islem.tutar)}`; tutarRenk = 'var(--danger)';
    }

    return `
      <div class="list-item kd-islem-item" data-islem-id="${islem.id}" data-date="${islem.tarih}" style="cursor:pointer">
        <div class="list-item-icon" style="font-size:16px;background:transparent">${icon}</div>
        <div class="list-item-body">
          <div class="list-item-title">${title}</div>
          <div class="list-item-subtitle">${formatTarih(islem.tarih)} · ${kasa?.ad || ''}</div>
        </div>
        <div class="list-item-amount" style="color:${tutarRenk}">${tutarStr}</div>
      </div>`;
  }).join('');

  return `
    <div class="kd-islem-section">
      <div class="kd-section-baslik">📋 Hareketler (${hareketler.length})</div>
      <div id="tkd-islemler-liste">${rows}</div>
    </div>`;
}

export function openTumKasalarDetay() {
  aralikTipi = 'buAy';
  ozelBas    = '';
  ozelBit    = '';
  const now  = new Date();
  calYear    = now.getFullYear();
  calMonth   = now.getMonth();
  location.hash = '#tumKasalarDetay';
}

export default {
  render() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar().filter(k => !k.silindi);
    const kategoriler = getKategoriler();
    const cariler     = getCariler();

    const toplamBakiye = kasalar.reduce((sum, k) => sum + hesaplaKasaBakiyesi(k.id, islemler), 0);
    const { baslangic, bitis } = getAralik();

    const aralikBtnler = [
      { tip: 'buHafta', label: 'Bu Hafta' },
      { tip: 'buAy',    label: 'Bu Ay'    },
      { tip: 'gecenAy', label: 'Geçen Ay' },
      { tip: 'ozel',    label: 'Özel'     }
    ].map(({ tip, label }) =>
      `<button class="kd-aralik-btn${aralikTipi === tip ? ' aktif' : ''}" data-tip="${tip}">${label}</button>`
    ).join('');

    return `
      <div class="kasa-detay-page">
        <div class="kd-header">
          <div class="kd-header-top">
            <button class="kd-geri-btn" id="tkdGeriBtn">◀ Geri</button>
            <span class="kd-kasa-baslik">📊 Tüm Kasalar</span>
            <span style="width:44px"></span>
          </div>
          <div class="kd-bakiye">
            <div class="kd-bakiye-label">Toplam Bakiye</div>
            <div class="kd-bakiye-tutar" style="color:${toplamBakiye >= 0 ? 'var(--success)' : 'var(--danger)'}">
              ${formatTL(toplamBakiye)}
            </div>
          </div>
        </div>

        <div class="kd-aralik-bar">${aralikBtnler}</div>

        <div class="kd-ozel-wrap" id="tkdOzelWrap" style="${aralikTipi === 'ozel' ? '' : 'display:none'}">
          <input type="date" class="form-control" id="tkdOzelBas" value="${ozelBas}">
          <span class="kd-ozel-sep">—</span>
          <input type="date" class="form-control" id="tkdOzelBit" value="${ozelBit}">
          <button class="btn btn-primary btn-sm" id="tkdOzelUygula">Uygula</button>
        </div>

        ${buildOzet(kasalar, baslangic, bitis, islemler)}
        ${buildDagilim(kasalar, baslangic, bitis, islemler)}
        ${buildMiniTakvim(kasalar, baslangic, bitis, islemler)}
        ${buildListe(kasalar, baslangic, bitis, islemler, kategoriler, cariler)}
      </div>`;
  },

  afterRender() {
    const appEl = document.getElementById('app');

    const rerender = (scrollTop = true) => {
      appEl.innerHTML = this.render();
      this.afterRender();
      if (scrollTop) window.scrollTo({ top: 0, behavior: 'instant' });
    };

    document.getElementById('tkdGeriBtn')?.addEventListener('click', () => {
      location.hash = '#dashboard';
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

    document.getElementById('tkdOzelUygula')?.addEventListener('click', () => {
      const b = document.getElementById('tkdOzelBas')?.value;
      const t = document.getElementById('tkdOzelBit')?.value;
      if (b && t && b <= t) { ozelBas = b; ozelBit = t; syncCal(b); rerender(); }
    });

    document.getElementById('tkdCalPrev')?.addEventListener('click', () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
      rerender(false);
    });

    document.getElementById('tkdCalNext')?.addEventListener('click', () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
      rerender(false);
    });

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

    document.querySelectorAll('.tkd-dagilim-satir').forEach(row => {
      row.addEventListener('click', () => openKasaDetay(row.dataset.kasaId));
    });

    const islemler = getIslemler();
    document.querySelectorAll('.kd-islem-item').forEach(item => {
      item.addEventListener('click', () => {
        const islem = islemler.find(i => i.id === item.dataset.islemId);
        if (islem) openIslemDetay(islem);
      });
    });
  }
};
