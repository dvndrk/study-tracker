// Pure functions — no DOM, no state. Easy to reason about and to test later.

const DAY_MS = 86400000;

/** Parse "YYYY-MM-DD" as a LOCAL date (new Date('YYYY-MM-DD') would be UTC and can be off by a day). */
export function parseLocalDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** A chapter's completion is decided by its parameters only. Revisions never affect it. */
export function calcChapterPct(chapter, subject) {
  const params = subject?.params || [];
  if (!params.length) return 0;
  const done = params.filter(p => chapter.params?.[p.id] === true).length;
  return Math.round((done / params.length) * 100);
}

export function isChapterComplete(chapter, subject) {
  const params = subject?.params || [];
  return params.length > 0 && params.every(p => chapter.params?.[p.id] === true);
}

/** Revised at least once. Further revisions are only a counter. */
export function isChapterRevised(chapter) {
  return chapter.revisionCount >= 1;
}

export function calcSubjectPct(subject) {
  if (!subject.chapters.length) return 0;
  const total = subject.chapters.reduce((sum, c) => sum + calcChapterPct(c, subject), 0);
  return Math.round(total / subject.chapters.length);
}

export function calcOverallPct(subjects) {
  if (!subjects.length) return 0;
  const total = subjects.reduce((sum, s) => sum + calcSubjectPct(s), 0);
  return Math.round(total / subjects.length);
}

export function calcExpectedPct(startDate, targetDate) {
  const start = parseLocalDate(startDate);
  const target = parseLocalDate(targetDate);
  if (!start || !target) return null;
  const totalDays = (target - start) / DAY_MS;
  if (totalDays <= 0) return null;
  const elapsedDays = (startOfToday() - start) / DAY_MS;
  return Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
}

export function calcDaysRemaining(targetDate) {
  const target = parseLocalDate(targetDate);
  if (!target) return null;
  return Math.round((target - startOfToday()) / DAY_MS);
}

/** Describes pace as { kind: 'ahead' | 'behind' | 'ontrack', diff } or null if dates are not set. */
export function calcPace(startDate, targetDate, actualPct) {
  const expected = calcExpectedPct(startDate, targetDate);
  if (expected === null) return null;
  const diff = actualPct - expected;
  if (diff >= 3) return { kind: 'ahead', diff };
  if (diff <= -3) return { kind: 'behind', diff: Math.abs(diff) };
  return { kind: 'ontrack', diff: 0 };
}

export function paceText(pace) {
  if (pace.kind === 'ahead') return `▲ Ahead by ${pace.diff}%`;
  if (pace.kind === 'behind') return `▼ Behind by ${pace.diff}%`;
  return '● On Track';
}

export function pctColor(pct) {
  if (pct >= 80) return '#16a34a';
  if (pct >= 50) return '#3b7ef8';
  if (pct >= 25) return '#ea580c';
  return '#dc2626';
}

export function formatDate(iso) {
  const d = parseLocalDate(iso);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
