import { pinKaydet, pinDogrula, pinSil } from '../utils.js';
import { show as showToast } from '../components/toast.js';

// ─── PIN Belirleme Modalı ──────────────────────────────────────

export function showPinKurmaModal(onTamamlandi) {
  if (document.getElementById('pinKurmaModal')) return;

  let adim = 1;
  let ilkPin = '';

  const modal = document.createElement('div');
  modal.id = 'pinKurmaModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = _modalHtml(1);
  document.body.appendChild(modal);
  _bindKurmaEvents(modal);

  function _modalHtml(adimNo) {
    return `
      <div class="modal-box" style="max-width:360px">
        <div class="modal-header">
          <span class="modal-title">${adimNo === 1 ? 'Yeni PIN Belirle' : 'PIN Tekrarı'}</span>
          <button class="modal-close" id="pkClose">✕</button>
        </div>
        <div class="modal-body" style="text-align:center;padding:24px 16px">
          <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px">
            ${adimNo === 1 ? '4 haneli PIN kodunuzu belirleyin' : 'PIN kodunuzu tekrar girin'}
          </p>
          <div class="pin-mini-dots" id="pkDots">
            <span class="pin-dot" id="pkd0"></span>
            <span class="pin-dot" id="pkd1"></span>
            <span class="pin-dot" id="pkd2"></span>
            <span class="pin-dot" id="pkd3"></span>
          </div>
          <div class="pin-hata" id="pkHata" style="margin-top:12px"></div>
          <div class="pin-numpad pin-numpad-modal" id="pkNumpad">
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
            <button class="pin-btn pin-btn-sil" id="pkSilBtn">⌫</button>
          </div>
        </div>
      </div>
    `;
  }

  function _bindKurmaEvents(m) {
    let buf = '';

    function updateDots() {
      for (let i = 0; i < 4; i++) {
        const d = document.getElementById(`pkd${i}`);
        if (d) d.classList.toggle('dolu', i < buf.length);
      }
    }

    function titret() {
      const dotsEl = document.getElementById('pkDots');
      dotsEl?.classList.add('titreme');
      setTimeout(() => dotsEl?.classList.remove('titreme'), 600);
    }

    function rakamEkle(r) {
      if (buf.length >= 4) return;
      buf += r;
      updateDots();
      if (buf.length === 4) {
        if (adim === 1) {
          ilkPin = buf;
          adim = 2;
          buf = '';
          m.innerHTML = _modalHtml(2);
          _bindKurmaEvents(m);
        } else {
          if (buf === ilkPin) {
            pinKaydet(buf).then(() => {
              m.remove();
              showToast('PIN belirlendi', 'success');
              onTamamlandi?.();
            });
          } else {
            titret();
            const hataEl = document.getElementById('pkHata');
            if (hataEl) { hataEl.textContent = "PIN'ler eşleşmiyor, tekrar deneyin"; hataEl.style.display = 'block'; }
            setTimeout(() => {
              buf = '';
              updateDots();
              if (hataEl) hataEl.style.display = 'none';
            }, 1000);
          }
        }
      }
    }

    m.querySelectorAll('.pin-btn[data-sayi]').forEach(btn => {
      btn.addEventListener('click', () => rakamEkle(btn.dataset.sayi));
    });
    document.getElementById('pkSilBtn')?.addEventListener('click', () => {
      buf = buf.slice(0, -1);
      updateDots();
    });
    document.getElementById('pkClose')?.addEventListener('click', () => m.remove());
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
  }
}

// ─── PIN Doğrulama Modalı (mevcut PIN kontrolü için) ──────────

export function showPinDogrulaModal(baslik, onDogrulandi) {
  if (document.getElementById('pinDogrulaModal')) return;
  let buf = '';

  const modal = document.createElement('div');
  modal.id = 'pinDogrulaModal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:360px">
      <div class="modal-header">
        <span class="modal-title">${baslik || 'PIN Doğrulama'}</span>
        <button class="modal-close" id="pdvClose">✕</button>
      </div>
      <div class="modal-body" style="text-align:center;padding:24px 16px">
        <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px">Mevcut PIN kodunuzu girin</p>
        <div class="pin-mini-dots" id="pdvDots">
          <span class="pin-dot" id="pdvd0"></span>
          <span class="pin-dot" id="pdvd1"></span>
          <span class="pin-dot" id="pdvd2"></span>
          <span class="pin-dot" id="pdvd3"></span>
        </div>
        <div class="pin-hata" id="pdvHata" style="margin-top:12px"></div>
        <div class="pin-numpad pin-numpad-modal" id="pdvNumpad">
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
          <button class="pin-btn pin-btn-sil" id="pdvSilBtn">⌫</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function updateDots() {
    for (let i = 0; i < 4; i++) {
      const d = document.getElementById(`pdvd${i}`);
      if (d) d.classList.toggle('dolu', i < buf.length);
    }
  }

  modal.querySelectorAll('.pin-btn[data-sayi]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (buf.length >= 4) return;
      buf += btn.dataset.sayi;
      updateDots();
      if (buf.length === 4) {
        const dogru = await pinDogrula(buf);
        if (dogru) {
          modal.remove();
          onDogrulandi?.();
        } else {
          const hataEl = document.getElementById('pdvHata');
          const dotsEl = document.getElementById('pdvDots');
          dotsEl?.classList.add('titreme');
          setTimeout(() => dotsEl?.classList.remove('titreme'), 600);
          if (hataEl) { hataEl.textContent = 'Yanlış PIN'; hataEl.style.display = 'block'; }
          setTimeout(() => {
            buf = '';
            updateDots();
            if (hataEl) hataEl.style.display = 'none';
          }, 800);
        }
      }
    });
  });

  document.getElementById('pdvSilBtn')?.addEventListener('click', () => {
    buf = buf.slice(0, -1);
    updateDots();
  });
  document.getElementById('pdvClose')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}
