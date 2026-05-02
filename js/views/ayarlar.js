import { getAyarlar } from '../state.js';
import { updateAyarlar } from '../db.js';
import { auth, logoutUser } from '../firebase-config.js';

export default {
  render() {
    const a     = getAyarlar();
    const email = auth.currentUser?.email || '';

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
