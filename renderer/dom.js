import { icon } from './icons.js';

export function esc(value) {
  const div = document.createElement('div');
  div.textContent = value == null ? '' : String(value);
  return div.innerHTML;
}

export function button({ label, iconName, className = '', onClick = '', disabled = false, title = '', type = 'button' }) {
  const iconHtml = iconName ? icon(iconName) : '';
  const text = label ? `<span>${esc(label)}</span>` : '';
  const titleAttr = title || label ? ` title="${esc(title || label)}" aria-label="${esc(title || label)}"` : '';
  return `<button type="${type}" class="button ${className}" ${disabled ? 'disabled' : ''}${titleAttr} ${onClick ? `onclick="${onClick}"` : ''}>${iconHtml}${text}</button>`;
}

export function field({ label, value = '', type = 'text', onInput = '', onChange = '', className = '', placeholder = '' }) {
  const event = onInput ? `oninput="${onInput}"` : `onchange="${onChange}"`;
  return `<label class="field ${className}">
    <span>${esc(label)}</span>
    <input type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${event}>
  </label>`;
}

export function textareaField({ label, value = '', onInput = '', onChange = '', className = '', rows = 3 }) {
  const event = onInput ? `oninput="${onInput}"` : `onchange="${onChange}"`;
  return `<label class="field ${className}">
    <span>${esc(label)}</span>
    <textarea rows="${rows}" ${event}>${esc(value)}</textarea>
  </label>`;
}

export function checkbox({ checked, onChange, label = '', className = '' }) {
  return `<label class="check ${className}">
    <input type="checkbox" ${checked ? 'checked' : ''} onchange="${onChange}">
    <span>${esc(label)}</span>
  </label>`;
}

export function emptyState(title, detail = '') {
  return `<div class="empty-state">
    <div class="empty-title">${esc(title)}</div>
    ${detail ? `<div class="empty-detail">${esc(detail)}</div>` : ''}
  </div>`;
}

export function moveButtons(kind, idx, length, fn = 'moveItem') {
  return `${button({ iconName: 'arrowUp', className: 'icon-button', title: 'Move up', disabled: idx === 0, onClick: `${fn}('${kind}', ${idx}, -1)` })}
${button({ iconName: 'arrowDown', className: 'icon-button', title: 'Move down', disabled: idx === length - 1, onClick: `${fn}('${kind}', ${idx}, 1)` })}`;
}
