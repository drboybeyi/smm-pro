import { getAyarlar, getKasalar, getKategoriler } from '../state.js';
import { updateAyarlar } from '../db.js';
import { auth, logoutUser } from '../firebase-config.js';

export default {
  render() {
    const a           = getAyarlar();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const email       = auth.currentUser?.email || '';

    const gelirKatlar = kategoriler.filter(k => k.tip === 'gelir');
    const giderKatlar = kategoriler.filter(k => k.tip === 'gider');

    const fv             = a.formVarsayilanlari || {};
    const fvTip          = fv.tip || 'gider';
    const fvKasaId       = fv.kasaId || '';
    const fvGelirKatId   = fv.gelirKategoriId || '';
    const fvGiderKatId   = fv.giderKategoriId || '';
    const sonHatirla     = fv.sonIslemiHatirla !== false;

    const kasaOpts = kasalar.map(k =>
      `<option value="${k.id}" ${fvKasaId === k.id ? 'selected' : ''}>${k.emoji} ${k.ad}</option>`
    ).join('');

    const gelirKatOpts = gelirKatlar.map(k =>
      `<option value="${k.id}" ${fvGelirKatId === k.id ? 'selected' : ''}>${k.emoji} ${k.ad}</option>`
    ).join('');

    const giderKatOpts = giderKatlar.map(k =>
      `<option value="${k.id}" ${fvGiderKatId === k.id ? 'selected' : ''}>${k.emoji} ${k.ad}</option>`
    ).join('');

    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Ayarlar</span>
      </div>

      <div class="card mb-3">
        <div style="font-weight:700;margin-bottom:14px;color:var(--accent)">Profil</div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">İsim</label>
          <input class="form-control" id="set-isim" type="text"
            value="${a.kullaniciAdi || ''}" placeholder="Adınız Soyadınız">
        </div>
      </div>

      <div class="card mb-3">
        <div style="font-weight:700;margin-bottom:12px;color:var(--accent)">Hesap</div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;margin-bottom:14px;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;color:var(--text-secondary)">Giriş yapılan email</span>
          <span style="font-size:13px;font-weight:600;color:var(--text-primary);word-break:break-all;text-align:right;margin-left:8px">${email}</span>
        </div>
        <button class="btn btn-danger btn-block" id="btnCikis">Çıkış Yap</button>
      </div>

      <!-- ─── Dashboard Bugün Kartları ─── -->
      <div class="card mb-3">
        <div style="font-weight:700;margin-bottom:4px;color:var(--accent)">📊 Dashboard Bugün Kartları</div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5">
          Bugün bölümünde gösterilecek kasaları seçin — en fazla 3 kasa (Toplam sabit).
        </p>
        <div id="bugun-kartlar-liste"></div>
      </div>

      <!-- ─── Form Varsayılanları ─── -->
      <div class="card mb-3">
        <div style="font-weight:700;margin-bottom:12px;color:var(--accent)">📝 İşlem Formu Varsayılanları</div>

        <div class="form-group">
          <label class="form-label" style="font-size:13px">Varsayılan Tip</label>
          <div class="btn-group">
            <button type="button" class="btn-option fv-tip-btn ${fvTip === 'gelir'    ? 'active' : ''}" data-val="gelir">▲ Gelir</button>
            <button type="button" class="btn-option fv-tip-btn ${fvTip === 'gider'    ? 'active' : ''}" data-val="gider">▼ Gider</button>
            <button type="button" class="btn-option fv-tip-btn ${fvTip === 'transfer' ? 'active' : ''}" data-val="transfer">↔ Transfer</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size:13px">Varsayılan Kasa</label>
          <select class="form-control" id="fv-kasa">
            <option value="">Otomatik (ilk kasa)</option>
            ${kasaOpts}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" style="font-size:13px">Varsayılan Kategori (Gelir)</label>
          <select class="form-control" id="fv-gelir-kat">
            <option value="">Seçme</option>
            ${gelirKatOpts}
          </select>
        </div>

        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label" style="font-size:13px">Varsayılan Kategori (Gider)</label>
          <select class="form-control" id="fv-gider-kat">
            <option value="">Seçme</option>
            ${giderKatOpts}
          </select>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0">
          <div>
            <div style="font-size:14px;font-weight:600">Son işlemi hatırla</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Form son kaydın kasa ve kategorisiyle açılır</div>
          </div>
          <label class="set-toggle">
            <input type="checkbox" id="fv-hatirla" ${sonHatirla ? 'checked' : ''}>
            <span class="set-toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="card mb-4">
        <div style="font-weight:700;margin-bottom:12px;color:var(--accent)">Uygulama</div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px">Versiyon</span>
          <span style="font-size:14px;color:var(--text-secondary)">1.0.0</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px">Firebase</span>
          <span style="font-size:14px;color:var(--success)">Bağlı</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0">
          <span style="font-size:14px">Depolama</span>
          <span style="font-size:14px;color:var(--text-secondary)">Firebase Realtime DB</span>
        </div>
      </div>

      <button class="btn btn-primary btn-block" id="btnAyarlarKaydet">Kaydet</button>
    `;
  },

  afterRender() {
    // ─── Profil Kaydet ─────────────────────────────────────────
    document.getElementById('btnAyarlarKaydet')?.addEventListener('click', async () => {
      await updateAyarlar({
        kullaniciAdi: document.getElementById('set-isim')?.value?.trim() || ''
      });
      const btn = document.getElementById('btnAyarlarKaydet');
      if (btn) {
        btn.textContent = '✓ Kaydedildi';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = 'Kaydet'; btn.disabled = false; }, 1800);
      }
    });

    document.getElementById('btnCikis')?.addEventListener('click', () => showLogoutConfirm());

    // ─── Bugün Kartları ────────────────────────────────────────
    const kasalar = getKasalar();
    const ayarlar = getAyarlar();

    const bkRaw = ayarlar.bugunKartlari;
    let kartlari = (bkRaw && bkRaw.length > 0)
      ? [...bkRaw]
          .sort((a, b) => a.sira - b.sira)
          .filter(item => kasalar.find(k => k.id === item.kasaId))
      : kasalar.slice(0, 3).map((k, i) => ({ kasaId: k.id, sira: i }));

    function saveKartlari() {
      const normalized = kartlari.map((k, i) => ({ kasaId: k.kasaId, sira: i }));
      updateAyarlar({ bugunKartlari: normalized }).catch(console.error);
    }

    function renderKartlariListe() {
      const container = document.getElementById('bugun-kartlar-liste');
      if (!container) return;

      const selectedIds = kartlari.map(k => k.kasaId);

      container.innerHTML = kasalar.map(k => {
        const idx     = selectedIds.indexOf(k.id);
        const secili  = idx !== -1;
        const disableAdd    = !secili && kartlari.length >= 3;
        const disableKaldir = secili && kartlari.length <= 1;

        return `<div class="ayar-kasa-satir">
          <div class="ayar-kasa-bilgi">
            <span style="font-size:18px;line-height:1">${k.emoji}</span>
            <span style="font-size:14px;font-weight:600">${k.ad}</span>
            ${secili
              ? `<span class="vade-rozet vade-rozet-odendi">${idx + 1}. sıra</span>`
              : `<span class="vade-rozet vade-rozet-iptal">Kapalı</span>`}
          </div>
          <div class="ayar-kasa-aksiyonlar">
            ${secili ? `
              <button class="btn btn-sm btn-secondary" data-kasa-id="${k.id}" data-aksiyon="yukari"
                ${idx === 0 ? 'disabled' : ''} title="Yukarı">▲</button>
              <button class="btn btn-sm btn-secondary" data-kasa-id="${k.id}" data-aksiyon="asagi"
                ${idx === kartlari.length - 1 ? 'disabled' : ''} title="Aşağı">▼</button>
              <button class="btn btn-sm" style="background:#faeaea;color:var(--danger);border:1px solid #e8c0c0;min-width:36px"
                data-kasa-id="${k.id}" data-aksiyon="kaldir"
                ${disableKaldir ? 'disabled' : ''} title="Kaldır">✕</button>
            ` : `
              <button class="btn btn-sm btn-primary" data-kasa-id="${k.id}" data-aksiyon="ekle"
                ${disableAdd ? 'disabled' : ''}>Ekle</button>
            `}
          </div>
        </div>`;
      }).join('');

      container.querySelectorAll('[data-aksiyon]').forEach(btn => {
        btn.addEventListener('click', () => {
          const kasaId  = btn.dataset.kasaId;
          const aksiyon = btn.dataset.aksiyon;

          if (aksiyon === 'ekle') {
            if (kartlari.length >= 3) return;
            kartlari = [...kartlari, { kasaId, sira: kartlari.length }];

          } else if (aksiyon === 'kaldir') {
            if (kartlari.length <= 1) return;
            kartlari = kartlari.filter(k => k.kasaId !== kasaId);

          } else if (aksiyon === 'yukari') {
            const idx = kartlari.findIndex(k => k.kasaId === kasaId);
            if (idx > 0) {
              kartlari = [...kartlari];
              [kartlari[idx - 1], kartlari[idx]] = [kartlari[idx], kartlari[idx - 1]];
            }

          } else if (aksiyon === 'asagi') {
            const idx = kartlari.findIndex(k => k.kasaId === kasaId);
            if (idx !== -1 && idx < kartlari.length - 1) {
              kartlari = [...kartlari];
              [kartlari[idx], kartlari[idx + 1]] = [kartlari[idx + 1], kartlari[idx]];
            }
          }

          kartlari = kartlari.map((k, i) => ({ kasaId: k.kasaId, sira: i }));
          saveKartlari();
          renderKartlariListe();
        });
      });
    }

    renderKartlariListe();

    // ─── Form Varsayılanları ───────────────────────────────────
    function saveFV() {
      const tip = document.querySelector('.fv-tip-btn.active')?.dataset.val || 'gider';
      updateAyarlar({
        formVarsayilanlari: {
          tip,
          kasaId:           document.getElementById('fv-kasa')?.value       || '',
          gelirKategoriId:  document.getElementById('fv-gelir-kat')?.value  || '',
          giderKategoriId:  document.getElementById('fv-gider-kat')?.value  || '',
          sonIslemiHatirla: document.getElementById('fv-hatirla')?.checked  !== false,
        }
      }).catch(console.error);
    }

    document.querySelectorAll('.fv-tip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fv-tip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveFV();
      });
    });

    ['fv-kasa', 'fv-gelir-kat', 'fv-gider-kat'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', saveFV);
    });

    document.getElementById('fv-hatirla')?.addEventListener('change', saveFV);
  }
};

function showLogoutConfirm() {
  if (document.getElementById('logoutModal')) return;
  const modal = document.createElement('div');
  modal.id = 'logoutModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <div class="modal-header">
        <span class="modal-title">Çıkış Yap</span>
        <button class="modal-close" id="logoutClose">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:15px;color:var(--text-primary);line-height:1.5">
          Çıkış yapmak istediğinizden emin misiniz?
        </p>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="logoutCancel">İptal</button>
        <button class="btn btn-danger" id="logoutConfirmBtn">Çıkış Yap</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('logoutClose')?.addEventListener('click', close);
  document.getElementById('logoutCancel')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('logoutConfirmBtn')?.addEventListener('click', async () => {
    close();
    await logoutUser();
  });
}
