import { getIslemler, getKasalar, getKategoriler, getCariler, getVadeler, getTarihAraligi, setTarihAraligi } from '../state.js';
import {
  formatTL, formatTarih, bugun, gunFarki,
  aralikIcindeMi, islemTipiEtiketi, islemTutarFormati,
  kisaltilmisRakam, bugunOzet, bugunKasaDagilim
} from '../utils.js';
import { openIslemDetay } from '../components/islemDetay.js';
import { hesaplaKasaBakiyesi } from '../db.js';
import { openIslemForm } from '../components/islemForm.js';
import { openOdemeFormu } from './cariDetay.js';
import { openAyOzet } from './ayOzet.js';
import { openKasaDetay } from './kasaDetay.js';

const AYLAR  = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const GUNLER = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];

// ─── Ay navigasyon yardımcıları ───────────────────────────────

function oncekiAy(baslangic) {
  const [y, m] = baslangic.split('-').map(Number);
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  const last = new Date(py, pm, 0);
  return {
    tip: 'ozel',
    baslangic: `${py}-${String(pm).padStart(2, '0')}-01`,
    bitis:     `${py}-${String(pm).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  };
}

function sonrakiAy(baslangic) {
  const [y, m] = baslangic.split('-').map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  const last = new Date(ny, nm, 0);
  return {
    tip: 'ozel',
    baslangic: `${ny}-${String(nm).padStart(2, '0')}-01`,
    bitis:     `${ny}-${String(nm).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  };
}

// ─── Metrik hesaplama ─────────────────────────────────────────

function calcMetrics(islemler, baslangic, bitis) {
  const aralik = islemler.filter(i =>
    i.tarih && aralikIcindeMi(i.tarih, baslangic, bitis) &&
    i.kasaId && i.cariEtkisi !== 'borc_yaz' && i.cariEtkisi !== 'borc_cikar'
  );
  const gelir = aralik.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const gider = aralik.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  return { gelir, gider, net: gelir - gider };
}

function metricCard(label, value, cls) {
  return `
    <div class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value ${cls}">${formatTL(value)}</div>
    </div>`;
}

// ─── Kasalar listesi ──────────────────────────────────────────

function kasalarList(kasalar, islemler) {
  if (!kasalar.length) return '';
  let toplam = 0;
  const rows = kasalar.map(k => {
    const bakiye = hesaplaKasaBakiyesi(k.id, islemler);
    toplam += bakiye;
    return `
      <div class="dash-kasa-satir" data-kasa-id="${k.id}"
           style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <span style="font-size:14px">${k.emoji} ${k.ad}</span>
        <span style="font-size:14px;font-weight:700;color:${bakiye >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatTL(bakiye)}</span>
      </div>`;
  }).join('');

  const toplamRenk = toplam > 0 ? 'var(--success)' : toplam < 0 ? 'var(--danger)' : 'var(--text-secondary)';
  const toplamSatir = `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0 7px;border-top:2px solid var(--accent);background:var(--bg-tertiary,#ede6d8);margin:0 -16px;padding-left:16px;padding-right:16px">
      <span style="font-size:14px;font-weight:700;color:var(--text-primary)">📊 TOPLAM</span>
      <span style="font-size:14px;font-weight:700;color:${toplamRenk}">${formatTL(toplam)}</span>
    </div>`;

  return rows + toplamSatir;
}

// ─── Bugün öde kartı ──────────────────────────────────────────

function bugunOdeKarti(vadeler, cariler, today) {
  const bugunler = vadeler.filter(v => v.durum === 'bekliyor' && v.vadeTarih === today);
  if (!bugunler.length) return '';

  const rows = bugunler.map(v => {
    const cari = cariler.find(c => c.id === v.cariId);
    if (!cari) return '';
    return `
      <div class="dash-bugun-ode-satir">
        <div>
          <div class="dash-bugun-ode-cari">${cari.ad}</div>
          <div class="dash-bugun-ode-tutar">${formatTL(v.tutar)}</div>
        </div>
        <button class="dash-bugun-ode-btn"
          data-cari-id="${cari.id}" data-vade-id="${v.id}" data-tutar="${v.tutar}">
          Hemen Öde
        </button>
      </div>`;
  }).filter(Boolean).join('');

  if (!rows) return '';
  return `
    <div class="dash-bugun-ode-kart">
      <div class="dash-bugun-ode-baslik">🚨 BUGÜN ÖDEMELERİNİZ</div>
      ${rows}
    </div>`;
}

// ─── Bugün bölümü — 3 kart ────────────────────────────────────

function bugunBolumu(islemler, today) {
  const { gelir, gider, net } = bugunOzet(islemler);
  const [ty, tm, td] = today.split('-').map(Number);
  const gunAdi   = GUNLER[new Date(ty, tm - 1, td).getDay()];
  const tarihStr = `${td} ${AYLAR[tm - 1]} ${ty} ${gunAdi}`;
  const netRenk  = net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--text-secondary)';

  return `
    <div class="section-header bugun-header" id="dashBugunBaslik" style="cursor:pointer;user-select:none">
      <span class="section-title">📅 BUGÜN</span>
      <span style="font-size:12px;color:var(--text-secondary)">${tarihStr}</span>
    </div>
    <div class="bugun-grid">
      <div class="bugun-kart" id="dashBugunGelir">
        <div class="bugun-kart-etiket">Gelir</div>
        <div class="bugun-kart-deger" style="color:var(--success)">+${formatTL(gelir)}</div>
      </div>
      <div class="bugun-kart" id="dashBugunGider">
        <div class="bugun-kart-etiket">Gider</div>
        <div class="bugun-kart-deger" style="color:var(--danger)">-${formatTL(gider)}</div>
      </div>
      <div class="bugun-kart" id="dashBugunNet">
        <div class="bugun-kart-etiket">Net</div>
        <div class="bugun-kart-deger" style="color:${netRenk}">${net >= 0 ? '+' : ''}${formatTL(net)}</div>
      </div>
    </div>`;
}

