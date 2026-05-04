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

      <!-- ─── Dashboard Bugün Kartları (Devre Dışı) ─── -->
      <div class="card mb-3" style="opacity:0.5;pointer-events:none">
        <div style="font-weight:700;margin-bottom:4px;color:var(--accent)">📊 Dashboard Bugün Kartları <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">(Devre Dışı)</span></div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:0;line-height:1.5">
          Bugün bölümü artık otomatik olarak Nakit ve Kart kasalarını gösteriyor.
        </p>
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
