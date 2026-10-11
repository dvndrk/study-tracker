import { $, escapeHtml, setProgress } from './util.js';
import {
  State, activeSubject, DEFAULT_TITLE, DEFAULT_SUBTITLE,
} from './state.js';
import {
  calcChapterPct, calcSubjectPct, calcOverallPct, isChapterComplete, isChapterRevised,
  calcDaysRemaining, calcPace, paceText, pctColor, formatDate,
} from './calc.js';

// Rendering only. Clicks are handled by delegation in main.js via data-* attributes,
// so nothing in here needs to know about actions or navigation.

// ── Brand ──────────────────────────────────────────────────

export function renderBrand() {
  const title = State.config.brandTitle || DEFAULT_TITLE;
  const subtitle = State.config.brandSubtitle || DEFAULT_SUBTITLE;
  $('brand-title').textContent = title;
  $('brand-subtitle').textContent = subtitle;
  document.title = `${title} ${subtitle}`;
}

// ── Sidebar: target date + pace ────────────────────────────

export function renderDateUI() {
  const { startDate, targetDate } = State.config;
  const daysRow = $('days-remaining-row');

  if (targetDate) {
    $('target-date-value').textContent = formatDate(targetDate);
    const days = calcDaysRemaining(targetDate);
    daysRow.classList.remove('hidden');
    const n = Math.abs(days);
    const unit = `day${n !== 1 ? 's' : ''}`;
    $('days-remaining-text').textContent =
      days > 0 ? `${n} ${unit} remaining` : days === 0 ? 'Target date is today' : `${n} ${unit} past target`;
  } else {
    $('target-date-value').textContent = 'Not set — click Edit';
    daysRow.classList.add('hidden');
  }

  const paceEl = $('pace-indicator');
  const pace = calcPace(startDate, targetDate, calcOverallPct(State.subjects));
  if (!pace) { paceEl.classList.add('hidden'); return; }
  paceEl.className = pace.kind;
  paceEl.textContent = paceText(pace);
}

// ── Sidebar: navigation list ───────────────────────────────

export function renderSidebar() {
  const list = $('subject-list');
  list.innerHTML = '';

  const dash = document.createElement('div');
  dash.className = `dashboard-nav-item${State.activeSubjectId === null ? ' active' : ''}`;
  dash.dataset.nav = 'dashboard';
  dash.innerHTML = '<span>📊</span><span>Dashboard</span>';
  list.appendChild(dash);

  if (State.subjects.length) {
    const divider = document.createElement('div');
    divider.className = 'nav-divider';
    list.appendChild(divider);
  }

  const last = State.subjects.length - 1;
  State.subjects.forEach((subject, i) => {
    const pct = calcSubjectPct(subject);
    const item = document.createElement('div');
    item.className = `subject-nav-item${subject.id === State.activeSubjectId ? ' active' : ''}`;
    item.dataset.subjectId = subject.id;
    item.innerHTML = `
      <div class="subject-nav-inner">
        <div class="subject-nav-row">
          <span class="subject-nav-name">${escapeHtml(subject.name)}</span>
          <span class="subject-nav-pct">${pct}%</span>
          <span class="nav-move">
            <button type="button" class="mini-btn" data-move-subject="-1" title="Move up" aria-label="Move subject up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="mini-btn" data-move-subject="1" title="Move down" aria-label="Move subject down" ${i === last ? 'disabled' : ''}>↓</button>
          </span>
        </div>
        <div class="subject-nav-mini-bar"><div class="fill" style="width:${pct}%"></div></div>
      </div>`;
    list.appendChild(item);
  });

  const overall = calcOverallPct(State.subjects);
  $('overall-pct').textContent = overall + '%';
  setProgress($('overall-bar'), overall);
  renderDateUI();
}

// ── Dashboard ──────────────────────────────────────────────

