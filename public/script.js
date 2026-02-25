/**
 * CA Final Study Tracker — script.js v3
 * New: editable brand name, logo fallback, dashboard view
 * Vanilla JS | Modular | No frameworks
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

const State = {
  subjects:        [],
  activeSubjectId: null,   // null = dashboard is showing
  config: {
    startDate:    '',
    targetDate:   '',
    brandTitle:   '',      // editable brand name (default: 'CA Final')
    brandSubtitle: '',     // editable subtitle (default: 'Study Tracker')
  },
};

// ═══════════════════════════════════════════════════════════
// API LAYER
// ═══════════════════════════════════════════════════════════

const API = {
  base: '',

  async request(method, path, body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== null) opts.body = JSON.stringify(body);
    const res  = await fetch(this.base + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    return data;
  },

  getConfig()         { return this.request('GET', '/config'); },
  saveConfig(payload) { return this.request('PUT', '/config', payload); },

  getSubjects()            { return this.request('GET',    '/subjects'); },
  addSubject(name)         { return this.request('POST',   '/subjects', { name }); },
  editSubject(id, name)    { return this.request('PUT',    `/subjects/${id}`, { name }); },
  deleteSubject(id)        { return this.request('DELETE', `/subjects/${id}`); },

  addChapter(sId, name)         { return this.request('POST',   `/subjects/${sId}/chapters`, { name }); },
  updateChapter(sId, cId, data) { return this.request('PUT',    `/subjects/${sId}/chapters/${cId}`, data); },
  deleteChapter(sId, cId)       { return this.request('DELETE', `/subjects/${sId}/chapters/${cId}`); },
};

// ═══════════════════════════════════════════════════════════
// COMPLETION CALCULATIONS
// ═══════════════════════════════════════════════════════════

function calcChapterPct(chapter) {
  const bools   = ['concepts', 'illustrations', 'tyk', 'rtp', 'mtp', 'pyq'];
  const done    = bools.filter(f => chapter[f] === true).length;
  const revDone = chapter.revisionCount >= 1 ? 1 : 0;
  return Math.round(((done + revDone) / 7) * 100);
}

function calcSubjectPct(subject) {
  if (!subject.chapters.length) return 0;
  const total = subject.chapters.reduce((sum, c) => sum + calcChapterPct(c), 0);
  return Math.round(total / subject.chapters.length);
}

function calcOverallPct(subjects) {
  if (!subjects.length) return 0;
  const total = subjects.reduce((sum, s) => sum + calcSubjectPct(s), 0);
  return Math.round(total / subjects.length);
}

function isChapterComplete(chapter) {
  const bools = ['concepts', 'illustrations', 'tyk', 'rtp', 'mtp', 'pyq'];
  return bools.every(f => chapter[f] === true) && chapter.revisionCount >= 1;
}

function calcExpectedPct(startDate, targetDate) {
  if (!startDate || !targetDate) return null;
  const start  = new Date(startDate);
  const target = new Date(targetDate);
  const today  = new Date(); today.setHours(0,0,0,0);
  const totalDays   = (target - start)  / 86400000;
  const elapsedDays = (today  - start)  / 86400000;
  if (totalDays <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
}

function calcDaysRemaining(targetDate) {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const today  = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

function pctColor(pct) {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#3b7ef8';
  if (pct >= 25) return '#ea580c';
  return '#dc2626';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ═══════════════════════════════════════════════════════════
// DOM HELPERS
// ═══════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);

function setProgress(barEl, pct) { barEl.style.width = pct + '%'; }

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════

let toastTimer = null;
function showToast(message, type = 'success') {
  const t = $('toast');
  t.textContent = message;
  t.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = ''; }, 3000);
}

// ═══════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════

function showInputModal(title, defaultValue = '') {
  return new Promise(resolve => {
    $('modal-title').textContent = title;
    $('modal-input').value = defaultValue;
    $('modal-overlay').classList.remove('hidden');
    $('modal-input').focus();

    const onConfirm = () => { const v = $('modal-input').value.trim(); cleanup(); resolve(v || null); };
    const onCancel  = () => { cleanup(); resolve(null); };
    const onKey     = e => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel(); };

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

function showConfirm(title, message) {
  return new Promise(resolve => {
    $('confirm-title').textContent   = title;
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

function showDateModal(current) {
  return new Promise(resolve => {
    $('input-start-date').value  = current.startDate  || '';
    $('input-target-date').value = current.targetDate || '';
    $('date-modal-overlay').classList.remove('hidden');

    const onConfirm = () => { cleanup(); resolve({ startDate: $('input-start-date').value, targetDate: $('input-target-date').value }); };
    const onCancel  = () => { cleanup(); resolve(null); };
    const onKey     = e => { if (e.key === 'Escape') onCancel(); };

    function cleanup() {
      $('date-modal-overlay').classList.add('hidden');
      $('date-modal-confirm').removeEventListener('click', onConfirm);
      $('date-modal-cancel').removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
    }
    $('date-modal-confirm').addEventListener('click', onConfirm);
    $('date-modal-cancel').addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
  });
}

// ═══════════════════════════════════════════════════════════
// BRAND RENDERING & EDITING
// ═══════════════════════════════════════════════════════════

/** Render brand title and subtitle from config (with fallback defaults) */
function renderBrand() {
  $('brand-title').textContent    = State.config.brandTitle    || 'CA Final';
  $('brand-subtitle').textContent = State.config.brandSubtitle || 'Study Tracker';
}

