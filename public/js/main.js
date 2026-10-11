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
import { renderBrand } from './render.js';
import * as A from './actions.js';

function bindEvents() {
  // Toolbar buttons
  $('btn-add-subject').addEventListener('click', A.handleAddSubject);
  $('btn-edit-subject').addEventListener('click', A.handleEditSubject);
  $('btn-delete-subject').addEventListener('click', A.handleDeleteSubject);
  $('btn-manage-params').addEventListener('click', A.handleManageParams);
  $('btn-add-chapter').addEventListener('click', A.handleAddChapter);

  // Subject create / parameter manager dialogs
  $('subject-create-confirm').addEventListener('click', A.submitNewSubject);
  $('subject-create-cancel').addEventListener('click', A.cancelCreateSubject);
  $('btn-create-add-param').addEventListener('click', A.addParamToCreateForm);
  $('params-save').addEventListener('click', A.saveManagedParams);
  $('params-cancel').addEventListener('click', A.cancelManageParams);
  $('btn-manage-add-param').addEventListener('click', A.addParamToManageForm);
  A.attachParamEditor($('create-param-rows'));
  A.attachParamEditor($('manage-param-rows'));

  // Sidebar: brand, dates, navigation, subject reordering
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

  // Main panel: dashboard cards, checkboxes, revision / row buttons
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