export function renderDashboard() {
  $('dashboard-view').classList.remove('hidden');
  $('subject-view').classList.add('hidden');

  const subjects = State.subjects;
  const overall = calcOverallPct(subjects);

  const totalChapters = subjects.reduce((n, s) => n + s.chapters.length, 0);
  const doneChapters = subjects.reduce((n, s) => n + s.chapters.filter(c => isChapterComplete(c, s)).length, 0);

  $('dash-overall-pct').textContent = overall + '%';
  $('dash-subjects-count').textContent = subjects.length;
  $('dash-chapters-total').textContent = totalChapters;
  $('dash-chapters-done').textContent = doneChapters;
  setProgress($('dash-overall-bar'), overall);

  const { startDate, targetDate } = State.config;
  const dateRow = $('dashboard-date-row');
  if (startDate || targetDate) {
    dateRow.classList.remove('hidden');
    $('dash-start-date').textContent = formatDate(startDate);
    $('dash-target-date').textContent = formatDate(targetDate);

    const days = calcDaysRemaining(targetDate);
    $('dash-days-remaining').textContent =
      days === null ? '—' : days > 0 ? `${days} days` : days === 0 ? 'Today' : `${Math.abs(days)}d overdue`;

    const pace = calcPace(startDate, targetDate, overall);
    const badge = $('dash-pace-badge');
    badge.className = `dash-pace-badge${pace ? ' ' + pace.kind : ''}`;
    badge.textContent = pace ? paceText(pace) : '—';
  } else {
    dateRow.classList.add('hidden');
  }

  const cards = $('dashboard-subject-cards');
  cards.innerHTML = '';
  if (!subjects.length) {
    cards.innerHTML = '<p class="empty-note">No subjects yet. Use <strong>+ Add Subject</strong> in the sidebar to start.</p>';
    return;
  }
  subjects.forEach(subject => {
    const pct = calcSubjectPct(subject);
    const done = subject.chapters.filter(c => isChapterComplete(c, subject)).length;
    const card = document.createElement('div');
    card.className = 'subject-card';
    card.dataset.subjectId = subject.id;
    card.innerHTML = `
      <div class="subject-card-name">${escapeHtml(subject.name)}</div>
      <div class="subject-card-meta">
        <span>${done}/${subject.chapters.length} chapters done</span>
        <span class="subject-card-pct">${pct}%</span>
      </div>
      <div class="chapter-bar-track">
        <div class="chapter-bar-fill" style="width:${pct}%; background:${pctColor(pct)}"></div>
      </div>`;
    cards.appendChild(card);
  });
}

// ── Subject view ───────────────────────────────────────────

/** Returns false if there is no active subject (caller falls back to the dashboard). */
export function renderSubjectView() {
  const subject = activeSubject();
  if (!subject) return false;

  $('dashboard-view').classList.add('hidden');
  $('subject-view').classList.remove('hidden');

  $('subject-title').textContent = subject.name;
  const n = subject.chapters.length;
  $('subject-chapter-count').textContent = `${n} chapter${n !== 1 ? 's' : ''}`;

  const pct = calcSubjectPct(subject);
  $('subject-pct').textContent = pct + '%';
  setProgress($('subject-bar'), pct);

  renderChaptersTable(subject);
  return true;
}

function legendItem(text, dotStyle) {
  const item = document.createElement('span');
  item.className = 'legend-item';
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.background = dotStyle;
  const label = document.createElement('span');
  label.textContent = text;
  item.append(dot, label);
  return item;
}

function renderChaptersTable(subject) {
  const head = $('chapters-thead-row');
  const tbody = $('chapters-tbody');
  head.innerHTML = '';
  tbody.innerHTML = '';

  const addHeader = (text, cls, title = '') => {
    const th = document.createElement('th');
    th.className = cls;
    th.textContent = text;
    if (title) th.title = title;
    head.appendChild(th);
  };
  addHeader('Chapter', 'col-name');
  subject.params.forEach(p => addHeader(p.label, 'col-bool', p.name));
  addHeader('REV', 'col-rev', 'Revision count');
  addHeader('Progress', 'col-progress');
  addHeader('', 'col-actions');

  const legend = $('table-legend');
  legend.innerHTML = '';
  subject.params.forEach(p => legend.appendChild(legendItem(`${p.label} — ${p.name}`, 'var(--accent)')));
  legend.appendChild(legendItem('Green row = revised at least once', 'var(--green)'));

  const empty = subject.chapters.length === 0;
  $('no-chapters').classList.toggle('hidden', !empty);
  $('chapters-table-wrap').classList.toggle('hidden', empty);
  if (empty) return;

  const last = subject.chapters.length - 1;
  subject.chapters.forEach((chapter, i) => tbody.appendChild(buildChapterRow(subject, chapter, i, last)));
}

