import { getIslemler, getKasalar, getKategoriler, getCariler, getVadeler, getTarihAraligi, setTarihAraligi } from '../state.js';
import {
  formatTL, formatTarih, bugun, gunFarki,
  kasaTipiBul, formatTarihUzun, aralikIcindeMi, aralikBasligi,
  kasaAralikGelir, kasaAralikGider, aralikNetGelirGider,
  islemTipiEtiketi, islemTutarFormati, getTarihAraligiDegerleri
} from '../utils.js';
import { hesaplaKasaBakiyesi } from '../db.js';
import { openIslemForm } from '../components/islemForm.js';
import { openOdemeFormu } from './cariDetay.js';
import { openTarihAraligi } from './tarihAraligi.js';

// ─── Etiket haritası ──────────────────────────────────────────

const ARALIK_ETIKETI = {
  bugun:   'Bugün',
  buHafta: 'Bu Hafta',
  buAy:    'Bu Ay',
  gecenAy: 'Geçen Ay',
  buYil:   'Bu Yıl',
  ozel:    'Aralık',
};

function aralikEtiketi(tip) {
  return ARALIK_ETIKETI[tip] || 'Aralık';
}

// ─── Metrik hesaplama ─────────────────────────────────────────

function calcMetrics(islemler, baslangic, bitis) {
  const aralikIslemler = islemler.filter(i =>
    i.tarih && aralikIcindeMi(i.tarih, baslangic, bitis) &&
    i.kasaId && i.cariEtkisi !== 'borc_yaz' && i.cariEtkisi !== 'borc_cikar'
  );
  const ayGelir = aralikIslemler.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const ayGider = aralikIslemler.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  return { ayGelir, ayGider, ayNet: ayGelir - ayGider };
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
  return kasalar.map(k => {
    const bakiye = hesaplaKasaBakiyesi(k.id, islemler);
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:14px">${k.emoji} ${k.ad}</span>
        <span style="font-size:14px;font-weight:700;color:${bakiye >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatTL(bakiye)}</span>
      </div>`;
  }).join('');
}

// ─── Aralık Bölümü (eskiden bugunSection) ────────────────────

function aralikSection(islemler, kasalar, aralik) {
  const { tip, baslangic, bitis } = aralik;
  const nakitKasa = kasaTipiBul(kasalar, 'nakit');
  const kartKasa  = kasaTipiBul(kasalar, 'kart', 'kredi');

  const nakitGelir = nakitKasa != null ? kasaAralikGelir(nakitKasa.id, baslangic, bitis, islemler) : null;
  const kartGelir  = kartKasa  != null ? kasaAralikGelir(kartKasa.id,  baslangic, bitis, islemler) : null;
  const { gelir: toplamGelir, gider: toplamGider } = aralikNetGelirGider(baslangic, bitis, islemler);

  const nakitLabel = nakitKasa ? `${nakitKasa.emoji} ${nakitKasa.ad}` : '💵 Nakit';
  const kartLabel  = kartKasa  ? `${kartKasa.emoji} ${kartKasa.ad}`   : '💳 Kart';

  const baslik    = aralikEtiketi(tip);
  const altBaslik = tip === 'bugun' ? formatTarihUzun(bugun()) : aralikBasligi(baslangic, bitis, tip);

  function gelirKartHtml(label, value) {
    const bulunamadi = value === null;
    return `<div class="bugun-kart bugun-kart-gelir${bulunamadi ? ' bugun-kart-absent' : ''}">
      <div class="bugun-kart-label">${label}</div>
      <div class="bugun-kart-tutar" style="color:${bulunamadi ? 'var(--text-secondary)' : 'var(--success)'}">
        ${bulunamadi ? '—' : (value > 0 ? '+' : '') + formatTL(value)}
      </div>
    </div>`;
  }

  const giderRows = kasalar.map(k => {
    const g = kasaAralikGider(k.id, baslangic, bitis, islemler);
    if (!g) return '';
    return `<div class="bugun-diger-item">
      <span>${k.emoji} ${k.ad}</span>
      <span style="color:var(--danger);font-weight:600">-${formatTL(g)}</span>
    </div>`;
  }).filter(Boolean).join('');

  const giderColor = toplamGider > 0 ? 'var(--danger)' : 'var(--text-secondary)';
  const giderText  = toplamGider > 0 ? '-' + formatTL(toplamGider) : '0,00 TL';

  return `
    <div class="section-header">
      <span class="section-title">${baslik}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;color:var(--text-secondary)">${altBaslik}</span>
        <button class="btn btn-secondary btn-sm" id="dashAralikBtn" style="font-size:11px;padding:4px 8px">📅</button>
      </div>
    </div>

    <div class="bugun-gelir-grid">
      ${gelirKartHtml(nakitLabel, nakitGelir)}
      ${gelirKartHtml(kartLabel,  kartGelir)}
      <div class="bugun-kart bugun-kart-gelir bugun-kart-vurgulu">
        <div class="bugun-kart-label">📊 Toplam Gelir</div>
        <div class="bugun-kart-tutar" style="color:var(--success)">
          ${toplamGelir > 0 ? '+' : ''}${formatTL(toplamGelir)}
        </div>
      </div>
    </div>

    <div class="bugun-gider-kart">
      <div class="bugun-gider-header" id="bugun-gider-toggle">
        <div>
          <div class="bugun-kart-label">💸 Toplam Gider</div>
          <div class="bugun-kart-tutar" style="color:${giderColor}">${giderText}</div>
        </div>
        ${giderRows ? `<span class="bugun-gider-toggle-btn">▼ Detay</span>` : ''}
      </div>
      ${giderRows ? `
        <div class="bugun-gider-detay" id="bugun-gider-detay" style="display:none">
          ${giderRows}
        </div>
      ` : ''}
    </div>`;
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

// ─── Yaklaşan ödemeler ────────────────────────────────────────

function yaklaşanOdemelerCard(cariler, islemler, vadeler, today) {
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
    return '<p style="text-align:center;font-size:13px;color:var(--text-secondary);padding:12px 0">Bu aralıkta işlem yok</p>';
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

    const { tip, baslangic, bitis } = aralik;
    const { ayGelir, ayGider, ayNet } = calcMetrics(islemler, baslangic, bitis);
    const toplamBakiye = kasalar.reduce((sum, k) => sum + hesaplaKasaBakiyesi(k.id, islemler), 0);
    const etiket       = aralikEtiketi(tip);

    const infoCubugu = tip !== 'buAy' ? `
      <div class="aralik-info-cubugu">
        <span>📅 ${aralikBasligi(baslangic, bitis, tip)}</span>
        <button class="aralik-sifirla-btn" id="dashAralikSifirla" title="Bu Aya dön">×</button>
      </div>` : '';

    return `
      ${infoCubugu}

      ${bugunOdeKarti(vadeler, cariler, today)}

      <div class="metrics-grid">
        ${metricCard(`${etiket} Gelir`,  ayGelir,      'success')}
        ${metricCard(`${etiket} Gider`,  ayGider,      'danger')}
        ${metricCard(`${etiket} Net`,    ayNet,        ayNet        >= 0 ? 'success' : 'danger')}
        ${metricCard('Kasalar Bakiye',   toplamBakiye, toplamBakiye >= 0 ? 'success' : 'danger')}
      </div>

      ${aralikSection(islemler, kasalar, aralik)}

      ${kasalar.length ? `
        <div class="section-header">
          <span class="section-title">Kasalar</span>
          <a href="#kasalar" class="btn btn-secondary btn-sm">Tümü →</a>
        </div>
        <div class="card mb-3" style="padding:4px 16px">
          ${kasalarList(kasalar, islemler)}
        </div>
      ` : ''}

      ${yaklaşanOdemelerCard(cariler, islemler, vadeler, today)}

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
        const cariId = btn.dataset.cariId;
        const vadeId = btn.dataset.vadeId;
        const cari   = getCariler().find(c => c.id === cariId);
        const vade   = getVadeler().find(v => v.id === vadeId);
        if (cari && vade) openOdemeFormu(cari, vade);
      });
    });

    document.getElementById('dashAralikBtn')?.addEventListener('click', () => openTarihAraligi());

    document.getElementById('dashAralikSifirla')?.addEventListener('click', () => {
      const def = getTarihAraligiDegerleri('buAy');
      setTarihAraligi({ tip: 'buAy', ...def });
    });

    document.getElementById('bugun-gider-toggle')?.addEventListener('click', () => {
      const detay = document.getElementById('bugun-gider-detay');
      const btn   = document.querySelector('.bugun-gider-toggle-btn');
      if (!detay) return;
      const open = detay.style.display !== 'none';
      detay.style.display = open ? 'none' : 'block';
      if (btn) btn.textContent = open ? '▼ Detay' : '▲ Kapat';
    });
  }
};