// ─── Bugün Detay Modal (inline) ────────────────────────────────

function openBugunDetay() {
  if (document.getElementById('bd-overlay')) return;

  const islemler    = getIslemler();
  const kasalar     = getKasalar().filter(k => !k.silindi);
  const kategoriler = getKategoriler();
  const cariler     = getCariler();
  const today       = bugun();

  const { gelir, gider, net, gelirAdet, giderAdet } = bugunOzet(islemler);
  const dagilim = bugunKasaDagilim(islemler, kasalar);

  const [ty, tm, td] = today.split('-').map(Number);
  const gunAdi  = GUNLER[new Date(ty, tm - 1, td).getDay()];
  const baslik  = `${td} ${AYLAR[tm - 1]} ${ty} — ${gunAdi}`;
  const netRenk = net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--text-secondary)';

  // Özet
  const ozetHtml = `
    <div class="bd-section">
      <div class="bd-section-baslik">Özet</div>
      <div class="bd-ozet-satir">
        <span>Gelir</span>
        <span><span style="font-weight:700;color:var(--success)">+${formatTL(gelir)}</span><span class="bd-adet">${gelirAdet} işlem</span></span>
      </div>
      <div class="bd-ozet-satir">
        <span>Gider</span>
        <span><span style="font-weight:700;color:var(--danger)">-${formatTL(gider)}</span><span class="bd-adet">${giderAdet} işlem</span></span>
      </div>
      <div class="bd-ozet-satir bd-ozet-net">
        <span>Net</span>
        <span style="color:${netRenk};font-weight:700">${net >= 0 ? '+' : ''}${formatTL(net)}</span>
      </div>
    </div>`;

  // Kasa Dağılımı
  const dagilimIc = dagilim.length === 0
    ? `<p style="font-size:13px;color:var(--text-secondary);padding:4px 0">Bugün kasa hareketi yok</p>`
    : dagilim.map(({ ad, emoji, gelir: g, gider: c, net: n }) => {
        const nR = n > 0 ? 'var(--success)' : n < 0 ? 'var(--danger)' : 'var(--text-secondary)';
        return `
          <div class="bd-kasa-satir">
            <span class="bd-kasa-ad">${emoji} ${ad}</span>
            <span class="bd-kasa-detay">
              <span style="color:var(--success)">+${kisaltilmisRakam(g)}</span>
              <span class="bd-kasa-sep">·</span>
              <span style="color:var(--danger)">-${kisaltilmisRakam(c)}</span>
              <span class="bd-kasa-net" style="color:${nR}">${n >= 0 ? '+' : '-'}${kisaltilmisRakam(Math.abs(n))}</span>
            </span>
          </div>`;
      }).join('');
  const dagilimHtml = `
    <div class="bd-section">
      <div class="bd-section-baslik">Kasa Dağılımı</div>
      ${dagilimIc}
    </div>`;

  // İşlemler
  const bugunIslemler = islemler
    .filter(i => i.tarih === today)
    .sort((a, b) => (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0));

  const islemlerIc = bugunIslemler.length === 0
    ? `<p style="font-size:13px;color:var(--text-secondary);padding:4px 0">Bugün işlem yok</p>`
    : bugunIslemler.map(islem => {
        const kasa     = kasalar.find(k => k.id === islem.kasaId);
        const kategori = kategoriler.find(k => k.id === islem.kategoriId);
        const cari     = islem.cariId ? cariler.find(c => c.id === islem.cariId) : null;
        let icon, title, tutarStr, tutarRenk;
        if (islem.tip === 'transfer') {
          const hedef = kasalar.find(k => k.id === islem.hedefKasaId);
          icon = '↔'; title = `${kasa?.ad || '?'} → ${hedef?.ad || '?'}`;
          tutarStr = `↔ ${formatTL(islem.tutar)}`; tutarRenk = 'var(--accent)';
        } else if (islem.cariEtkisi === 'borc_yaz' || islem.cariEtkisi === 'borc_cikar') {
          icon = '📋'; title = islem.aciklama || islemTipiEtiketi(islem) + (cari ? ` — ${cari.ad}` : '');
          tutarStr = formatTL(islem.tutar); tutarRenk = 'var(--warning)';
        } else if (islem.tip === 'gelir') {
          icon = kategori?.emoji || '▲'; title = islem.aciklama || kategori?.ad || 'Gelir';
          tutarStr = `+${formatTL(islem.tutar)}`; tutarRenk = 'var(--success)';
        } else {
          icon = kategori?.emoji || '▼'; title = islem.aciklama || kategori?.ad || 'Gider';
          tutarStr = `-${formatTL(islem.tutar)}`; tutarRenk = 'var(--danger)';
        }
        return `
          <div class="bd-islem-satir" data-islem-id="${islem.id}">
            <div class="bd-islem-icon">${icon}</div>
            <div class="bd-islem-body">
              <div class="bd-islem-title">${title}</div>
              <div class="bd-islem-sub">${kasa?.ad || (cari ? cari.ad : '—')}</div>
            </div>
            <div class="bd-islem-tutar" style="color:${tutarRenk}">${tutarStr}</div>
          </div>`;
      }).join('');
  const islemlerHtml = `
    <div class="bd-section">
      <div class="bd-section-baslik">İşlemler (${bugunIslemler.length})</div>
      ${islemlerIc}
    </div>`;

  // Modal
  const overlay = document.createElement('div');
  overlay.id = 'bd-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">📅 ${baslik}</span>
        <button class="modal-close" id="bdKapat">✕</button>
      </div>
      <div class="modal-body" style="padding:0">
        ${ozetHtml}${dagilimHtml}${islemlerHtml}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="bdKapatAlt" style="flex:1">Kapat</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.getElementById('bdKapat')?.addEventListener('click', close);
  document.getElementById('bdKapatAlt')?.addEventListener('click', close);

  document.querySelectorAll('.bd-islem-satir').forEach(row => {
    row.addEventListener('click', () => {
      const islem = getIslemler().find(i => i.id === row.dataset.islemId);
      if (islem) openIslemDetay(islem);
    });
  });
}

