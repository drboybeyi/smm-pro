import { getKategoriler } from '../state.js';
import { addKategori, updateKategori } from '../db.js';
import { show as showToast } from '../components/toast.js';

let currentTab = 'gider';

function kategoriItem(k) {
  return `
    <div class="list-item">
      <div class="list-item-icon" style="background:var(--bg-secondary);font-size:22px">${k.emoji}</div>
      <div class="list-item-body">
        <div class="list-item-title">${k.ad}</div>
      </div>
      <button class="btn btn-secondary btn-sm" style="min-height:32px;padding:4px 10px"
        data-kat-id="${k.id}">✎</button>
    </div>`;
}

function renderList(kategoriler) {
  const filtered = kategoriler.filter(k => k.tip === currentTab);
  return filtered.length === 0
    ? `<div class="placeholder-view"><div class="placeholder-icon">🏷️</div><div class="placeholder-text">Bu tipte kategori yok.</div></div>`
    : filtered.map(kategoriItem).join('');
}

export default {
  render() {
    return `
      <div class="section-header" style="margin-top:0">
        <span class="section-title">Kategoriler</span>
        <button class="btn btn-primary btn-sm" id="btnYeniKat">+ Yeni</button>
      </div>

      <div class="filter-tabs">
        <button class="filter-tab ${currentTab === 'gider' ? 'active' : ''}" data-tab="gider">▼ Gider</button>
        <button class="filter-tab ${currentTab === 'gelir' ? 'active' : ''}" data-tab="gelir">▲ Gelir</button>
      </div>

      <div id="kat-list">${renderList(getKategoriler())}</div>
    `;
  },

  afterRender() {
    document.getElementById('btnYeniKat')?.addEventListener('click', () =>
      showKategoriModal(null, currentTab)
    );

    document.querySelectorAll('.filter-tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        document.querySelectorAll('.filter-tab[data-tab]').forEach(t =>
          t.classList.toggle('active', t.dataset.tab === currentTab)
        );
        document.getElementById('kat-list').innerHTML = renderList(getKategoriler());
        attachEditHandlers();
      });
    });

    attachEditHandlers();

    function attachEditHandlers() {
      document.querySelectorAll('[data-kat-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const kat = getKategoriler().find(k => k.id === btn.dataset.katId);
          if (kat) showKategoriModal(kat, kat.tip);
        });
      });
    }
  }
};

function showKategoriModal(kat, defaultTip) {
  const isEdit = kat !== null;
  if (document.getElementById('kat-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'kat-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <span class="modal-title">${isEdit ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</span>
        <button class="modal-close" id="katm-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Emoji</label>
          <input class="form-control" id="katm-emoji" type="text" maxlength="2"
            value="${kat?.emoji || '🏷️'}" placeholder="🏷️">
        </div>
        <div class="form-group">
          <label class="form-label">Kategori Adı <span class="req">*</span></label>
          <input class="form-control" id="katm-ad" type="text" maxlength="50"
            value="${kat?.ad || ''}" placeholder="Kategori adı...">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Tip <span class="req">*</span></label>
          <div class="btn-group">
            <button type="button" class="btn-option katm-tip ${(kat?.tip || defaultTip) === 'gider' ? 'active' : ''}" data-val="gider">▼ Gider</button>
            <button type="button" class="btn-option katm-tip ${(kat?.tip || defaultTip) === 'gelir' ? 'active' : ''}" data-val="gelir">▲ Gelir</button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" id="katm-sil" style="flex:0;padding:10px 14px">Sil</button>` : ''}
        <button class="btn btn-secondary" id="katm-iptal">İptal</button>
        <button class="btn btn-primary" id="katm-kaydet">Kaydet</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add('modal-closing');
    setTimeout(() => modal.remove(), 220);
  };

  document.getElementById('katm-close')?.addEventListener('click', close);
  document.getElementById('katm-iptal')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  modal.querySelectorAll('.katm-tip').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.katm-tip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('katm-sil')?.addEventListener('click', async () => {
    if (!kat || !confirm(`"${kat.ad}" kategorisini silmek istediğinizden emin misiniz?`)) return;
    await updateKategori(kat.id, { silindi: true });
    close();
    showToast(`${kat.emoji} ${kat.ad} silindi`, 'info');
  });

  document.getElementById('katm-kaydet')?.addEventListener('click', async () => {
    const ad    = document.getElementById('katm-ad')?.value.trim();
    const emoji = document.getElementById('katm-emoji')?.value.trim() || '🏷️';
    const tip   = modal.querySelector('.katm-tip.active')?.dataset.val || defaultTip;

    if (!ad) {
      document.getElementById('katm-ad')?.classList.add('error');
      return;
    }
    try {
      if (isEdit) {
        await updateKategori(kat.id, { ad, emoji, tip });
        showToast('Kategori güncellendi', 'success');
      } else {
        await addKategori({ ad, emoji, tip });
        showToast('Kategori eklendi', 'success');
      }
      close();
    } catch (err) {
      showToast('Hata: ' + (err.message || 'Bilinmeyen'), 'error');
    }
  });

  document.getElementById('katm-ad')?.focus();
}
