import { getTarihAraligi, setTarihAraligi } from '../state.js';
import { getTarihAraligiDegerleri } from '../utils.js';

const SECENEKLER = [
  { val: 'bugun',   label: '🗓️ Bugün' },
  { val: 'buHafta', label: '📊 Bu Hafta' },
  { val: 'buAy',    label: '📅 Bu Ay' },
  { val: 'gecenAy', label: '📆 Geçen Ay' },
  { val: 'buYil',   label: '🗂️ Bu Yıl' },
  { val: 'ozel',    label: '🎯 Özel' },
];

export function openTarihAraligi() {
  if (document.getElementById('ta-overlay')) return;

  const mevcut = getTarihAraligi();
  let seciliTip = mevcut.tip;

  const overlay = document.createElement('div');
  overlay.id = 'ta-overlay';
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '205';

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:380px">
      <div class="modal-header">
        <span class="modal-title">Tarih Aralığı Seç</span>
        <button class="modal-close" id="ta-close">✕</button>
      </div>
      <div class="modal-body" style="padding-bottom:8px">
        <div class="ta-secenekler">
          ${SECENEKLER.map(o => `
            <label class="ta-secenek${mevcut.tip === o.val ? ' ta-aktif' : ''}" data-val="${o.val}">
              <input type="radio" name="ta-tip" value="${o.val}" ${mevcut.tip === o.val ? 'checked' : ''} style="display:none">
              ${o.label}
            </label>`).join('')}
        </div>

        <div id="ta-ozel-wrap" style="${mevcut.tip === 'ozel' ? '' : 'display:none'}">
          <div class="form-group" style="margin-top:12px;margin-bottom:8px">
            <label class="form-label">Başlangıç <span class="req">*</span></label>
            <input class="form-control" type="date" id="ta-baslangic"
              value="${mevcut.tip === 'ozel' ? mevcut.baslangic : ''}">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Bitiş <span class="req">*</span></label>
            <input class="form-control" type="date" id="ta-bitis"
              value="${mevcut.tip === 'ozel' ? mevcut.bitis : ''}">
          </div>
        </div>
      </div>
      <div class="modal-footer" style="justify-content:space-between">
        <button class="btn btn-secondary" id="ta-sifirla">Sıfırla</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" id="ta-vazgec">Vazgeç</button>
          <button class="btn btn-primary" id="ta-uygula">Uygula</button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#ta-close')?.addEventListener('click', close);
  overlay.querySelector('#ta-vazgec')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelectorAll('.ta-secenek').forEach(el => {
    el.addEventListener('click', () => {
      seciliTip = el.dataset.val;
      overlay.querySelectorAll('.ta-secenek').forEach(e => e.classList.remove('ta-aktif'));
      el.classList.add('ta-aktif');
      el.querySelector('input').checked = true;
      overlay.querySelector('#ta-ozel-wrap').style.display = seciliTip === 'ozel' ? '' : 'none';
    });
  });

  overlay.querySelector('#ta-sifirla')?.addEventListener('click', () => {
    const def = getTarihAraligiDegerleri('buAy');
    setTarihAraligi({ tip: 'buAy', ...def });
    close();
  });

  overlay.querySelector('#ta-uygula')?.addEventListener('click', () => {
    if (seciliTip === 'ozel') {
      const bas = overlay.querySelector('#ta-baslangic').value;
      const bit = overlay.querySelector('#ta-bitis').value;
      if (!bas || !bit) {
        overlay.querySelector('#ta-baslangic').classList.toggle('error', !bas);
        overlay.querySelector('#ta-bitis').classList.toggle('error', !bit);
        return;
      }
      if (bit < bas) {
        overlay.querySelector('#ta-bitis').classList.add('error');
        return;
      }
      setTarihAraligi({ tip: 'ozel', baslangic: bas, bitis: bit });
    } else {
      const def = getTarihAraligiDegerleri(seciliTip);
      if (!def) return;
      setTarihAraligi({ tip: seciliTip, ...def });
    }
    close();
  });
}
