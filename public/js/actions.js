import { $, escapeHtml, newId } from './util.js';
import { API } from './api.js';
import { State, findSubject, activeSubject, DEFAULT_TITLE, DEFAULT_SUBTITLE } from './state.js';
import {
  showToast, showInputModal, showConfirm, showDateModal, showBrandModal, openOverlay, closeOverlay,
} from './modals.js';
import {
  renderBrand, renderDateUI, renderSidebar, renderDashboard, renderSubjectView,
  refreshRowProgress, refreshSubjectAndOverall,
} from './render.js';

// ── Navigation ─────────────────────────────────────────────

export function selectDashboard() {
  State.activeSubjectId = null;
  renderSidebar();
  renderDashboard();
}

export function selectSubject(id) {
  State.activeSubjectId = id;
  renderSidebar();
  if (!renderSubjectView()) selectDashboard();
}

// ── Brand & dates ──────────────────────────────────────────

export async function handleEditBrand() {
  const result = await showBrandModal({
    title: State.config.brandTitle || DEFAULT_TITLE,
    subtitle: State.config.brandSubtitle || DEFAULT_SUBTITLE,
  });
  if (!result) return;
  try {
    State.config = { ...State.config, ...(await API.saveConfig({ brandTitle: result.title, brandSubtitle: result.subtitle })) };
    renderBrand();
    showToast('Name updated.');
  } catch (err) { showToast(err.message, 'error'); }
}

export async function handleEditDates() {
  const result = await showDateModal(State.config);
  if (!result) return;
  try {
    State.config = { ...State.config, ...(await API.saveConfig(result)) };
    renderDateUI();
    if (State.activeSubjectId === null) renderDashboard();
    showToast('Study dates saved.');
  } catch (err) { showToast(err.message, 'error'); }
}

// ── Parameter editor (shared by "Add Subject" and "Manage Parameters") ──

function appendParamRow(container, param = { id: newId(), name: '', label: '' }) {
  const row = document.createElement('div');
  row.className = 'param-editor-row';
  row.dataset.paramId = param.id;
  row.innerHTML = `
    <input class="param-full-name" type="text" maxlength="80" placeholder="Full name" aria-label="Parameter full name" value="${escapeHtml(param.name || '')}">
    <input class="param-short-label" type="text" maxlength="12" placeholder="Short label" aria-label="Short label" value="${escapeHtml(param.label || '')}">
    <div class="param-row-actions">
      <button type="button" class="icon-btn" data-param-move="up" title="Move up" aria-label="Move parameter up">↑</button>
      <button type="button" class="icon-btn" data-param-move="down" title="Move down" aria-label="Move parameter down">↓</button>
      <button type="button" class="icon-btn danger" data-param-remove title="Remove parameter" aria-label="Remove parameter">×</button>
    </div>`;
  container.appendChild(row);
  return row;
}

function collectParamRows(container) {
  return [...container.querySelectorAll('.param-editor-row')].map(row => ({
    id: row.dataset.paramId,
    name: row.querySelector('.param-full-name').value.trim(),
    label: row.querySelector('.param-short-label').value.trim(),
  }));
}

export function attachParamEditor(container) {
  container.addEventListener('click', e => {
    const row = e.target.closest('.param-editor-row');
    if (!row) return;
    const move = e.target.closest('[data-param-move]')?.dataset.paramMove;

    if (e.target.closest('[data-param-remove]')) {
      if (container.querySelectorAll('.param-editor-row').length <= 1) {
        showToast('Each subject must have at least one parameter.', 'error');
        return;
      }
      row.remove();
    } else if (move === 'up' && row.previousElementSibling) {
      container.insertBefore(row, row.previousElementSibling);
    } else if (move === 'down' && row.nextElementSibling) {
      container.insertBefore(row.nextElementSibling, row);
    }
  });
}

