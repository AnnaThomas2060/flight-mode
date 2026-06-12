// Shared confirm modal (used by in-flight end-early and setup warnings).
export function confirmModal(parent, { title, body, confirmText, cancelText, danger = false, onConfirm, onCancel }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${title}</h2>
      <p class="sub">${body}</p>
      <div class="row">
        <button id="modal-cancel">${cancelText}</button>
        <button id="modal-confirm" class="${danger ? 'danger' : 'primary'}">${confirmText}</button>
      </div>
    </div>`;
  backdrop.querySelector('#modal-cancel').addEventListener('click', () => { backdrop.remove(); onCancel?.(); });
  backdrop.querySelector('#modal-confirm').addEventListener('click', () => { backdrop.remove(); onConfirm?.(); });
  parent.appendChild(backdrop);
}
