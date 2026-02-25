/**
 * CA Final Study Tracker — Frontend Script
 * Vanilla JS | Modular | No frameworks
 * Communicates with Express backend via REST API
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

const State = {
  subjects: [],           // All subjects from server
  activeSubjectId: null,  // Currently selected subject ID
};

// ═══════════════════════════════════════════════════════════
// API LAYER — All server communication
// ═══════════════════════════════════════════════════════════

const API = {
  base: '',

  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== null) opts.body = JSON.stringify(body);

    const res = await fetch(this.base + path, opts);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Server error');
    return data;
  },

  // ── Subjects ──────────────────────────────────────────
  getSubjects()            { return this.request('GET',    '/subjects'); },
  addSubject(name)         { return this.request('POST',   '/subjects', { name }); },
  editSubject(id, name)    { return this.request('PUT',    `/subjects/${id}`, { name }); },
  deleteSubject(id)        { return this.request('DELETE', `/subjects/${id}`); },

  // ── Chapters ──────────────────────────────────────────
  addChapter(sId, name)          { return this.request('POST',   `/subjects/${sId}/chapters`, { name }); },
  updateChapter(sId, cId, data)  { return this.request('PUT',    `/subjects/${sId}/chapters/${cId}`, data); },
  deleteChapter(sId, cId)        { return this.request('DELETE', `/subjects/${sId}/chapters/${cId}`); },
};

// ═══════════════════════════════════════════════════════════
// COMPLETION CALCULATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Calculate completion % for a single chapter.
 * 7 criteria: concepts, illustrations, tyk, rtp, mtp, pyq (bool) + revision >= 1
 */
function calcChapterPct(chapter) {
  const bools = ['concepts', 'illustrations', 'tyk', 'rtp', 'mtp', 'pyq'];
  const done = bools.filter(f => chapter[f] === true).length;
  const revDone = chapter.revisionCount >= 1 ? 1 : 0;
  return Math.round(((done + revDone) / 7) * 100);
}

/** Subject completion % = average of its chapters */
function calcSubjectPct(subject) {
  if (!subject.chapters.length) return 0;
  const total = subject.chapters.reduce((sum, c) => sum + calcChapterPct(c), 0);
  return Math.round(total / subject.chapters.length);
}

/** Overall completion % = average of all subjects */
function calcOverallPct(subjects) {
  if (!subjects.length) return 0;
  const total = subjects.reduce((sum, s) => sum + calcSubjectPct(s), 0);
  return Math.round(total / subjects.length);
}

/** Return a gradient color string based on percentage */
function pctColor(pct) {
  if (pct >= 80) return '#34c98a';
  if (pct >= 50) return '#4f8ef7';
  if (pct >= 25) return '#f5963e';
  return '#f05c7a';
}

// ═══════════════════════════════════════════════════════════
// DOM HELPERS
// ═══════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);

function setProgress(barEl, pct) {
  barEl.style.width = pct + '%';
}

function setProgressWithColor(barEl, pct) {
  barEl.style.width = pct + '%';
  barEl.style.background = pctColor(pct);
}

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

let toastTimer = null;