function buildChapterRow(subject, chapter, index, last) {
  const pct = calcChapterPct(chapter, subject);
  const color = pctColor(pct);
  const sid = escapeHtml(subject.id);
  const cid = escapeHtml(chapter.id);

  const tr = document.createElement('tr');
  tr.dataset.chapterId = chapter.id;
  tr.classList.toggle('chapter-revised', isChapterRevised(chapter));

  const paramCells = subject.params.map(p => `
    <td class="col-bool"><div class="check-wrap">
      <input type="checkbox" class="custom-check"
        data-param-id="${escapeHtml(p.id)}" data-chapter="${cid}" data-subject="${sid}"
        ${chapter.params?.[p.id] === true ? 'checked' : ''}
        title="${escapeHtml(p.name)}" aria-label="${escapeHtml(p.name)}" />
    </div></td>`).join('');

  tr.innerHTML = `
    <td class="col-name">${escapeHtml(chapter.name)}</td>
    ${paramCells}
    <td class="col-rev"><div class="revision-cell">
      <button type="button" class="rev-btn" data-action="rev-dec" data-chapter="${cid}" data-subject="${sid}" aria-label="Decrease revisions">−</button>
      <span class="rev-count ${chapter.revisionCount === 0 ? 'zero' : ''}">${chapter.revisionCount}</span>
      <button type="button" class="rev-btn" data-action="rev-inc" data-chapter="${cid}" data-subject="${sid}" aria-label="Increase revisions">+</button>
    </div></td>
    <td class="col-progress"><div class="chapter-progress-wrap">
      <div class="chapter-bar-track"><div class="chapter-bar-fill" style="width:${pct}%; background:${color}"></div></div>
      <span class="chapter-pct-label" style="color:${color}">${pct}%</span>
    </div></td>
    <td class="col-actions"><div class="row-actions">
      <button type="button" class="icon-btn" data-action="move-up" data-chapter="${cid}" data-subject="${sid}" title="Move up" aria-label="Move chapter up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="icon-btn" data-action="move-down" data-chapter="${cid}" data-subject="${sid}" title="Move down" aria-label="Move chapter down" ${index === last ? 'disabled' : ''}>↓</button>
      <button type="button" class="icon-btn" data-action="edit-chapter" data-chapter="${cid}" data-subject="${sid}" title="Rename chapter" aria-label="Rename chapter">✏️</button>
      <button type="button" class="icon-btn danger" data-action="del-chapter" data-chapter="${cid}" data-subject="${sid}" title="Delete chapter" aria-label="Delete chapter">🗑️</button>
    </div></td>`;
  return tr;
}

// ── Incremental refresh (no full re-render when ticking a box) ──

export function refreshRowProgress(chapterId) {
  const subject = activeSubject();
  const chapter = subject?.chapters.find(c => c.id === chapterId);
  const row = document.querySelector(`tr[data-chapter-id="${CSS.escape(chapterId)}"]`);
  if (!chapter || !row) return;

  const pct = calcChapterPct(chapter, subject);
  const color = pctColor(pct);
  const bar = row.querySelector('.chapter-bar-fill');
  const label = row.querySelector('.chapter-pct-label');
  const rev = row.querySelector('.rev-count');
  if (bar) { bar.style.width = pct + '%'; bar.style.background = color; }
  if (label) { label.textContent = pct + '%'; label.style.color = color; }
  if (rev) { rev.textContent = chapter.revisionCount; rev.classList.toggle('zero', chapter.revisionCount === 0); }
  row.classList.toggle('chapter-revised', isChapterRevised(chapter));
}

export function refreshSubjectAndOverall() {
  const subject = activeSubject();
  if (!subject) return;

  const pct = calcSubjectPct(subject);
  $('subject-pct').textContent = pct + '%';
  setProgress($('subject-bar'), pct);

  const overall = calcOverallPct(State.subjects);
  $('overall-pct').textContent = overall + '%';
  setProgress($('overall-bar'), overall);

  const nav = document.querySelector(`.subject-nav-item[data-subject-id="${CSS.escape(subject.id)}"]`);
  if (nav) {
    nav.querySelector('.subject-nav-pct').textContent = pct + '%';
    nav.querySelector('.fill').style.width = pct + '%';
  }
  renderDateUI();
}
