import { loginUser, registerUser, sendPasswordReset, getFirebaseErrorMessage } from '../firebase-config.js';
import { show as showToast } from '../components/toast.js';

let _mode = 'login';

function html() {
  return `
    <div class="login-container">
      <div class="login-card">
        <div class="login-logo">
          <div class="login-logo-icon">📒</div>
          <div class="login-logo-title">Defter Pro</div>
          <div class="login-logo-sub">Gelir &amp; Gider Takibi</div>
        </div>

        <div class="login-toggle">
          <button class="login-tab${_mode === 'login' ? ' active' : ''}" id="tabGiris">Giriş</button>
          <button class="login-tab${_mode === 'register' ? ' active' : ''}" id="tabKayit">Kayıt</button>
        </div>

        <div class="login-error" id="authError" style="display:none"></div>

        ${_mode === 'login' ? loginFormHtml() : registerFormHtml()}
      </div>
    </div>
  `;
}

function loginFormHtml() {
  return `
    <form id="authForm" novalidate>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-control" id="fEmail" type="email" autocomplete="email"
               inputmode="email" placeholder="email@example.com" required>
      </div>
      <div class="form-group">
        <label class="form-label">Şifre</label>
        <input class="form-control" id="fPass" type="password"
               autocomplete="current-password" placeholder="••••••••" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block" id="btnSubmit">Giriş Yap</button>
      <div class="login-links">
        <button type="button" class="login-link" id="btnForgot">Şifremi Unuttum</button>
      </div>
    </form>
  `;
}

function registerFormHtml() {
  return `
    <form id="authForm" novalidate>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-control" id="fEmail" type="email" autocomplete="email"
               inputmode="email" placeholder="email@example.com" required>
      </div>
      <div class="form-group">
        <label class="form-label">Şifre</label>
        <input class="form-control" id="fPass" type="password"
               autocomplete="new-password" placeholder="En az 6 karakter" required minlength="6">
      </div>
      <div class="form-group">
        <label class="form-label">Şifre Tekrar</label>
        <input class="form-control" id="fPassConfirm" type="password"
               autocomplete="new-password" placeholder="Şifreyi tekrar girin" required>
      </div>
      <button type="submit" class="btn btn-primary btn-block" id="btnSubmit">Hesap Oluştur</button>
    </form>
  `;
}

function showError(msg) {
  const el = document.getElementById('authError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError() {
  const el = document.getElementById('authError');
  if (el) el.style.display = 'none';
}

function repaint() {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  appEl.innerHTML = html();
  bindEvents();
}

function bindEvents() {
  document.getElementById('tabGiris')?.addEventListener('click', () => { _mode = 'login'; repaint(); });
  document.getElementById('tabKayit')?.addEventListener('click', () => { _mode = 'register'; repaint(); });

  document.getElementById('authForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    clearError();
    const email = document.getElementById('fEmail')?.value?.trim();
    const pass  = document.getElementById('fPass')?.value;
    if (!email || !pass) { showError('Email ve şifre giriniz'); return; }

    const btn = document.getElementById('btnSubmit');
    btn.disabled = true;

    try {
      if (_mode === 'login') {
        await loginUser(email, pass);
      } else {
        const confirm = document.getElementById('fPassConfirm')?.value;
        if (pass !== confirm) { showError('Şifreler eşleşmiyor'); btn.disabled = false; return; }
        await registerUser(email, pass);
      }
      // onAuthStateChanged in app.js handles navigation after success
    } catch (err) {
      showError(getFirebaseErrorMessage(err));
      btn.disabled = false;
    }
  });

  document.getElementById('btnForgot')?.addEventListener('click', openResetModal);
}

function openResetModal() {
  if (document.getElementById('resetModal')) return;
  const modal = document.createElement('div');
  modal.id = 'resetModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">Şifre Sıfırlama</span>
        <button class="modal-close" id="resetClose">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">
          Kayıtlı email adresinize sıfırlama bağlantısı gönderilecek.
        </p>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Email</label>
          <input class="form-control" id="resetEmail" type="email" autocomplete="email"
                 placeholder="email@example.com">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="resetCancel">İptal</button>
        <button class="btn btn-primary" id="resetSend">Gönder</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('resetEmail')?.focus(), 80);

  const close = () => modal.remove();
  document.getElementById('resetClose')?.addEventListener('click', close);
  document.getElementById('resetCancel')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('resetSend')?.addEventListener('click', async () => {
    const email = document.getElementById('resetEmail')?.value?.trim();
    if (!email) return;
    const btn = document.getElementById('resetSend');
    btn.disabled = true;
    btn.textContent = '...';
    try {
      await sendPasswordReset(email);
      close();
      showToast('Email gönderildi, gelen kutusunu kontrol edin', 'success');
    } catch (err) {
      showToast(getFirebaseErrorMessage(err), 'error');
      btn.disabled = false;
      btn.textContent = 'Gönder';
    }
  });
}

export function show() { repaint(); }