function validateParamList(params) {
  if (!params.length) return 'Add at least one parameter.';
  const labels = new Set();
  for (const p of params) {
    if (!p.name) return 'Every parameter needs a full name.';
    if (!p.label) return `Add a short label for "${p.name}".`;
    if (p.label.length > 12) return 'Short labels must be 12 characters or fewer.';
    const key = p.label.toLowerCase();
    if (labels.has(key)) return `Short label "${p.label}" is duplicated.`;
    labels.add(key);
  }
  return null;
}

export function addParamToCreateForm() { appendParamRow($('create-param-rows')); }
export function addParamToManageForm() { appendParamRow($('manage-param-rows')); }

// ── Subjects ───────────────────────────────────────────────

export function handleAddSubject() {
  $('new-subject-name').value = '';
  const rows = $('create-param-rows');
  rows.innerHTML = '';
  appendParamRow(rows);
  openOverlay($('subject-create-overlay'), { focus: '#new-subject-name', onSubmit: submitNewSubject });
}

export function cancelCreateSubject() { closeOverlay($('subject-create-overlay')); }

export async function submitNewSubject() {
  const name = $('new-subject-name').value.trim();
  const params = collectParamRows($('create-param-rows'));
  if (!name) { showToast('Subject name is required.', 'error'); $('new-subject-name').focus(); return; }
  const problem = validateParamList(params);
  if (problem) { showToast(problem, 'error'); return; }
  try {
    const subject = await API.addSubject(name, params);
    State.subjects.push(subject);
    closeOverlay($('subject-create-overlay'));
    selectSubject(subject.id);
    showToast(`Subject "${name}" added.`);
  } catch (err) { showToast(err.message, 'error'); }
}

export async function handleEditSubject() {
  const subject = activeSubject();
  if (!subject) return;
  const name = await showInputModal('Rename Subject', subject.name, 'Subject name');
  if (!name || name === subject.name) return;
  try {
    await API.editSubject(subject.id, { name });
    subject.name = name;
    renderSidebar();
    renderSubjectView();
    showToast('Subject renamed.');
  } catch (err) { showToast(err.message, 'error'); }
}

export function handleManageParams() {
  const subject = activeSubject();
  if (!subject) return;
  const rows = $('manage-param-rows');
  rows.innerHTML = '';
  subject.params.forEach(p => appendParamRow(rows, p));
  openOverlay($('params-overlay'), { focus: '.param-full-name', onSubmit: saveManagedParams });
}

export function cancelManageParams() { closeOverlay($('params-overlay')); }

export async function saveManagedParams() {
  const subject = activeSubject();
  if (!subject) return;
  const params = collectParamRows($('manage-param-rows'));
  const problem = validateParamList(params);
  if (problem) { showToast(problem, 'error'); return; }

  const keep = new Set(params.map(p => p.id));
  const removed = subject.params.filter(p => !keep.has(p.id));
  if (removed.length) {
    const n = subject.chapters.length;
    const ok = await showConfirm(
      'Remove parameter data?',
      `Removing ${removed.map(p => `"${p.name}"`).join(', ')} permanently deletes its completion status from ${n} chapter${n === 1 ? '' : 's'}. This cannot be undone.`,
      'Remove',
    );
    if (!ok) return;
  }
  try {
    const updated = await API.editSubject(subject.id, { params });
    subject.params = updated.params;
    subject.chapters = updated.chapters;
    closeOverlay($('params-overlay'));
    renderSidebar();
    renderSubjectView();
    showToast('Parameters updated.');
  } catch (err) { showToast(err.message, 'error'); }
}