// ─── Yaklaşan ödemeler ────────────────────────────────────────

function yaklaşanOdemelerCard(cariler, vadeler, today) {
  const yaklaşanlar = vadeler
    .filter(v => v.vadeTarih && (v.durum === 'bekliyor' || !v.durum))
    .map(v => {
      const fark = gunFarki(v.vadeTarih, today);
      if (!isFinite(fark) || fark <= 0 || fark > 7) return null;
      const cari = cariler.find(c => c.id === v.cariId);
      if (!cari) return null;
      return { cari, vade: v, fark };
    })
    .filter(Boolean)
    .sort((a, b) => a.fark - b.fark);

  const inner = yaklaşanlar.length === 0
    ? `<p style="font-size:13px;color:var(--text-secondary);padding:8px 0">✓ Yaklaşan ödeme yok</p>`
    : yaklaşanlar.map(({ cari, vade, fark }) => {
        const renk = fark === 1 ? 'var(--danger)' : fark <= 3 ? 'var(--warning)' : 'var(--text-secondary)';
        return `
          <div class="dash-vade-row" data-cari-id="${cari.id}"
               style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer">
            <div>
              <div style="font-size:14px;font-weight:600">${cari.ad}</div>
              <div style="font-size:12px;color:${renk}">${fark} gün sonra · ${formatTarih(vade.vadeTarih)}</div>
            </div>
            <span style="font-size:14px;font-weight:700;color:var(--danger)">${formatTL(vade.tutar)}</span>
          </div>`;
      }).join('');

  return `
    <div class="section-header">
      <button class="section-title" id="dashCariBtn" style="background:none;border:none;font-weight:600;font-size:15px;color:var(--text-primary);cursor:pointer;padding:0;font-family:inherit">
        ⚠️ Yaklaşan Ödemeler (7 gün)
      </button>
      <a class="btn btn-secondary btn-sm" id="dashTumCariler">Tümü →</a>
    </div>
    <div class="card mb-3" style="padding:4px 16px">${inner}</div>`;
}

