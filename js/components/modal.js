export function openModal({
  title = '',
  content = '',
  onConfirm = null,
  confirmText = 'Tamam',
  cancelText = 'İptal'
} = {}) {
  closeModal();

  const overlay = document.createElement('div');
  overlay.id = 'modal-overlay';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'background:rgba(61,40,23,0.55)',
    'z-index:200', 'display:flex', 'align-items:center',
    'justify-content:center', 'padding:16px', 'backdrop-filter:blur(2px)'
  ].join(';');

  const box = document.createElement('div');
  box.style.cssText = [
    'background:#fff', 'border-radius:14px', 'padding:22px',
    'width:100%', 'max-width:400px',
    'box-shadow:0 8px 32px rgba(61,40,23,0.25)',
    'animation:modalIn 0.15s ease'
  ].join(';');

  box.innerHTML = `
    <style>
      @keyframes modalIn {
        from { opacity:0; transform:scale(0.95) translateY(8px); }
        to   { opacity:1; transform:scale(1) translateY(0); }
      }
    </style>
    ${title ? `<div style="font-size:17px;font-weight:700;color:#3d2817;margin-bottom:10px">${title}</div>` : ''}
    <div style="font-size:14px;color:#6b4f3a;margin-bottom:20px;line-height:1.5">${content}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      ${cancelText  ? `<button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>` : ''}
      ${onConfirm   ? `<button class="btn btn-primary"   id="modal-confirm">${confirmText}</button>` : ''}
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
  document.getElementById('modal-confirm')?.addEventListener('click', () => {
    onConfirm?.();
    closeModal();
  });
}

export function closeModal() {
  document.getElementById('modal-overlay')?.remove();
}

export function confirm(message) {
  return new Promise(resolve => {
    openModal({
      content: message,
      confirmText: 'Evet',
      cancelText: 'Hayır',
      onConfirm: () => resolve(true)
    });
    document.getElementById('modal-cancel')?.addEventListener('click', () => resolve(false), { once: true });
  });
}
