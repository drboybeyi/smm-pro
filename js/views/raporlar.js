export default {
  render() {
    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Raporlar</span>
      </div>

      <div class="warning-banner">
        ⚠️ Raporlar tahmini değerler içerir. Mali müşavirinizle doğrulayınız.
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">

        <div class="card" style="opacity:0.55;pointer-events:none">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">📄</span>
            <div>
              <div style="font-weight:700;margin-bottom:2px">Aylık SMM Defteri</div>
              <div style="font-size:13px;color:var(--text-secondary)">Excel + PDF — Serbest meslek makbuzu listesi</div>
            </div>
          </div>
        </div>

        <div class="card" style="opacity:0.55;pointer-events:none">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">🧾</span>
            <div>
              <div style="font-weight:700;margin-bottom:2px">KDV Beyan Hazırlık</div>
              <div style="font-size:13px;color:var(--text-secondary)">Muaf / %10 ayrıştırması, indirilecek KDV</div>
            </div>
          </div>
        </div>

        <div class="card" style="opacity:0.55;pointer-events:none">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">📊</span>
            <div>
              <div style="font-weight:700;margin-bottom:2px">Aylık Gelir-Gider Özeti</div>
              <div style="font-size:13px;color:var(--text-secondary)">Net kar, kategori bazlı gider dağılımı</div>
            </div>
          </div>
        </div>

        <div class="card" style="opacity:0.55;pointer-events:none">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:28px">📈</span>
            <div>
              <div style="font-weight:700;margin-bottom:2px">Yıllık Özet</div>
              <div style="font-size:13px;color:var(--text-secondary)">Gelir vergisi tahmini, kümülatif tablolar</div>
            </div>
          </div>
        </div>

      </div>

      <div class="placeholder-view" style="padding:32px 0 0">
        <div style="font-size:14px;color:var(--text-secondary)">Bu ekran bir sonraki aşamada gelecek.</div>
      </div>
    `;
  }
};
