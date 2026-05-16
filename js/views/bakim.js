import { getVadeler, getCariler } from '../state.js';
import { bulYetimVadeler, formatTL, formatTarih } from '../utils.js';
import { deleteVade } from '../db.js';
import { show as showToast } from '../components/toast.js';

export function renderBakimSection() {
  return `
    <div class="card mb-3">
      <div style="font-weight:700;margin-bottom:4px;color:var(--accent)">🧹 Bakım</div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.5">
        Artık var olmayan carilere bağlı vade kayıtlarını bul ve temizle.
      </p>
      <button class="btn btn-secondary btn-block" id="btnYetimBul">🔍 Yetim Vadeleri Bul</button>
    </div>`;
}

export function afterBakimSection() {
  document.getElementById('btnYetimBul')?.addEventListener('click', () => {
    const vadeler = getVadeler();
    const cariler = getCariler();
    const yetimler = bulYetimVadeler(vadeler, cariler);
    _openYetimModal(yetimler);
  });
}

function _openYetimModal(yetimler) {
  if (document.getElementById('yetimodal-overlay')) return;

  const bosIcerik = `
    <div style="text-align:center;padding:24px 0">
      <div style="font-size:32px;margin-bottom:12px">✓</div>
      <div style="font-size:15px;color:var(--text-primary);font-weight:600">Yetim vade bulunamadı</div>
      <div style="font-size:13px;color:var(--text-secondary);margin-top:6px">Tüm vadeleriniz düzgün carilere bağlı.</div>
    </div>`;

  const listIcerik = yetimler.length > 0 ? `
    <div style="display:flex;gap:8px;margin-bottom:12px">
      <button class="btn btn-secondary btn-sm" id="yetimodal-tumunu-sec">☑ Tümünü Seç</button>
      <button class="btn btn-secondary btn-sm" id="yetimodal-tumunu-kaldir">☐ Tümünü Kaldır</button>
    </div>
    <div id="yetimodal-liste">
      ${yetimler.map(v => `
        <label class="yetimodal-satir">
          <input type="checkbox" class="yetimodal-cb" data-vade-id="${v.id}" checked>
          <div class="yetimodal-satir-icerik">
            <div class="yetimodal-tarih">${formatTarih(v.vadeTarih) || '—'} ${v.tutar ? `· ${formatTL(v.tutar)}` : ''}</div>
            <div class="yetimodal-sebep">${v.sebep} · ID: ${(v.cariId || '').slice(0, 8)}…</div>
          </div>
        </label>`).join('')}
    </div>` : bosIcerik;

  const footer = yetimler.length > 0 ? `
    <button class="btn btn-secondary" id="yetimodal-vazgec">Vazgeç</button>
    <button class="btn btn-danger"    id="yetimodal-sil">Seçilenleri Sil →</button>` : `
    <button class="btn btn-primary"   id="yetimodal-tamam">Tamam</button>`;

  const overlay = document.createElement('div');
  overlay.id        = 'yetimodal-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:460px">
      <div class="modal-header">
        <span class="modal-title">🧹 Yetim Vade Önizleme</span>
        <button class="modal-close" id="yetimodal-kapat">✕</button>
      </div>
      <div class="modal-body">
        ${yetimler.length > 0
          ? `<p style="font-size:14px;margin-bottom:12px"><strong>${yetimler.length}</strong> yetim vade bulundu:</p>`
          : ''}
        ${listIcerik}
      </div>
      <div class="modal-footer">${footer}</div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => {
    overlay.classList.add('modal-closing');
    setTimeout(() => overlay.remove(), 220);
  };

  overlay.querySelector('#yetimodal-kapat')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#yetimodal-vazgec')?.addEventListener('click', close);
  overlay.querySelector('#yetimodal-tamam')?.addEventListener('click', close);

  overlay.querySelector('#yetimodal-tumunu-sec')?.addEventListener('click', () => {
    overlay.querySelectorAll('.yetimodal-cb').forEach(cb => { cb.checked = true; });
    _guncelSilBtn(overlay);
  });

  overlay.querySelector('#yetimodal-tumunu-kaldir')?.addEventListener('click', () => {
    overlay.querySelectorAll('.yetimodal-cb').forEach(cb => { cb.checked = false; });
    _guncelSilBtn(overlay);
  });

  overlay.querySelectorAll('.yetimodal-cb').forEach(cb => {
    cb.addEventListener('change', () => _guncelSilBtn(overlay));
  });

  const silBtn = overlay.querySelector('#yetimodal-sil');
  if (silBtn) {
    _guncelSilBtn(overlay);
    silBtn.addEventListener('click', async () => {
      const seciliIds = [...overlay.querySelectorAll('.yetimodal-cb:checked')]
        .map(cb => cb.dataset.vadeId);
      if (!seciliIds.length) return;
      if (!confirm(`${seciliIds.length} yetim vade silinecek. Bu işlem GERİ ALINAMAZ. Devam edilsin mi?`)) return;
      silBtn.disabled = true;
      silBtn.textContent = 'Siliniyor…';
      try {
        await Promise.all(seciliIds.map(id => deleteVade(id)));
        close();
        showToast(`${seciliIds.length} yetim vade temizlendi`, 'success');
      } catch (err) {
        showToast('Silme hatası: ' + (err.message || 'Hata'), 'error');
        silBtn.disabled = false;
        silBtn.textContent = 'Seçilenleri Sil →';
      }
    });
  }
}

function _guncelSilBtn(overlay) {
  const silBtn = overlay.querySelector('#yetimodal-sil');
  if (!silBtn) return;
  const secili = overlay.querySelectorAll('.yetimodal-cb:checked').length;
  silBtn.disabled = secili === 0;
  silBtn.textContent = secili > 0 ? `Seçilenleri Sil (${secili}) →` : 'Seçilenleri Sil →';
}
