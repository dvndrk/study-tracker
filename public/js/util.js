export const $ = id => document.getElementById(id);

export function setProgress(barEl, pct) {
  barEl.style.width = pct + '%';
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export const newId = () => crypto.randomUUID();
