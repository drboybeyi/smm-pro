import { pinDogrula, pinDenemeArttir, pinDenemeSifirla, pinDenemeGetir } from '../utils.js';
import { loginUser, getFirebaseErrorMessage } from '../firebase-config.js';
import { show as showToast } from '../components/toast.js';

let _overlay = null;
let _girisBuffer = '';
let _kilitliCallback = null;
let _bekliyor = false;

export function showPinKilit(onAcildi) {
  if (_overlay) return;
  _kilitliCallback = onAcildi || null;
  _girisBuffer = '';
  _bekliyor = false;

  _overlay = document.createElement('div');
  _overlay.id = 'pin-kilit-overlay';
  _overlay.className = 'pin-kilit-overlay';
  _overlay.innerHTML = _html();
  document.body.appendChild(_overlay);
  _bindEvents();
  _guncelleDotlar();
  _guncelleDenemeUyarisi();
}

export function hidePinKilit() {
  if (_overlay) {
    _overlay.remove();
    _overlay = null;
  }
  _girisBuffer = '';
  _bekliyor = false;
}

function _html() {
  return `
    <div class="pin-kilit-box">
      <div class="pin-kilit-logo">📓</div>
      <div class="pin-kilit-baslik">Defter Pro</div>
      <div class="pin-kilit-alt">PIN kodunuzu girin</div>

      <div class="pin-dots" id="pinDots">
        <span class="pin-dot" id="pd0"></span>
        <span class="pin-dot" id="pd1"></span>
        <span class="pin-dot" id="pd2"></span>
        <span class="pin-dot" id="pd3"></span>
      </div>

      <div class="pin-hata" id="pinHata"></div>

      <div class="pin-numpad" id="pinNumpad">
        <button class="pin-btn" data-sayi="1">1</button>
        <button class="pin-btn" data-sayi="2">2</button>
        <button class="pin-btn" data-sayi="3">3</button>
        <button class="pin-btn" data-sayi="4">4</button>
        <button class="pin-btn" data-sayi="5">5</button>
        <button class="pin-btn" data-sayi="6">6</button>
        <button class="pin-btn" data-sayi="7">7</button>
        <button class="pin-btn" data-sayi="8">8</button>
        <button class="pin-btn" data-sayi="9">9</button>
        <button class="pin-btn pin-btn-bos"></button>
        <button class="pin-btn" data-sayi="0">0</button>
        <button class="pin-btn pin-btn-sil" id="pinSilBtn">⌫</button>
      </div>

      <div class="pin-email-wrap" id="pinEmailWrap">
        <button class="pin-email-btn" id="pinEmailAc">Email ile aç</button>
      </div>
    </div>
  `;
}

function _bindEvents() {
  _overlay.querySelectorAll('.pin-btn[data-sayi]').forEach(btn => {
    btn.addEventListener('click', () => _rakamEkle(btn.dataset.sayi));
  });
  _overlay.querySelector('#pinSilBtn')?.addEventListener('click', _geriSil);
  _overlay.querySelector('#pinEmailAc')?.addEventListener('click', _emailIleAc);

  document.addEventListener('keydown', _klavyeHandler);
}

function _klavyeHandler(e) {
  if (!_overlay) { document.removeEventListener('keydown', _klavyeHandler); return; }
  if (e.key >= '0' && e.key <= '9') _rakamEkle(e.key);
  else if (e.key === 'Backspace') _geriSil();
}

function _rakamEkle(rakam) {
  if (_bekliyor || _girisBuffer.length >= 4) return;
  _girisBuffer += rakam;
  _guncelleDotlar();
  if (_girisBuffer.length === 4) _dogrula();
}

function _geriSil() {
  if (_bekliyor) return;
  _girisBuffer = _girisBuffer.slice(0, -1);
  _guncelleDotlar();
}

function _guncelleDotlar() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pd${i}`);
    if (dot) dot.classList.toggle('dolu', i < _girisBuffer.length);
  }
}

function _guncelleDenemeUyarisi() {
  const deneme = pinDenemeGetir();
  const hataEl = document.getElementById('pinHata');
  const emailBtn = document.getElementById('pinEmailAc');
  if (!hataEl || !emailBtn) return;

  if (deneme >= 3) {
    hataEl.textContent = `${deneme} hatalı deneme. Email ile devam edebilirsiniz.`;
    hataEl.style.display = 'block';
    emailBtn.classList.add('vurgulu');
  } else {
    hataEl.style.display = 'none';
    emailBtn.classList.remove('vurgulu');
  }
}

async function _dogrula() {
  _bekliyor = true;
  const dogru = await pinDogrula(_girisBuffer);

  if (dogru) {
    pinDenemeSifirla();
    document.removeEventListener('keydown', _klavyeHandler);
    hidePinKilit();
    _kilitliCallback?.();
  } else {
    const deneme = pinDenemeArttir();
    _titret();
    showToast('Yanlış PIN', 'error');

    setTimeout(() => {
      _girisBuffer = '';
      _bekliyor = false;
      _guncelleDotlar();
      _guncelleDenemeUyarisi();
    }, 800);
  }
}

function _titret() {
  const dots = document.getElementById('pinDots');
  if (!dots) return;
  dots.classList.add('titreme');
  setTimeout(() => dots.classList.remove('titreme'), 600);
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`pd${i}`);
    if (dot) dot.classList.add('yanlis');
    setTimeout(() => dot?.classList.remove('yanlis'), 600);
  }
}

function _emailIleAc() {
  if (document.getElementById('pinEmailModal')) return;
  const modal = document.createElement('div');
  modal.id = 'pinEmailModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:360px">
      <div class="modal-header">
        <span class="modal-title">Email ile Giriş</span>
        <button class="modal-close" id="pemClose">✕</button>
      </div>
      <div class="modal-body">
        <div class="login-error" id="pemHata" style="display:none"></div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-control" id="pemEmail" type="email" autocomplete="email"
                 inputmode="email" placeholder="email@example.com">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Şifre</label>
          <input class="form-control" id="pemPass" type="password"
                 autocomplete="current-password" placeholder="••••••••">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="pemIptal">İptal</button>
        <button class="btn btn-primary" id="pemGiris">Giriş Yap</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('pemEmail')?.focus(), 80);

  const close = () => modal.remove();
  document.getElementById('pemClose')?.addEventListener('click', close);
  document.getElementById('pemIptal')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  document.getElementById('pemGiris')?.addEventListener('click', async () => {
    const email = document.getElementById('pemEmail')?.value?.trim();
    const pass  = document.getElementById('pemPass')?.value;
    const hataEl = document.getElementById('pemHata');
    const btn    = document.getElementById('pemGiris');
    if (!email || !pass) {
      if (hataEl) { hataEl.textContent = 'Email ve şifre giriniz'; hataEl.style.display = 'block'; }
      return;
    }
    btn.disabled = true;
    btn.textContent = '...';
    try {
      await loginUser(email, pass);
      pinDenemeSifirla();
      close();
      document.removeEventListener('keydown', _klavyeHandler);
      hidePinKilit();
      _kilitliCallback?.();
      showToast('Giriş başarılı', 'success');
    } catch (err) {
      const msg = getFirebaseErrorMessage(err);
      if (hataEl) { hataEl.textContent = msg; hataEl.style.display = 'block'; }
      btn.disabled = false;
      btn.textContent = 'Giriş Yap';
    }
  });
}