function showToast(message, type = 'success') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `show ${type}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = '';
  }, 3000);
}

// ═══════════════════════════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════════════════════════

/**
 * Show a text-input modal.
 * @param {string} title
 * @param {string} defaultValue
 * @returns {Promise<string|null>} resolved with input value or null if cancelled
 */
function showInputModal(title, defaultValue = '') {
  return new Promise(resolve => {
    $('modal-title').textContent = title;
    $('modal-input').value = defaultValue;
    $('modal-overlay').classList.remove('hidden');
    $('modal-input').focus();

    const onConfirm = () => {
      const val = $('modal-input').value.trim();
      cleanup();
      resolve(val || null);
    };

    const onCancel = () => { cleanup(); resolve(null); };

    const onKey = e => {
      if (e.key === 'Enter')  onConfirm();
      if (e.key === 'Escape') onCancel();
    };

    function cleanup() {
      $('modal-overlay').classList.add('hidden');
      $('modal-confirm').removeEventListener('click', onConfirm);
      $('modal-cancel').removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
    }

    $('modal-confirm').addEventListener('click', onConfirm);
    $('modal-cancel').addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
  });
}

/**
 * Show a confirmation modal.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function showConfirm(title, message) {
  return new Promise(resolve => {
    $('confirm-title').textContent = title;
    $('confirm-message').textContent = message;
    $('confirm-overlay').classList.remove('hidden');

    const onOk     = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };
    const onKey    = e => { if (e.key === 'Escape') onCancel(); };

    function cleanup() {
      $('confirm-overlay').classList.add('hidden');
      $('confirm-ok').removeEventListener('click', onOk);
      $('confirm-cancel').removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
    }

    $('confirm-ok').addEventListener('click', onOk);
    $('confirm-cancel').addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
  });
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR RENDERING
// ═══════════════════════════════════════════════════════════

function renderSidebar() {
  const list = $('subject-list');
  list.innerHTML = '';

  State.subjects.forEach(subject => {
    const pct = calcSubjectPct(subject);
    const isActive = subject.id === State.activeSubjectId;

    const item = document.createElement('div');
    item.className = `subject-nav-item${isActive ? ' active' : ''}`;
    item.dataset.id = subject.id;

    item.innerHTML = `
      <div class="subject-nav-inner">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="subject-nav-name">${escapeHtml(subject.name)}</span>
          <span class="subject-nav-pct">${pct}%</span>
        </div>
        <div class="subject-nav-mini-bar">
          <div class="fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;

    item.addEventListener('click', () => selectSubject(subject.id));
    list.appendChild(item);
  });

  // Overall progress
  const overall = calcOverallPct(State.subjects);
  $('overall-pct').textContent = overall + '%';
  setProgress($('overall-bar'), overall);
}

// ═══════════════════════════════════════════════════════════
// SUBJECT VIEW RENDERING
// ═══════════════════════════════════════════════════════════

function renderSubjectView() {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);

  if (!subject) {
    $('welcome-screen').classList.remove('hidden');
    $('subject-view').classList.add('hidden');
    return;
  }

  $('welcome-screen').classList.add('hidden');
  $('subject-view').classList.remove('hidden');

  // Header
  $('subject-title').textContent = subject.name;
  const count = subject.chapters.length;
  $('subject-chapter-count').textContent = `${count} chapter${count !== 1 ? 's' : ''}`;

  // Subject progress bar
  const sPct = calcSubjectPct(subject);
  $('subject-pct').textContent = sPct + '%';
  setProgress($('subject-bar'), sPct);

  // Chapters
  renderChaptersTable(subject);
}

// ═══════════════════════════════════════════════════════════
// CHAPTERS TABLE RENDERING
// ═══════════════════════════════════════════════════════════

function renderChaptersTable(subject) {
  const tbody = $('chapters-tbody');
  tbody.innerHTML = '';

  if (!subject.chapters.length) {
    $('no-chapters').classList.remove('hidden');
    $('chapters-table-wrap').classList.add('hidden');
    return;
  }

  $('no-chapters').classList.add('hidden');
  $('chapters-table-wrap').classList.remove('hidden');

  subject.chapters.forEach(chapter => {
    const row = buildChapterRow(subject.id, chapter);
    tbody.appendChild(row);
  });
}

/**
 * Build a single chapter table row element.
 */
function buildChapterRow(subjectId, chapter) {
  const pct = calcChapterPct(chapter);
  const color = pctColor(pct);

  const tr = document.createElement('tr');
  tr.dataset.chapterId = chapter.id;

  // Boolean fields config: [fieldName, className]
  const boolFields = [
    ['concepts',      'check-concepts'],
    ['illustrations', 'check-illus'],
    ['tyk',           'check-tyk'],
    ['rtp',           'check-rtp'],
    ['mtp',           'check-mtp'],
    ['pyq',           'check-pyq'],
  ];

  const boolCells = boolFields.map(([field, cls]) => `
    <td class="col-bool">
      <div class="check-wrap">
        <input
          type="checkbox"
          class="custom-check ${cls}"
          data-field="${field}"
          data-chapter="${chapter.id}"
          data-subject="${subjectId}"
          ${chapter[field] ? 'checked' : ''}
          title="${field.charAt(0).toUpperCase() + field.slice(1)}"
        />
      </div>
    </td>
  `).join('');

  tr.innerHTML = `
    <td class="col-name">${escapeHtml(chapter.name)}</td>
    ${boolCells}
    <td class="col-rev">
      <div class="revision-cell">
        <button class="rev-btn" data-action="rev-dec" data-chapter="${chapter.id}" data-subject="${subjectId}" title="Decrease">−</button>
        <span class="rev-count ${chapter.revisionCount === 0 ? 'zero' : ''}">${chapter.revisionCount}</span>
        <button class="rev-btn" data-action="rev-inc" data-chapter="${chapter.id}" data-subject="${subjectId}" title="Increase">+</button>
      </div>
    </td>
    <td class="col-progress">
      <div class="chapter-progress-wrap">
        <div class="chapter-bar-track">
          <div class="chapter-bar-fill" style="width:${pct}%; background:${color}"></div>
        </div>
        <span class="chapter-pct-label" style="color:${color}">${pct}%</span>
      </div>
    </td>
    <td class="col-actions">
      <div class="row-actions">
        <button class="icon-btn" data-action="edit-chapter" data-chapter="${chapter.id}" data-subject="${subjectId}" title="Edit Chapter">✏️</button>
        <button class="icon-btn danger" data-action="del-chapter" data-chapter="${chapter.id}" data-subject="${subjectId}" title="Delete Chapter">🗑️</button>
      </div>
    </td>
  `;

  return tr;
}