/** Hover-reveal edit button handler — edits title and subtitle */
async function handleEditBrand() {
  const currentTitle    = State.config.brandTitle    || 'CA Final';
  const currentSubtitle = State.config.brandSubtitle || 'Study Tracker';

  // First modal: app title
  const newTitle = await showInputModal('Edit App Title', currentTitle);
  if (!newTitle) return;

  // Small delay so DOM fully settles before second modal opens
  await new Promise(r => setTimeout(r, 80));

  // Second modal: subtitle
  const newSubtitle = await showInputModal('Edit Subtitle (optional)', currentSubtitle);
  const subtitle = (newSubtitle !== null && newSubtitle !== undefined) ? newSubtitle : currentSubtitle;

  try {
    const saved = await API.saveConfig({ brandTitle: newTitle, brandSubtitle: subtitle });
    State.config = { ...State.config, ...saved };
    renderBrand();
    showToast('App name updated.');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// TARGET DATE & PACE UI (sidebar)
// ═══════════════════════════════════════════════════════════

function renderDateUI() {
  const { startDate, targetDate } = State.config;

  if (targetDate) {
    $('target-date-value').textContent = formatDate(targetDate);
    const days = calcDaysRemaining(targetDate);
    const daysRow = $('days-remaining-row');
    if (days !== null) {
      daysRow.classList.remove('hidden');
      if      (days > 0)  $('days-remaining-text').textContent = `${days} day${days !== 1 ? 's' : ''} remaining`;
      else if (days === 0) $('days-remaining-text').textContent = 'Target date is today';
      else                 $('days-remaining-text').textContent = `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} past target`;
    }
  } else {
    $('target-date-value').textContent = 'Not set — click Edit';
    $('days-remaining-row').classList.add('hidden');
  }

  const paceEl      = $('pace-indicator');
  const expectedPct = calcExpectedPct(startDate, targetDate);
  const actualPct   = calcOverallPct(State.subjects);

  if (expectedPct === null) { paceEl.classList.add('hidden'); return; }

  paceEl.classList.remove('hidden');
  const diff = actualPct - expectedPct;
  if      (diff >= 3)  { paceEl.className = 'ahead';   paceEl.textContent = `▲ Ahead by ${diff}%`; }
  else if (diff <= -3) { paceEl.className = 'behind';  paceEl.textContent = `▼ Behind by ${Math.abs(diff)}%`; }
  else                 { paceEl.className = 'ontrack'; paceEl.textContent = '● On Track'; }
}

async function handleEditDates() {
  const result = await showDateModal(State.config);
  if (!result) return;
  try {
    const saved = await API.saveConfig(result);
    State.config = { ...State.config, ...saved };
    renderDateUI();
    if (State.activeSubjectId === null) renderDashboard();
    showToast('Study dates saved.');
  } catch (err) { showToast(err.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR RENDERING
// ═══════════════════════════════════════════════════════════

function renderSidebar() {
  const list = $('subject-list');
  list.innerHTML = '';

  // ── Dashboard nav item (always first) ──
  const dashItem = document.createElement('div');
  dashItem.className = `dashboard-nav-item${State.activeSubjectId === null ? ' active' : ''}`;
  dashItem.innerHTML = `<span>📊</span><span>Dashboard</span>`;
  dashItem.addEventListener('click', () => selectDashboard());
  list.appendChild(dashItem);

  // ── Divider ──
  if (State.subjects.length) {
    const divider = document.createElement('div');
    divider.className = 'nav-divider';
    list.appendChild(divider);
  }

  // ── Subject items ──
  State.subjects.forEach(subject => {
    const pct      = calcSubjectPct(subject);
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

  // Overall progress bar
  const overall = calcOverallPct(State.subjects);
  $('overall-pct').textContent = overall + '%';
  setProgress($('overall-bar'), overall);

  renderDateUI();
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD RENDERING
// ═══════════════════════════════════════════════════════════

function renderDashboard() {
  $('dashboard-view').classList.remove('hidden');
  $('subject-view').classList.add('hidden');

  const subjects = State.subjects;
  const overall  = calcOverallPct(subjects);

  // ── Fix 2: Dashboard subtitle reflects brand name ──
  const brandTitle = State.config.brandTitle || 'CA Final';
  $('dashboard-heading').textContent = 'Dashboard';
  document.querySelector('.dashboard-sub').textContent = `${brandTitle} — preparation at a glance`;

  // ── Stats row ──
  const totalChapters = subjects.reduce((s, sub) => s + sub.chapters.length, 0);
  const doneChapters  = subjects.reduce((s, sub) => s + sub.chapters.filter(isChapterComplete).length, 0);

  $('dash-overall-pct').textContent    = overall + '%';
  $('dash-subjects-count').textContent = subjects.length;
  $('dash-chapters-total').textContent = totalChapters;
  $('dash-chapters-done').textContent  = doneChapters;
  setProgress($('dash-overall-bar'), overall);

  // ── Date & Pace row ──
  const { startDate, targetDate } = State.config;
  const dateRow = $('dashboard-date-row');

  if (startDate || targetDate) {
    dateRow.classList.remove('hidden');
    $('dash-start-date').textContent  = formatDate(startDate);
    $('dash-target-date').textContent = formatDate(targetDate);

    const days = calcDaysRemaining(targetDate);
    if (days !== null) {
      $('dash-days-remaining').textContent = days > 0 ? `${days} days` : days === 0 ? 'Today' : `${Math.abs(days)}d overdue`;
    } else {
      $('dash-days-remaining').textContent = '—';
    }

    const expectedPct = calcExpectedPct(startDate, targetDate);
    const paceEl = $('dash-pace-badge');
    if (expectedPct !== null) {
      const diff = overall - expectedPct;
      if      (diff >= 3)  { paceEl.className = 'dash-pace-badge ahead';   paceEl.textContent = `▲ Ahead by ${diff}%`; }
      else if (diff <= -3) { paceEl.className = 'dash-pace-badge behind';  paceEl.textContent = `▼ Behind by ${Math.abs(diff)}%`; }
      else                 { paceEl.className = 'dash-pace-badge ontrack'; paceEl.textContent = '● On Track'; }
    } else {
      paceEl.className = 'dash-pace-badge';
      paceEl.textContent = '—';
    }
  } else {
    dateRow.classList.add('hidden');
  }

  // ── Subject cards ──
  const cardsEl = $('dashboard-subject-cards');
  cardsEl.innerHTML = '';

  if (!subjects.length) {
    cardsEl.innerHTML = '<p class="attention-empty">No subjects added yet. Use the sidebar to add your first subject.</p>';
  } else {
    subjects.forEach(subject => {
      const pct   = calcSubjectPct(subject);
      const color = pctColor(pct);
      const total = subject.chapters.length;
      const done  = subject.chapters.filter(isChapterComplete).length;

      const card = document.createElement('div');
      card.className = 'subject-card';
      card.innerHTML = `
        <div class="subject-card-name">${escapeHtml(subject.name)}</div>
        <div class="subject-card-meta">
          <span>${done}/${total} chapters done</span>
          <span class="subject-card-pct">${pct}%</span>
        </div>
        <div class="chapter-bar-track">
          <div class="chapter-bar-fill" style="width:${pct}%; background:${color}"></div>
        </div>
      `;
      card.addEventListener('click', () => selectSubject(subject.id));
      cardsEl.appendChild(card);
    });
  }

  // ── Attention list: chapters with 0% progress ──
  const attentionEl = $('dashboard-attention-list');
  attentionEl.innerHTML = '';

  // Fix 3: three distinct states — no subjects, all started, some not started
  if (!subjects.length) {
    // No subjects at all — nothing to show
    attentionEl.innerHTML = '<div class="attention-empty">Add subjects and chapters to begin tracking.</div>';
  } else {
    const notStarted = [];
    subjects.forEach(subject => {
      subject.chapters.forEach(chapter => {
        if (calcChapterPct(chapter) === 0) {
          notStarted.push({ subject, chapter });
        }
      });
    });

    if (!notStarted.length) {
      // Subjects exist and all chapters have been started
      attentionEl.innerHTML = '<div class="attention-empty">✅ All chapters have been started. Great progress!</div>';
    } else {
      // Show max 10 unstarted chapters
      notStarted.slice(0, 10).forEach(({ subject, chapter }) => {
        const item = document.createElement('div');
        item.className = 'attention-item';
        item.innerHTML = `
          <span class="attention-subject">${escapeHtml(subject.name)}</span>
          <span class="attention-chapter">${escapeHtml(chapter.name)}</span>
        `;
        item.addEventListener('click', () => selectSubject(subject.id));
        attentionEl.appendChild(item);
      });

      if (notStarted.length > 10) {
        const more = document.createElement('div');
        more.className = 'attention-empty';
        more.textContent = `+ ${notStarted.length - 10} more chapters not started`;
        attentionEl.appendChild(more);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SUBJECT VIEW RENDERING
// ═══════════════════════════════════════════════════════════

function renderSubjectView() {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);
  if (!subject) { selectDashboard(); return; }

  $('dashboard-view').classList.add('hidden');
  $('subject-view').classList.remove('hidden');

  $('subject-title').textContent = subject.name;
  const count = subject.chapters.length;
  $('subject-chapter-count').textContent = `${count} chapter${count !== 1 ? 's' : ''}`;

  const sPct = calcSubjectPct(subject);
  $('subject-pct').textContent = sPct + '%';
  setProgress($('subject-bar'), sPct);

  renderChaptersTable(subject);
}

// ═══════════════════════════════════════════════════════════
// CHAPTERS TABLE
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

  subject.chapters.forEach(chapter => tbody.appendChild(buildChapterRow(subject.id, chapter)));
}

function buildChapterRow(subjectId, chapter) {
  const pct      = calcChapterPct(chapter);
  const color    = pctColor(pct);
  const complete = isChapterComplete(chapter);

  const tr = document.createElement('tr');
  tr.dataset.chapterId = chapter.id;
  if (complete) tr.classList.add('chapter-complete');

  const boolFields = [
    ['concepts','check-concepts'], ['illustrations','check-illus'],
    ['tyk','check-tyk'], ['rtp','check-rtp'], ['mtp','check-mtp'], ['pyq','check-pyq'],
  ];

  const boolCells = boolFields.map(([field, cls]) => `
    <td class="col-bool"><div class="check-wrap">
      <input type="checkbox" class="custom-check ${cls}"
        data-field="${field}" data-chapter="${chapter.id}" data-subject="${subjectId}"
        ${chapter[field] ? 'checked' : ''}
        title="${field.charAt(0).toUpperCase() + field.slice(1)}" />
    </div></td>`).join('');

  tr.innerHTML = `
    <td class="col-name">${escapeHtml(chapter.name)}</td>
    ${boolCells}
    <td class="col-rev">
      <div class="revision-cell">
        <button class="rev-btn" data-action="rev-dec" data-chapter="${chapter.id}" data-subject="${subjectId}">−</button>
        <span class="rev-count ${chapter.revisionCount === 0 ? 'zero' : ''}">${chapter.revisionCount}</span>
        <button class="rev-btn" data-action="rev-inc" data-chapter="${chapter.id}" data-subject="${subjectId}">+</button>
      </div>
    </td>
    <td class="col-progress">
      <div class="chapter-progress-wrap">
        <div class="chapter-bar-track"><div class="chapter-bar-fill" style="width:${pct}%; background:${color}"></div></div>
        <span class="chapter-pct-label" style="color:${color}">${pct}%</span>
      </div>
    </td>
    <td class="col-actions">
      <div class="row-actions">
        <button class="icon-btn" data-action="edit-chapter" data-chapter="${chapter.id}" data-subject="${subjectId}" title="Edit">✏️</button>
        <button class="icon-btn danger" data-action="del-chapter" data-chapter="${chapter.id}" data-subject="${subjectId}" title="Delete">🗑️</button>
      </div>
    </td>`;
  return tr;
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════

function selectDashboard() {
  State.activeSubjectId = null;
  renderSidebar();
  renderDashboard();
}

function selectSubject(id) {
  State.activeSubjectId = id;
  renderSidebar();
  renderSubjectView();
}

// ═══════════════════════════════════════════════════════════
// SUBJECT ACTIONS
// ═══════════════════════════════════════════════════════════

async function handleAddSubject() {
  const name = await showInputModal('Add New Subject');
  if (!name) return;
  try {
    const s = await API.addSubject(name);
    s.chapters = s.chapters || [];
    State.subjects.push(s);
    renderSidebar();
    selectSubject(s.id);
    showToast(`Subject "${name}" added.`);
  } catch (err) { showToast(err.message, 'error'); }
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
    showToast('Subject updated.');
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleDeleteSubject() {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);
  if (!subject) return;
  const ok = await showConfirm('Delete Subject', `Delete "${subject.name}" and all its chapters? This cannot be undone.`);
  if (!ok) return;
  try {
    await API.deleteSubject(subject.id);
    State.subjects = State.subjects.filter(s => s.id !== subject.id);
    selectDashboard();
    showToast('Subject deleted.');
  } catch (err) { showToast(err.message, 'error'); }
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
    State.subjects.find(s => s.id === State.activeSubjectId).chapters.push(chapter);
    renderSidebar();
    renderSubjectView();
    showToast(`Chapter "${name}" added.`);
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleEditChapter(subjectId, chapterId) {
  const chapter = State.subjects.find(s => s.id === subjectId)?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  const name = await showInputModal('Edit Chapter Name', chapter.name);
  if (!name || name === chapter.name) return;
  try {
    await API.updateChapter(subjectId, chapterId, { name });
    chapter.name = name;
    renderSidebar();
    renderSubjectView();
    showToast('Chapter updated.');
  } catch (err) { showToast(err.message, 'error'); }
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
  } catch (err) { showToast(err.message, 'error'); }
}

async function handleToggleField(subjectId, chapterId, field, value) {
  const subject = State.subjects.find(s => s.id === subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  const prev = chapter[field];
  chapter[field] = value;
  try {
    await API.updateChapter(subjectId, chapterId, { [field]: value });
    refreshRowProgress(chapterId);
    refreshSubjectAndOverall();
  } catch (err) {
    chapter[field] = prev;
    showToast('Failed to save. Please retry.', 'error');
    const cb = document.querySelector(`input[data-field="${field}"][data-chapter="${chapterId}"]`);
    if (cb) cb.checked = prev;
  }
}

async function handleRevision(subjectId, chapterId, delta) {
  const subject = State.subjects.find(s => s.id === subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  const newCount = Math.max(0, chapter.revisionCount + delta);
  if (newCount === chapter.revisionCount) return;
  const prev = chapter.revisionCount;
  chapter.revisionCount = newCount;

  const row = document.querySelector(`tr[data-chapter-id="${chapterId}"]`);
  if (row) {
    const el = row.querySelector('.rev-count');
    if (el) { el.textContent = newCount; el.className = `rev-count ${newCount === 0 ? 'zero' : ''}`; }
  }

  try {
    await API.updateChapter(subjectId, chapterId, { revisionCount: newCount });
    refreshRowProgress(chapterId);
    refreshSubjectAndOverall();
  } catch (err) {
    chapter.revisionCount = prev;
    showToast('Failed to save revision. Please retry.', 'error');
    if (row) { const el = row.querySelector('.rev-count'); if (el) el.textContent = prev; }
  }
}

// ═══════════════════════════════════════════════════════════
// INCREMENTAL REFRESH HELPERS
// ═══════════════════════════════════════════════════════════

function refreshRowProgress(chapterId) {
  const subject  = State.subjects.find(s => s.id === State.activeSubjectId);
  const chapter  = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  const pct      = calcChapterPct(chapter);
  const color    = pctColor(pct);
  const complete = isChapterComplete(chapter);
  const row      = document.querySelector(`tr[data-chapter-id="${chapterId}"]`);
  if (!row) return;
  const bar   = row.querySelector('.chapter-bar-fill');
  const label = row.querySelector('.chapter-pct-label');
  if (bar)   { bar.style.width = pct + '%'; bar.style.background = color; }
  if (label) { label.textContent = pct + '%'; label.style.color = color; }
  complete ? row.classList.add('chapter-complete') : row.classList.remove('chapter-complete');
}

function refreshSubjectAndOverall() {
  const subject = State.subjects.find(s => s.id === State.activeSubjectId);
  if (!subject) return;

  const sPct = calcSubjectPct(subject);
  $('subject-pct').textContent = sPct + '%';
  setProgress($('subject-bar'), sPct);

  const overall = calcOverallPct(State.subjects);
  $('overall-pct').textContent = overall + '%';
  setProgress($('overall-bar'), overall);

  const navItem = document.querySelector(`.subject-nav-item[data-id="${subject.id}"]`);
  if (navItem) {
    const pctEl = navItem.querySelector('.subject-nav-pct');
    const fill  = navItem.querySelector('.fill');
    if (pctEl) pctEl.textContent = sPct + '%';
    if (fill)  fill.style.width  = sPct + '%';
  }
  renderDateUI();
}

// ═══════════════════════════════════════════════════════════
// EVENT DELEGATION
// ═══════════════════════════════════════════════════════════

function attachMainPanelEvents() {
  const panel = $('main-panel');

  panel.addEventListener('change', e => {
    const cb = e.target;
    if (cb.type === 'checkbox' && cb.dataset.field) {
      handleToggleField(cb.dataset.subject, cb.dataset.chapter, cb.dataset.field, cb.checked);
    }
  });

  panel.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, subject: subId, chapter: chapId } = btn.dataset;
    if (action === 'rev-inc')      handleRevision(subId, chapId, +1);
    if (action === 'rev-dec')      handleRevision(subId, chapId, -1);
    if (action === 'edit-chapter') handleEditChapter(subId, chapId);
    if (action === 'del-chapter')  handleDeleteChapter(subId, chapId);
  });
}

// ═══════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

async function init() {
  try {
    const [config, subjects] = await Promise.all([API.getConfig(), API.getSubjects()]);
    State.config   = config;
    State.subjects = subjects;
  } catch (err) {
    showToast('Could not connect to server.', 'error');
    State.subjects = [];
  }

  // Static button bindings
  $('btn-add-subject').addEventListener('click', handleAddSubject);
  $('btn-edit-subject').addEventListener('click', handleEditSubject);
  $('btn-delete-subject').addEventListener('click', handleDeleteSubject);
  $('btn-add-chapter').addEventListener('click', handleAddChapter);

  // Sidebar delegation (edit dates + brand edit button)
  $('sidebar').addEventListener('click', e => {
    if (e.target.closest('#btn-edit-dates')) handleEditDates();
    if (e.target.closest('#btn-edit-brand')) handleEditBrand();
  });

  attachMainPanelEvents();

  // Render brand name from config
  renderBrand();

  // Render sidebar
  renderSidebar();

  // Always open on dashboard
  selectDashboard();
}

document.addEventListener('DOMContentLoaded', init);
