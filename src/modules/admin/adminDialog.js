function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[m]));
}

function closeOnEscape(event, close) {
  if (event.key === 'Escape') close();
}

function dialogButtonTone(tone) {
  if (tone === 'danger') return 'adm-dialog-btn-danger';
  if (tone === 'warning') return 'adm-dialog-btn-warning';
  return 'adm-dialog-btn-primary';
}

export function showAdminToast({ title, message = '', tone = 'success', timeout = 4200 } = {}) {
  let stack = document.querySelector('.adm-toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'adm-toast-stack';
    document.body.appendChild(stack);
  }

  const toast = document.createElement('div');
  toast.className = `adm-toast adm-toast-${tone}`;
  toast.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
  toast.innerHTML = `
    <div class="adm-toast-mark"></div>
    <div>
      <div class="adm-toast-title">${escapeHtml(title)}</div>
      ${message ? `<div class="adm-toast-message">${escapeHtml(message)}</div>` : ''}
    </div>
    <button class="adm-toast-close" type="button" aria-label="Dismiss notification">×</button>
  `;

  const remove = () => {
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 180);
  };

  toast.querySelector('.adm-toast-close').addEventListener('click', remove);
  stack.appendChild(toast);
  if (timeout > 0) window.setTimeout(remove, timeout);
}

export function showAdminConfirm({
  title,
  message = '',
  detail = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'adm-dialog-backdrop';
    overlay.innerHTML = `
      <section class="adm-dialog adm-dialog-${tone}" role="dialog" aria-modal="true" aria-labelledby="adm-dialog-title">
        <div class="adm-dialog-topline"></div>
        <div class="adm-dialog-header">
          <div>
            <div class="adm-dialog-kicker">${tone === 'danger' ? 'Sensitive action' : tone === 'warning' ? 'Review required' : 'Admin confirmation'}</div>
            <h2 id="adm-dialog-title" class="adm-dialog-title">${escapeHtml(title)}</h2>
          </div>
        </div>
        ${message ? `<p class="adm-dialog-message">${escapeHtml(message)}</p>` : ''}
        ${detail ? `<div class="adm-dialog-note">${escapeHtml(detail)}</div>` : ''}
        <div class="adm-dialog-actions">
          <button class="adm-dialog-btn adm-dialog-btn-ghost" type="button" data-action="cancel">${escapeHtml(cancelLabel)}</button>
          <button class="adm-dialog-btn ${dialogButtonTone(tone)}" type="button" data-action="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </section>
    `;

    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('is-leaving');
      window.setTimeout(() => overlay.remove(), 160);
      resolve(result);
    };
    const onKey = (event) => closeOnEscape(event, () => close(false));

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(false);
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="confirm"]').focus();
  });
}

export function showAdminForm({
  title,
  message = '',
  fields = [],
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  tone = 'default',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'adm-dialog-backdrop';
    const fieldsHtml = fields.map((field) => {
      const inputId = `adm-field-${field.name}`;
      const required = field.required ? 'required' : '';
      const minLength = field.minLength ? `minlength="${Number(field.minLength)}"` : '';
      const value = field.value !== undefined ? `value="${escapeHtml(field.value)}"` : '';
      const placeholder = field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : '';
      const autocomplete = field.autocomplete ? `autocomplete="${escapeHtml(field.autocomplete)}"` : '';
      const help = field.help ? `<div class="adm-dialog-help">${escapeHtml(field.help)}</div>` : '';
      const control = field.type === 'textarea'
        ? `<textarea id="${inputId}" name="${escapeHtml(field.name)}" rows="${field.rows || 4}" ${required} ${placeholder}>${escapeHtml(field.value || '')}</textarea>`
        : `<input id="${inputId}" name="${escapeHtml(field.name)}" type="${escapeHtml(field.type || 'text')}" ${required} ${minLength} ${value} ${placeholder} ${autocomplete}>`;
      return `
        <label class="adm-dialog-field" for="${inputId}">
          <span>${escapeHtml(field.label || field.name)}</span>
          ${control}
          ${help}
        </label>
      `;
    }).join('');

    overlay.innerHTML = `
      <section class="adm-dialog adm-dialog-${tone}" role="dialog" aria-modal="true" aria-labelledby="adm-form-title">
        <div class="adm-dialog-topline"></div>
        <div class="adm-dialog-header">
          <div>
            <div class="adm-dialog-kicker">${tone === 'danger' ? 'Restricted operation' : 'Admin workflow'}</div>
            <h2 id="adm-form-title" class="adm-dialog-title">${escapeHtml(title)}</h2>
          </div>
        </div>
        ${message ? `<p class="adm-dialog-message">${escapeHtml(message)}</p>` : ''}
        <form class="adm-dialog-form">
          <div class="adm-dialog-fields">${fieldsHtml}</div>
          <div class="adm-dialog-actions">
            <button class="adm-dialog-btn adm-dialog-btn-ghost" type="button" data-action="cancel">${escapeHtml(cancelLabel)}</button>
            <button class="adm-dialog-btn ${dialogButtonTone(tone)}" type="submit">${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </section>
    `;

    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('is-leaving');
      window.setTimeout(() => overlay.remove(), 160);
      resolve(result);
    };
    const onKey = (event) => closeOnEscape(event, () => close(null));

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(null);
    });
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(null));
    overlay.querySelector('.adm-dialog-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.reportValidity()) return;
      const data = {};
      fields.forEach((field) => {
        data[field.name] = (form.elements[field.name]?.value || '').trim();
      });
      close(data);
    });

    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('input, textarea')?.focus();
  });
}

export function showAdminPasswordResult({ name, tempPassword }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'adm-dialog-backdrop';
    overlay.innerHTML = `
      <section class="adm-dialog adm-dialog-warning" role="dialog" aria-modal="true" aria-labelledby="adm-password-title">
        <div class="adm-dialog-topline"></div>
        <div class="adm-dialog-header">
          <div>
            <div class="adm-dialog-kicker">Temporary credential</div>
            <h2 id="adm-password-title" class="adm-dialog-title">Password reset for ${escapeHtml(name)}</h2>
          </div>
        </div>
        <p class="adm-dialog-message">Share this temporary password through a trusted channel. The old password cannot be viewed or recovered.</p>
        <div class="adm-dialog-password">
          <code>${escapeHtml(tempPassword)}</code>
          <button class="adm-dialog-btn adm-dialog-btn-soft" type="button" data-action="copy">Copy</button>
        </div>
        <div class="adm-dialog-actions">
          <button class="adm-dialog-btn adm-dialog-btn-primary" type="button" data-action="close">Done</button>
        </div>
      </section>
    `;

    const close = () => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.add('is-leaving');
      window.setTimeout(() => overlay.remove(), 160);
      resolve();
    };
    const onKey = (event) => closeOnEscape(event, close);

    overlay.querySelector('[data-action="copy"]').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      try {
        await navigator.clipboard.writeText(tempPassword);
        button.textContent = 'Copied';
        showAdminToast({ title: 'Password copied', message: 'Temporary credential copied to clipboard.' });
      } catch {
        button.textContent = 'Select manually';
      }
    });
    overlay.querySelector('[data-action="close"]').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="copy"]').focus();
  });
}