export async function handleDeleteSubject() {
  const subject = activeSubject();
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

export async function handleMoveSubject(subjectId, delta) {
  const from = State.subjects.findIndex(s => s.id === subjectId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= State.subjects.length) return;

  const before = [...State.subjects];
  [State.subjects[from], State.subjects[to]] = [State.subjects[to], State.subjects[from]];
  renderSidebar();
  if (State.activeSubjectId === null) renderDashboard();
  document.querySelector(`.subject-nav-item[data-subject-id="${CSS.escape(subjectId)}"] [data-move-subject="${delta}"]`)?.focus();

  try {
    await API.reorderSubjects(State.subjects.map(s => s.id));
  } catch (err) {
    State.subjects = before;
    renderSidebar();
    if (State.activeSubjectId === null) renderDashboard();
    showToast(`Could not save the new order: ${err.message}`, 'error');
  }
}

// ── Chapters ───────────────────────────────────────────────

export async function handleAddChapter() {
  const subject = activeSubject();
  if (!subject) return;
  const name = await showInputModal('Add Chapter', '', 'Chapter name');
  if (!name) return;
  try {
    subject.chapters.push(await API.addChapter(subject.id, name));
    renderSidebar();
    renderSubjectView();
    showToast(`Chapter "${name}" added.`);
  } catch (err) { showToast(err.message, 'error'); }
}

export async function handleEditChapter(subjectId, chapterId) {
  const chapter = findSubject(subjectId)?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  const name = await showInputModal('Rename Chapter', chapter.name, 'Chapter name');
  if (!name || name === chapter.name) return;
  try {
    await API.updateChapter(subjectId, chapterId, { name });
    chapter.name = name;
    renderSubjectView();
    showToast('Chapter renamed.');
  } catch (err) { showToast(err.message, 'error'); }
}

export async function handleDeleteChapter(subjectId, chapterId) {
  const subject = findSubject(subjectId);
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

export async function handleMoveChapter(subjectId, chapterId, delta) {
  const subject = findSubject(subjectId);
  if (!subject) return;
  const from = subject.chapters.findIndex(c => c.id === chapterId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= subject.chapters.length) return;

  const before = [...subject.chapters];
  [subject.chapters[from], subject.chapters[to]] = [subject.chapters[to], subject.chapters[from]];
  renderSubjectView();
  // Keep keyboard focus on the same button after the table is rebuilt.
  const action = delta < 0 ? 'move-up' : 'move-down';
  const sel = `tr[data-chapter-id="${CSS.escape(chapterId)}"] [data-action="`;
  const btn = document.querySelector(`${sel}${action}"]:not(:disabled)`) ||
              document.querySelector(`${sel}${delta < 0 ? 'move-down' : 'move-up'}"]:not(:disabled)`);
  btn?.focus();

  try {
    await API.reorderChapters(subjectId, subject.chapters.map(c => c.id));
  } catch (err) {
    subject.chapters = before;
    renderSubjectView();
    showToast(`Could not save the new order: ${err.message}`, 'error');
  }
}

export async function handleToggleField(subjectId, chapterId, paramId, value) {
  const subject = findSubject(subjectId);
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  if (!chapter || !subject.params.some(p => p.id === paramId)) return;

  const prev = chapter.params[paramId] === true;
  chapter.params[paramId] = value;
  refreshRowProgress(chapterId);
  refreshSubjectAndOverall();
  try {
    await API.updateChapter(subjectId, chapterId, { params: { [paramId]: value } });
  } catch (err) {
    chapter.params[paramId] = prev;
    const box = document.querySelector(`input[data-param-id="${CSS.escape(paramId)}"][data-chapter="${CSS.escape(chapterId)}"]`);
    if (box) box.checked = prev;
    refreshRowProgress(chapterId);
    refreshSubjectAndOverall();
    showToast(`Could not save: ${err.message}`, 'error');
  }
}

export async function handleRevision(subjectId, chapterId, delta) {
  const chapter = findSubject(subjectId)?.chapters.find(c => c.id === chapterId);
  if (!chapter) return;
  const prev = chapter.revisionCount;
  const next = Math.max(0, prev + delta);
  if (next === prev) return;

  chapter.revisionCount = next;
  refreshRowProgress(chapterId);
  try {
    await API.updateChapter(subjectId, chapterId, { revisionCount: next });
  } catch (err) {
    chapter.revisionCount = prev;
    refreshRowProgress(chapterId);
    showToast(`Could not save: ${err.message}`, 'error');
  }
}