// ─── Son işlemler ─────────────────────────────────────────────

function recentList(islemler, kasalar, kategoriler, cariler, baslangic, bitis) {
  const aralik = islemler.filter(i => aralikIcindeMi(i.tarih, baslangic, bitis));
  const son5 = [...aralik]
    .sort((a, b) => (b.olusturmaTarihi || 0) - (a.olusturmaTarihi || 0))
    .slice(0, 5);

  if (!son5.length) {
    return '<p style="text-align:center;font-size:13px;color:var(--text-secondary);padding:12px 0">Bu dönemde işlem yok</p>';
  }
  return son5.map(islem => {
    const kasa     = kasalar.find(k => k.id === islem.kasaId);
    const kategori = kategoriler.find(k => k.id === islem.kategoriId);
    const cari     = islem.cariId ? cariler.find(c => c.id === islem.cariId) : null;
    const { tutar: tutarStr, renk: tutarRenk } = islemTutarFormati(islem);

    let iconContent, iconBg, iconColor, title;

    if (islem.tip === 'transfer') {
      const hedefKasa = kasalar.find(k => k.id === islem.hedefKasaId);
      iconContent = '↔';
      iconBg      = 'var(--bg-secondary)';
      iconColor   = 'var(--accent)';
      title       = `${kasa?.ad || '?'} → ${hedefKasa?.ad || '?'}`;
    } else if (islem.cariEtkisi === 'borc_yaz' || islem.cariEtkisi === 'borc_cikar') {
      const etiket = islemTipiEtiketi(islem);
      iconContent  = '📋';
      iconBg       = '#fff4e0';
      iconColor    = 'var(--warning)';
      title        = islem.aciklama || etiket + (cari ? ` — ${cari.ad}` : '');
    } else if (islem.cariEtkisi) {
      const etiket = islemTipiEtiketi(islem);
      iconContent  = kategori?.emoji || (islem.tip === 'gelir' ? '▲' : '▼');
      iconBg       = islem.tip === 'gelir' ? '#e8f4e8' : '#faeaea';
      iconColor    = islem.tip === 'gelir' ? 'var(--success)' : 'var(--danger)';
      title        = islem.aciklama || etiket + (cari ? ` — ${cari.ad}` : '');
    } else if (islem.tip === 'gelir') {
      iconContent  = kategori?.emoji || '▲';
      iconBg       = '#e8f4e8';
      iconColor    = 'var(--success)';
      title        = islem.aciklama || kategori?.ad || 'Gelir';
    } else {
      iconContent  = kategori?.emoji || '▼';
      iconBg       = '#faeaea';
      iconColor    = 'var(--danger)';
      title        = islem.aciklama || kategori?.ad || 'Gider';
    }

    return `
      <div class="list-item">
        <div class="list-item-icon" style="background:${iconBg};color:${iconColor};font-size:16px">
          ${iconContent}
        </div>
        <div class="list-item-body">
          <div class="list-item-title">${title}</div>
          <div class="list-item-subtitle">${formatTarih(islem.tarih)} · ${kasa?.ad || (islem.cariId ? 'Cari' : '?')}</div>
        </div>
        <div class="list-item-amount" style="color:${tutarRenk}">${tutarStr}</div>
      </div>`;
  }).join('');
}

