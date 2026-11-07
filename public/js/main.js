/**
 * dvndrk Study Tracker — client entry point.
 * Plain ES modules, no build step.
 *   util / calc / api / state   — helpers, pure maths, server calls, shared state
 *   modals                      — toast, overlay manager, dialogs
 *   render                      — turns state into DOM (no click handling)
 *   actions                     — everything the user can do
 *   main                        — wires events and starts the app
 */
import { $ } from './util.js';
import { API } from './api.js';
import { State } from './state.js';
import { showToast } from './modals.js';
import { renderBrand, applyChapterFilter } from './render.js';
import * as A from './actions.js';

function bindEvents() {
  $('btn-add-subject').addEventListener('click', A.handleAddSubject);
  $('btn-edit-subject').addEventListener('click', A.handleEditSubject);
  $('btn-delete-subject').addEventListener('click', A.handleDeleteSubject);
  $('btn-manage-params').addEventListener('click', A.handleManageParams);
  $('btn-add-chapter').addEventListener('click', A.handleAddChapter);
  $('subject-create-confirm').addEventListener('click', A.submitNewSubject);
  $('subject-create-cancel').addEventListener('click', A.cancelCreateSubject);
  $('btn-create-add-param').addEventListener('click', A.addParamToCreateForm);
  $('params-save').addEventListener('click', A.saveManagedParams);
  $('params-cancel').addEventListener('click', A.cancelManageParams);
  $('btn-manage-add-param').addEventListener('click', A.addParamToManageForm);
  A.attachParamEditor($('create-param-rows'));
  A.attachParamEditor($('manage-param-rows'));

  // Theme toggle
  const themeBtn = $('btn-toggle-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      const next = isDark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
    });
  }

  // Chapter search & filter
  const searchInput = $('chapter-search');
  const searchClear = $('chapter-search-clear');
  if (searchInput) {
    searchInput.addEventListener('input', () => applyChapterFilter());
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        applyChapterFilter();
      }
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      applyChapterFilter();
    });
  }

  const filterPills = $('chapter-filter-pills');
  if (filterPills) {
    filterPills.addEventListener('click', e => {
      const pill = e.target.closest('.filter-pill');
      if (!pill || pill.classList.contains('active')) return;
      filterPills.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      applyChapterFilter();
    });
  }

  // Press '/' anywhere outside inputs to quickly filter chapters
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) && State.activeSubjectId !== null) {
      const input = $('chapter-search');
      if (input && !input.closest('.hidden')) {
        e.preventDefault();
        input.focus();
        input.select();
      }
    }
  });

  $('sidebar').addEventListener('click', e => {
    if (e.target.closest('#btn-edit-brand')) return A.handleEditBrand();
    if (e.target.closest('#btn-edit-dates')) return A.handleEditDates();

    const item = e.target.closest('.subject-nav-item');
    const move = e.target.closest('[data-move-subject]');
    if (move) { // a click on a move button never selects the subject, even if the button is disabled
      if (item && !move.disabled) A.handleMoveSubject(item.dataset.subjectId, Number(move.dataset.moveSubject));
      return;
    }
    if (item) return A.selectSubject(item.dataset.subjectId);
    if (e.target.closest('[data-nav="dashboard"]')) A.selectDashboard();
  });
  const panel = $('main-panel');
  panel.addEventListener('change', e => {
    const box = e.target;
    if (box.type === 'checkbox' && box.dataset.paramId) {
      A.handleToggleField(box.dataset.subject, box.dataset.chapter, box.dataset.paramId, box.checked);
    }
  });
  panel.addEventListener('click', e => {
    const card = e.target.closest('.subject-card');
    if (card) return A.selectSubject(card.dataset.subjectId);

    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    const { action, subject, chapter } = btn.dataset;
    if (action === 'rev-inc') A.handleRevision(subject, chapter, +1);
    else if (action === 'rev-dec') A.handleRevision(subject, chapter, -1);
    else if (action === 'move-up') A.handleMoveChapter(subject, chapter, -1);
    else if (action === 'move-down') A.handleMoveChapter(subject, chapter, +1);
    else if (action === 'edit-chapter') A.handleEditChapter(subject, chapter);
    else if (action === 'del-chapter') A.handleDeleteChapter(subject, chapter);
  });
}

async function init() {
  bindEvents();
  try {
    [State.config, State.subjects] = await Promise.all([API.getConfig(), API.getSubjects()]);
  } catch (err) {
    // Stays on screen: e.g. a damaged data file must not be missed.
    showToast(err.message, 'error', 0);
  }
  renderBrand();
  A.selectDashboard();
}

init();
