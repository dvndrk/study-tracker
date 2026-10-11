import { $ } from './util.js';
import { parseLocalDate } from './calc.js';

// ── Toast ──────────────────────────────────────────────────

let toastTimer = null;

/** duration 0 keeps the toast until the next one replaces it. */
export function showToast(message, type = 'success', duration = 3000) {
  const t = $('toast');
  t.textContent = message;
  t.className = `show ${type}`;
  clearTimeout(toastTimer);
  if (duration > 0) toastTimer = setTimeout(() => { t.className = ''; }, duration);
}

// ── Overlay manager ────────────────────────────────────────
// One place for: show/hide, focus in, focus back, Esc to close, Enter to submit, Tab kept inside.

const stack = [];
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function openOverlay(el, { onCancel, onSubmit, focus } = {}) {
  stack.push({
    el,
    onCancel: onCancel || (() => closeOverlay(el)),
    onSubmit,
    opener: document.activeElement,
  });
  el.classList.remove('hidden');
  const target = typeof focus === 'string' ? el.querySelector(focus) : (focus || el.querySelector(FOCUSABLE));
  target?.focus();
}

export function closeOverlay(el) {
  el.classList.add('hidden');
  const i = stack.findIndex(entry => entry.el === el);
  if (i < 0) return;
  const [entry] = stack.splice(i, 1);
  if (entry.opener?.isConnected) entry.opener.focus?.();
}

document.addEventListener('keydown', e => {
  const top = stack[stack.length - 1];
  if (!top) return;

  if (e.key === 'Escape') { e.preventDefault(); top.onCancel(); return; }

  if (e.key === 'Enter' && top.onSubmit && e.target.tagName === 'INPUT' && top.el.contains(e.target)) {
    e.preventDefault(); top.onSubmit(); return;
  }

  if (e.key === 'Tab') {
    const items = [...top.el.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (!top.el.contains(active)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }
});

// ── Promise-based dialogs ──────────────────────────────────

export function showInputModal(title, value = '', placeholder = 'Enter a name…') {
  return new Promise(resolve => {
    const overlay = $('modal-overlay');
    const input = $('modal-input');
    $('modal-title').textContent = title;
    input.value = value;
    input.placeholder = placeholder;

    const done = result => {
      $('modal-confirm').onclick = null;
      $('modal-cancel').onclick = null;
      closeOverlay(overlay);
      resolve(result);
    };
    const submit = () => done(input.value.trim() || null);

    $('modal-confirm').onclick = submit;
    $('modal-cancel').onclick = () => done(null);
    openOverlay(overlay, { focus: input, onCancel: () => done(null), onSubmit: submit });
    input.select();
  });
}

export function showConfirm(title, message, okLabel = 'Delete') {
  return new Promise(resolve => {
    const overlay = $('confirm-overlay');
    $('confirm-title').textContent = title;
    $('confirm-message').textContent = message;
    $('confirm-ok').textContent = okLabel;

    const done = result => {
      $('confirm-ok').onclick = null;
      $('confirm-cancel').onclick = null;
      closeOverlay(overlay);
      resolve(result);
    };
    $('confirm-ok').onclick = () => done(true);
    $('confirm-cancel').onclick = () => done(false);
    // Focus starts on Cancel so a stray Enter never confirms a deletion.
    openOverlay(overlay, { focus: $('confirm-cancel'), onCancel: () => done(false) });
  });
}

export function showDateModal(current) {
  return new Promise(resolve => {
    const overlay = $('date-modal-overlay');
    const start = $('input-start-date');
    const target = $('input-target-date');
    start.value = current.startDate || '';
    target.value = current.targetDate || '';

    const done = result => {
      $('date-modal-confirm').onclick = null;
      $('date-modal-cancel').onclick = null;
      closeOverlay(overlay);
      resolve(result);
    };
    const submit = () => {
      const s = parseLocalDate(start.value), t = parseLocalDate(target.value);
      if (s && t && t <= s) { showToast('Target date must be after the start date.', 'error'); return; }
      done({ startDate: start.value, targetDate: target.value });
    };

    $('date-modal-confirm').onclick = submit;
    $('date-modal-cancel').onclick = () => done(null);
    openOverlay(overlay, { focus: start, onCancel: () => done(null), onSubmit: submit });
  });
}

export function showBrandModal(current) {
  return new Promise(resolve => {
    const overlay = $('brand-overlay');
    const title = $('brand-title-input');
    const subtitle = $('brand-subtitle-input');
    title.value = current.title;
    subtitle.value = current.subtitle;

    const done = result => {
      $('brand-modal-confirm').onclick = null;
      $('brand-modal-cancel').onclick = null;
      closeOverlay(overlay);
      resolve(result);
    };
    const submit = () => {
      if (!title.value.trim()) { showToast('App name cannot be empty.', 'error'); title.focus(); return; }
      done({ title: title.value.trim(), subtitle: subtitle.value.trim() });
    };

    $('brand-modal-confirm').onclick = submit;
    $('brand-modal-cancel').onclick = () => done(null);
    openOverlay(overlay, { focus: title, onCancel: () => done(null), onSubmit: submit });
    title.select();
  });
}