// ═══════════════════════════════════════════════════════════
// SUBJECT ACTIONS
// ═══════════════════════════════════════════════════════════

async function handleAddSubject() {
  const name = await showInputModal('Add New Subject');
  if (!name) return;

  try {
    const newSubject = await API.addSubject(name);
    newSubject.chapters = newSubject.chapters || [];
    State.subjects.push(newSubject);
    renderSidebar();
    selectSubject(newSubject.id);
    showToast(`Subject "${name}" added.`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleEditSubject() {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);
  if (!subject) return;

  const name = await showInputModal('Edit Subject Name', subject.name);
  if (!name || name === subject.name) return;

  try {
    await API.editSubject(subject.id, name);
    subject.name = name;
    renderSidebar();
    renderSubjectView();
    showToast('Subject name updated.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteSubject() {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);
  if (!subject) return;

  const ok = await showConfirm(
    'Delete Subject',
    `Delete "${subject.name}" and all its chapters? This cannot be undone.`
  );
  if (!ok) return;

  try {
    await API.deleteSubject(subject.id);
    State.subjects = State.subjects.filter(s => s.id !== subject.id);
    State.activeSubjectId = State.subjects.length ? State.subjects[0].id : null;
    renderSidebar();
    renderSubjectView();
    showToast(`Subject deleted.`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// CHAPTER ACTIONS
// ═══════════════════════════════════════════════════════════

async function handleAddChapter() {
  if (!State.activeSubjectId) return;

  const name = await showInputModal('Add New Chapter');
  if (!name) return;

  try {
    const chapter = await API.addChapter(State.activeSubjectId, name);
    const subject = State.subjects.find(s => s.id === State.activeSubjectId);
    subject.chapters.push(chapter);
    renderSidebar();
    renderSubjectView();
    showToast(`Chapter "${name}" added.`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleEditChapter(subjectId, chapterId) {
  const subject = State.subjects.find(s => s.id === subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const name = await showInputModal('Edit Chapter Name', chapter.name);
  if (!name || name === chapter.name) return;

  try {
    await API.updateChapter(subjectId, chapterId, { name });
    chapter.name = name;
    renderSidebar();
    renderSubjectView();
    showToast('Chapter updated.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteChapter(subjectId, chapterId) {
  const subject = State.subjects.find(s => s.id === subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const ok = await showConfirm('Delete Chapter', `Delete "${chapter.name}"? This cannot be undone.`);
  if (!ok) return;

  try {
    await API.deleteChapter(subjectId, chapterId);
    subject.chapters = subject.chapters.filter(c => c.id !== chapterId);
    renderSidebar();
    renderSubjectView();
    showToast('Chapter deleted.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Toggle a boolean field on a chapter.
 */
async function handleToggleField(subjectId, chapterId, field, value) {
  const subject = State.subjects.find(s => s.id === subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const prev = chapter[field];
  chapter[field] = value; // Optimistic update

  try {
    await API.updateChapter(subjectId, chapterId, { [field]: value });
    // Re-render progress only (avoid full re-render on every checkbox)
    refreshRowProgress(chapterId);
    refreshSubjectAndOverall();
  } catch (err) {
    chapter[field] = prev; // Rollback
    showToast('Failed to save. Please retry.', 'error');
    // Re-check the checkbox visually
    const cb = document.querySelector(
      `input[data-field="${field}"][data-chapter="${chapterId}"]`
    );
    if (cb) cb.checked = prev;
  }
}

/**
 * Increment or decrement revision count.
 */
async function handleRevision(subjectId, chapterId, delta) {
  const subject = State.subjects.find(s => s.id === subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const newCount = Math.max(0, chapter.revisionCount + delta);
  if (newCount === chapter.revisionCount) return;

  const prev = chapter.revisionCount;
  chapter.revisionCount = newCount;

  // Optimistic DOM update
  const row = document.querySelector(`tr[data-chapter-id="${chapterId}"]`);
  if (row) {
    const countEl = row.querySelector('.rev-count');
    if (countEl) {
      countEl.textContent = newCount;
      countEl.className = `rev-count ${newCount === 0 ? 'zero' : ''}`;
    }
  }

  try {
    await API.updateChapter(subjectId, chapterId, { revisionCount: newCount });
    refreshRowProgress(chapterId);
    refreshSubjectAndOverall();
  } catch (err) {
    chapter.revisionCount = prev;
    showToast('Failed to save revision. Please retry.', 'error');
    if (row) {
      const countEl = row.querySelector('.rev-count');
      if (countEl) countEl.textContent = prev;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// INCREMENTAL REFRESH HELPERS
// ═══════════════════════════════════════════════════════════

/** Update only the progress bar of a single chapter row */
function refreshRowProgress(chapterId) {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;

  const pct = calcChapterPct(chapter);
  const color = pctColor(pct);
  const row = document.querySelector(`tr[data-chapter-id="${chapterId}"]`);
  if (!row) return;

  const bar = row.querySelector('.chapter-bar-fill');
  const label = row.querySelector('.chapter-pct-label');
  if (bar)   { bar.style.width = pct + '%'; bar.style.background = color; }
  if (label) { label.textContent = pct + '%'; label.style.color = color; }
}

/** Refresh subject and overall progress bars without re-rendering the table */
function refreshSubjectAndOverall() {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);
  if (!subject) return;

  const sPct = calcSubjectPct(subject);
  $('subject-pct').textContent = sPct + '%';
  setProgress($('subject-bar'), sPct);

  const overall = calcOverallPct(State.subjects);
  $('overall-pct').textContent = overall + '%';
  setProgress($('overall-bar'), overall);

  // Update sidebar mini-bar for active subject
  const navItem = document.querySelector(`.subject-nav-item[data-id="${subject.id}"]`);
  if (navItem) {
    const pctEl = navItem.querySelector('.subject-nav-pct');
    const fill  = navItem.querySelector('.fill');
    if (pctEl) pctEl.textContent = sPct + '%';
    if (fill)  fill.style.width = sPct + '%';
  }
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════

function selectSubject(id) {
  State.activeSubjectId = id;
  renderSidebar();
  renderSubjectView();
}

// ═══════════════════════════════════════════════════════════
// EVENT DELEGATION — Main Panel
// ═══════════════════════════════════════════════════════════

function attachMainPanelEvents() {
  const mainPanel = $('main-panel');

  mainPanel.addEventListener('change', e => {
    const cb = e.target;
    if (cb.type === 'checkbox' && cb.dataset.field) {
      handleToggleField(cb.dataset.subject, cb.dataset.chapter, cb.dataset.field, cb.checked);
    }
  });

  mainPanel.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action  = btn.dataset.action;
    const subId   = btn.dataset.subject;
    const chapId  = btn.dataset.chapter;

    if (action === 'rev-inc')       handleRevision(subId, chapId, +1);
    if (action === 'rev-dec')       handleRevision(subId, chapId, -1);
    if (action === 'edit-chapter')  handleEditChapter(subId, chapId);
    if (action === 'del-chapter')   handleDeleteChapter(subId, chapId);
  });
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

/** Prevent XSS by escaping HTML special characters */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════

async function init() {
  try {
    // Load all data from server
    State.subjects = await API.getSubjects();
  } catch (err) {
    showToast('Could not connect to server.', 'error');
    State.subjects = [];
  }

  // Bind static button events
  $('btn-add-subject').addEventListener('click', handleAddSubject);
  $('btn-edit-subject').addEventListener('click', handleEditSubject);
  $('btn-delete-subject').addEventListener('click', handleDeleteSubject);
  $('btn-add-chapter').addEventListener('click', handleAddChapter);

  // Delegate dynamic events inside main panel
  attachMainPanelEvents();

  // Initial render
  renderSidebar();

  // Auto-select first subject if available
  if (State.subjects.length) {
    selectSubject(State.subjects[0].id);
  } else {
    renderSubjectView();
  }
}

// Boot
document.addEventListener('DOMContentLoaded', init);
