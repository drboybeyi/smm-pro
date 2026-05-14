import { getAyarlar, getKasalar, getKategoriler, getIslemler, getSabitGiderler } from '../state.js';
import { updateAyarlar, hesaplaKasaBakiyesi } from '../db.js';
import { formatTL, pinAktif, pinSil, autoLockSureGetir, autoLockSureKaydet } from '../utils.js';
import { auth, logoutUser } from '../firebase-config.js';
import { show as showToast } from '../components/toast.js';
import { showKasaModal } from './kasalar.js';
import { showKategoriModal } from './kategoriler.js';
import { showSabitGiderModal } from './sabitGiderler.js';
import { showPinKurmaModal, showPinDogrulaModal } from './pinKurma.js';

let _ayKatTab = 'gider';

function _guvenlikSection() {
  const aktif = pinAktif();
  const sure  = autoLockSureGetir();
  const sureler = [
    { v: 15,  l: '15 saniye' },
    { v: 30,  l: '30 saniye' },
    { v: 60,  l: '1 dakika' },
    { v: 300, l: '5 dakika' },
    { v: 600, l: '10 dakika' },
    { v: 0,   l: 'Kapalı' },
  ];
  const opts = sureler.map(s =>
    `<option value="${s.v}" ${sure === s.v ? 'selected' : ''}>${s.l}</option>`
  ).join('');

  return `
    <div class="card mb-3">
      <div style="font-weight:700;margin-bottom:12px;color:var(--accent)">🔒 Güvenlik</div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:14px;font-weight:600">PIN ile koruma</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">Ekran kilidi (email girişine ek)</div>
        </div>
        <label class="set-toggle">
          <input type="checkbox" id="pinToggle" ${aktif ? 'checked' : ''}>
          <span class="set-toggle-slider"></span>
        </label>
      </div>

      ${aktif ? `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:14px">Otomatik kilitlenme</span>
        <select class="form-control" id="autoLockSure" style="width:auto;max-width:140px">${opts}</select>
      </div>
      <div style="padding-top:10px">
        <button class="btn btn-secondary btn-block" id="btnPinDegistir">PIN'i Değiştir</button>
      </div>
      ` : ''}
    </div>
  `;
}