// ─── Render ───────────────────────────────────────────────────

export default {
  render() {
    const islemler    = getIslemler();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const cariler     = getCariler();
    const vadeler     = getVadeler();
    const aralik      = getTarihAraligi();
    const today       = bugun();

    const { baslangic, bitis } = aralik;
    const [y, m]    = baslangic.split('-').map(Number);
    const ayAdi     = AYLAR[m - 1];
    const monthTitle = `${ayAdi} ${y}`;

    const { gelir: ayGelir, gider: ayGider, net: ayNet } = calcMetrics(islemler, baslangic, bitis);
    const toplamBakiye = kasalar.reduce((sum, k) => sum + hesaplaKasaBakiyesi(k.id, islemler), 0);

    return `
      <div class="month-selector">
        <button id="dashAyGeri">&#8249;</button>
        <button class="month-display-btn" id="dashAyBaslik">${monthTitle}</button>
        <button id="dashAySonraki">&#8250;</button>
      </div>

      <div class="metrics-grid">
        ${metricCard(`${ayAdi} Gelir`,  ayGelir,      'success')}
        ${metricCard(`${ayAdi} Gider`,  ayGider,      'danger')}
        ${metricCard(`${ayAdi} Net`,    ayNet,        ayNet        >= 0 ? 'success' : 'danger')}
        ${metricCard('Kasalar Bakiye', toplamBakiye, toplamBakiye >= 0 ? 'success' : 'danger')}
      </div>

      ${bugunOdeKarti(vadeler, cariler, today)}

      ${yaklaşanOdemelerCard(cariler, vadeler, today)}

      ${bugunBolumu(islemler, today)}

      ${kasalar.length ? `
        <div class="section-header">
          <span class="section-title">Kasalar</span>
          <a href="#ayarlar" class="btn btn-secondary btn-sm">Tümü →</a>
        </div>
        <div class="card mb-3" style="padding:4px 16px">
          ${kasalarList(kasalar, islemler)}
        </div>
      ` : ''}

      <div class="section-header">
        <span class="section-title">Son İşlemler</span>
        <a href="#islemler" class="btn btn-secondary btn-sm">Tümü →</a>
      </div>
      ${recentList(islemler, kasalar, kategoriler, cariler, baslangic, bitis)}

      <div class="section-header">
        <span class="section-title">Hızlı İşlem</span>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;padding-bottom:4px">
        <button class="btn btn-primary" id="dashIslemBtn" type="button">+ İşlem Ekle</button>
        <a href="#kasalar" class="btn btn-secondary">Kasalar</a>
        <a href="#kategoriler" class="btn btn-secondary">Kategoriler</a>
      </div>
    `;
  },

  afterRender() {
    const aralik = getTarihAraligi();

    document.getElementById('dashAyGeri')?.addEventListener('click', () => {
      setTarihAraligi(oncekiAy(getTarihAraligi().baslangic));
    });

    document.getElementById('dashAySonraki')?.addEventListener('click', () => {
      setTarihAraligi(sonrakiAy(getTarihAraligi().baslangic));
    });

    document.getElementById('dashAyBaslik')?.addEventListener('click', () => openAyOzet());

    ['dashBugunBaslik','dashBugunGelir','dashBugunGider','dashBugunNet'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => openBugunDetay());
    });

    document.querySelectorAll('.dash-kasa-satir').forEach(row => {
      row.addEventListener('click', () => openKasaDetay(row.dataset.kasaId));
    });

    document.getElementById('dashIslemBtn')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openIslemForm('gider');
    });

    document.getElementById('dashCariBtn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('defter:open-cariler'));
    });

    document.getElementById('dashTumCariler')?.addEventListener('click', e => {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('defter:open-cariler'));
    });

    document.querySelectorAll('.dash-vade-row').forEach(row => {
      row.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('defter:open-cari-detay', {
          detail: { cariId: row.dataset.cariId }
        }));
      });
    });

    document.querySelectorAll('.dash-bugun-ode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cari = getCariler().find(c => c.id === btn.dataset.cariId);
        const vade = getVadeler().find(v => v.id === btn.dataset.vadeId);
        if (cari && vade) openOdemeFormu(cari, vade);
      });
    });
  }
};
