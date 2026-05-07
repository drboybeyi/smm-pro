import { getIslemler, getKasalar, getKategoriler, getTarihAraligi } from '../state.js';
import { formatTL, aralikIcindeMi, ayKasaOzeti } from '../utils.js';

const AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
               'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

function topKategoriler(islemler, kategoriler, baslangic, bitis, tip, count = 3) {
  const katMap = {};
  islemler
    .filter(i =>
      aralikIcindeMi(i.tarih, baslangic, bitis) &&
      i.tip === tip &&
      i.kategoriId &&
      i.cariEtkisi !== 'borc_yaz' &&
      i.cariEtkisi !== 'borc_cikar'
    )
    .forEach(i => {
      katMap[i.kategoriId] = (katMap[i.kategoriId] || 0) + (i.tutar || 0);
    });
  return Object.entries(katMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([katId, toplam]) => ({ kat: kategoriler.find(k => k.id === katId), toplam }))
    .filter(x => x.kat);
}

export function openAyOzet() {
  if (document.getElementById('ay-ozet-overlay')) return;

  const islemler    = getIslemler();
  const kasalar     = getKasalar();
  const kategoriler = getKategoriler();
  const aralik      = getTarihAraligi();
  const { baslangic, bitis } = aralik;

  const [y, m] = baslangic.split('-').map(Number);
  const ayAdi  = AYLAR[m - 1];

  // Toplam gelir/gider
  const aralikIslemler = islemler.filter(i =>
    aralikIcindeMi(i.tarih, baslangic, bitis) &&
    i.kasaId &&
    i.cariEtkisi !== 'borc_yaz' &&
    i.cariEtkisi !== 'borc_cikar'
  );
  const toplamGelir = aralikIslemler.filter(i => i.tip === 'gelir').reduce((s, i) => s + (i.tutar || 0), 0);
  const toplamGider = aralikIslemler.filter(i => i.tip === 'gider').reduce((s, i) => s + (i.tutar || 0), 0);
  const toplamNet   = toplamGelir - toplamGider;

  const netRenk = toplamNet >= 0 ? 'var(--success)' : 'var(--danger)';
  const netSign = toplamNet >= 0 ? '+' : '';

  // Kasa özeti
  const kasaOzeti = ayKasaOzeti(islemler, kasalar, baslangic, bitis);

  const kasaHtml = kasaOzeti.length
    ? kasaOzeti.map(({ ad, emoji, gelir, gider, net }) => {
        const nRenk = net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--text-secondary)';
        const nSign = net > 0 ? '+' : '';
        return `
          <div class="ay-ozet-kasa-satir">
            <span class="ay-ozet-kasa-ad">${emoji} ${ad}</span>
            <span class="ay-ozet-kasa-detay">
              ${gelir > 0 ? `<span style="color:var(--success)">+${formatTL(gelir)}</span>` : ''}
              ${gelir > 0 && gider > 0 ? `<span style="color:var(--text-secondary)"> / </span>` : ''}
              ${gider > 0 ? `<span style="color:var(--danger)">-${formatTL(gider)}</span>` : ''}
            </span>
            <span class="ay-ozet-kasa-net" style="color:${nRenk}">${nSign}${formatTL(net)}</span>
          </div>`;
      }).join('')
    : `<p style="font-size:13px;color:var(--text-secondary);padding:8px 0">Bu dönemde kasa hareketi yok</p>`;

  // Kategori özeti
  const topGider = topKategoriler(islemler, kategoriler, baslangic, bitis, 'gider');
  const topGelir = topKategoriler(islemler, kategoriler, baslangic, bitis, 'gelir');

  const giderKatHtml = topGider.map(({ kat, toplam }) =>
    `<div class="ay-ozet-kat-satir">
      <span>${kat.emoji} ${kat.ad}</span>
      <span style="color:var(--danger);font-weight:600">-${formatTL(toplam)}</span>
    </div>`).join('');

  const gelirKatHtml = topGelir.map(({ kat, toplam }) =>
    `<div class="ay-ozet-kat-satir">
      <span>${kat.emoji} ${kat.ad}</span>
      <span style="color:var(--success);font-weight:600">+${formatTL(toplam)}</span>
    </div>`).join('');

  const katBolumu = (giderKatHtml || gelirKatHtml) ? `
    <hr style="margin:14px 0;border:none;border-top:1px solid var(--border)">
    <div class="ay-ozet-bolum-baslik">📂 Kategori Özeti</div>
    ${gelirKatHtml ? `<div class="ay-ozet-kat-grup-baslik" style="color:var(--success)">En çok gelir</div>${gelirKatHtml}` : ''}
    ${giderKatHtml ? `<div class="ay-ozet-kat-grup-baslik" style="color:var(--danger)">En çok gider</div>${giderKatHtml}` : ''}` : '';

  const overlay = document.createElement('div');
  overlay.id = 'ay-ozet-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '205';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">📊 ${ayAdi} ${y}</span>
        <button class="modal-close" id="ay-ozet-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="ay-ozet-toplam-grid">
          <div class="ay-ozet-toplam-item">
            <div class="ay-ozet-toplam-label">Gelir</div>
            <div class="ay-ozet-toplam-deger" style="color:var(--success)">+${formatTL(toplamGelir)}</div>
          </div>
          <div class="ay-ozet-toplam-item">
            <div class="ay-ozet-toplam-label">Gider</div>
            <div class="ay-ozet-toplam-deger" style="color:var(--danger)">-${formatTL(toplamGider)}</div>
          </div>
          <div class="ay-ozet-toplam-item ay-ozet-net-satir">
            <div class="ay-ozet-toplam-label">Net</div>
            <div class="ay-ozet-toplam-deger" style="color:${netRenk};font-size:22px;font-weight:800">${netSign}${formatTL(toplamNet)}</div>
          </div>
        </div>

        <hr style="margin:14px 0;border:none;border-top:1px solid var(--border)">

        <div class="ay-ozet-bolum-baslik">💰 Kasa Hareketleri</div>
        <div class="ay-ozet-kasa-listesi">${kasaHtml}</div>

        ${katBolumu}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="ay-ozet-kapat" style="width:100%">Kapat</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#ay-ozet-close')?.addEventListener('click', close);
  overlay.querySelector('#ay-ozet-kapat')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}