export default {
  render() {
    const a           = getAyarlar();
    const kasalar     = getKasalar();
    const kategoriler = getKategoriler();
    const islemler    = getIslemler();
    const email       = auth.currentUser?.email || '';
    const toplamBakiye = kasalar.reduce((sum, k) => sum + hesaplaKasaBakiyesi(k.id, islemler), 0);

    const gelirKatlar  = kategoriler.filter(k => k.tip === 'gelir');
    const giderKatlar  = kategoriler.filter(k => k.tip === 'gider');
    const sabitGiderler = getSabitGiderler();

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

      <!-- ─── Kasalar Yönetimi ─── -->
      <div class="card mb-3">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700;color:var(--accent)">💼 Kasalar</div>
          <button class="btn btn-primary btn-sm" id="btnAyYeniKasa">+ Yeni Kasa</button>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0 10px;border-bottom:1px solid var(--border);margin-bottom:8px">
          <span style="font-size:12px;color:var(--text-secondary)">Toplam Bakiye</span>
          <span style="font-size:16px;font-weight:700;color:${toplamBakiye >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatTL(toplamBakiye)}</span>
        </div>
        ${kasalar.length === 0
          ? `<p style="font-size:13px;color:var(--text-secondary)">Henüz kasa yok.</p>`
          : kasalar.map(k => {
              const b = hesaplaKasaBakiyesi(k.id, islemler);
              return `
                <div class="ay-kasalar-satir">
                  <span class="ay-kasalar-ad">${k.emoji} ${k.ad}</span>
                  <span class="ay-kasalar-bakiye ${b >= 0 ? 'income' : 'expense'}">${formatTL(b)}</span>
                  <button class="btn btn-secondary btn-sm ay-kasalar-edit" data-kasa-id="${k.id}" style="padding:4px 10px">✎</button>
                </div>`;
            }).join('')}
      </div>

      <!-- ─── Kategoriler Yönetimi ─── -->
      <div class="card mb-3">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:700;color:var(--accent)">🏷️ Kategoriler</div>
          <button class="btn btn-primary btn-sm" id="btnAyYeniKat">+ Yeni</button>
        </div>
        <div class="filter-tabs" id="ay-kat-tabs" style="margin-bottom:10px">
          <button class="filter-tab ${_ayKatTab === 'gider' ? 'active' : ''}" data-aytab="gider">▼ Gider</button>
          <button class="filter-tab ${_ayKatTab === 'gelir' ? 'active' : ''}" data-aytab="gelir">▲ Gelir</button>
        </div>
        <div id="ay-kat-list">
          ${((_ayKatTab === 'gider' ? giderKatlar : gelirKatlar).map(k => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:14px">${k.emoji} ${k.ad}</span>
              <button class="btn btn-secondary btn-sm ay-kat-edit" data-kat-id="${k.id}" style="padding:4px 10px">✎</button>
            </div>`).join('') || '<p style="font-size:13px;color:var(--text-secondary)">Bu tipte kategori yok.</p>')}
        </div>
      </div>

      <!-- ─── Sabit Giderler ─── -->
      <div class="card mb-3">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <div style="font-weight:700;color:var(--accent)">📋 Sabit Giderler</div>
          <button class="btn btn-primary btn-sm" id="btnAySgYeni">+ Yeni</button>
        </div>
        ${sabitGiderler.length === 0
          ? `<p style="font-size:13px;color:var(--text-secondary)">Henüz sabit gider yok. Kira, elektrik gibi aylık giderlerinizi ekleyin.</p>`
          : sabitGiderler.map(sg => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:14px;font-weight:600">${sg.emoji || '💸'} ${sg.ad}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${sg.varsayilanTutar ? formatTL(sg.varsayilanTutar) : '—'}${sg.odemeGunu ? ` · Ayın ${sg.odemeGunu}. günü` : ''}</div>
              </div>
              <button class="btn btn-secondary btn-sm ay-sg-edit" data-sg-id="${sg.id}" style="padding:4px 10px">✎</button>
            </div>`).join('')}
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
          <span style="font-size:14px;color:var(--text-secondary)">2.21</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px">Firebase</span>
          <span style="font-size:14px;color:var(--success)">Bağlı</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:14px">Depolama</span>
          <span style="font-size:14px;color:var(--text-secondary)">Firebase Realtime DB</span>
        </div>
        <div style="padding:10px 0 2px">
          <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;letter-spacing:0.4px">SON GÜNCELLEMELER</div>
          ${[
            ['2.21', 'PIN kilit + auto-lock + email kurtarma'],
            ['2.20', 'Vade renk skalası (yeşil → kırmızı)'],
            ['2.19', 'Cari arama + sıralama + Bana Borçlu Olanlar'],
            ['2.18', '✓ Ödendi manuel işaret'],
            ['2.17', 'Bu Ay Ödemelerim + Sabit Giderler + Cariler nav'],
            ['2.16', 'Maaş Öde Wizard'],
          ].map(([v, t]) => `
            <div style="display:flex;gap:10px;padding:4px 0;align-items:baseline">
              <span style="font-size:11px;font-weight:700;color:var(--accent);min-width:32px">v${v}</span>
              <span style="font-size:12px;color:var(--text-secondary)">${t}</span>
            </div>`).join('')}
        </div>
      </div>

      <!-- ─── Güvenlik (PIN) ─── -->
      ${_guvenlikSection()}

      <button class="btn btn-primary btn-block" id="btnAyarlarKaydet">Kaydet</button>
    `;
  },

  afterRender() {
    // ─── Kasalar Yönetimi ──────────────────────────────────────
    document.getElementById('btnAyYeniKasa')?.addEventListener('click', () => showKasaModal(null));

    // ─── Kategoriler Yönetimi ──────────────────────────────────
    document.getElementById('btnAyYeniKat')?.addEventListener('click', () =>
      showKategoriModal(null, _ayKatTab)
    );

    document.querySelectorAll('#ay-kat-tabs .filter-tab[data-aytab]').forEach(tab => {
      tab.addEventListener('click', () => {
        _ayKatTab = tab.dataset.aytab;
        document.querySelectorAll('#ay-kat-tabs .filter-tab').forEach(t =>
          t.classList.toggle('active', t.dataset.aytab === _ayKatTab)
        );
        const cats = getKategoriler().filter(k => k.tip === _ayKatTab);
        const listEl = document.getElementById('ay-kat-list');
        if (listEl) listEl.innerHTML = cats.length
          ? cats.map(k => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:14px">${k.emoji} ${k.ad}</span>
              <button class="btn btn-secondary btn-sm ay-kat-edit" data-kat-id="${k.id}" style="padding:4px 10px">✎</button>
            </div>`).join('')
          : '<p style="font-size:13px;color:var(--text-secondary)">Bu tipte kategori yok.</p>';
        attachKatEditHandlers();
      });
    });

    function attachKatEditHandlers() {
      document.querySelectorAll('.ay-kat-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const kat = getKategoriler().find(k => k.id === btn.dataset.katId);
          if (kat) showKategoriModal(kat, kat.tip);
        });
      });
    }
    attachKatEditHandlers();

    // ─── Sabit Giderler ────────────────────────────────────────
    document.getElementById('btnAySgYeni')?.addEventListener('click', () =>
      showSabitGiderModal(null, getKategoriler())
    );

    document.querySelectorAll('.ay-sg-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const sg = getSabitGiderler().find(s => s.id === btn.dataset.sgId);
        if (sg) showSabitGiderModal(sg, getKategoriler());
      });
    });

    document.querySelectorAll('.ay-kasalar-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const kasa = getKasalar().find(k => k.id === btn.dataset.kasaId);
        if (kasa) showKasaModal(kasa);
      });
    });

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

    // ─── PIN / Güvenlik ───────────────────────────────────────
    const pinToggle = document.getElementById('pinToggle');
    if (pinToggle) {
      pinToggle.addEventListener('change', () => {
        if (pinToggle.checked) {
          showPinKurmaModal(() => {
            window.defterNavigate?.('ayarlar');
          });
        } else {
          showPinDogrulaModal('PIN Kapatma', () => {
            pinSil();
            showToast('PIN devre dışı', 'success');
            window.defterNavigate?.('ayarlar');
          });
        }
        pinToggle.checked = pinAktif();
      });
    }

    document.getElementById('autoLockSure')?.addEventListener('change', e => {
      autoLockSureKaydet(parseInt(e.target.value));
    });

    document.getElementById('btnPinDegistir')?.addEventListener('click', () => {
      showPinDogrulaModal('Mevcut PIN', () => {
        showPinKurmaModal(() => {
          showToast('PIN güncellendi', 'success');
          window.defterNavigate?.('ayarlar');
        });
      });
    });

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
