import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { exec } from 'node:child_process';
import { createStore } from './storage.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1'; // this machine only
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const store = createStore(process.env.DATA_DIR || path.join(ROOT, 'data'));

try {
  store.init();
} catch (err) {
  console.error(`\n  Cannot start: ${err.message}\n`);
  process.exit(1);
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR));

// ── Helpers ────────────────────────────────────────────────

const fail = (res, status, error) => res.status(status).json({ error });
const isDateOrEmpty = v => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)));

function cleanParams(params) {
  if (!Array.isArray(params) || params.length < 1) throw new Error('At least one parameter is required.');
  if (params.length > 30) throw new Error('A subject can have at most 30 parameters.');
  const clean = params.map(p => {
    const name = String(p?.name || '').trim();
    const label = String(p?.label || '').trim();
    if (!name) throw new Error('Every parameter needs a full name.');
    if (!label) throw new Error(`Add a short label for "${name}".`);
    if (name.length > 80) throw new Error('Parameter full names must be 80 characters or fewer.');
    if (label.length > 12) throw new Error('Short labels must be 12 characters or fewer.');
    return { id: p.id || randomUUID(), name, label };
  });
  const ids = new Set(), labels = new Set();
  for (const p of clean) {
    if (ids.has(p.id)) throw new Error('Parameter IDs must be unique.');
    if (labels.has(p.label.toLowerCase())) throw new Error(`Short label "${p.label}" is duplicated.`);
    ids.add(p.id); labels.add(p.label.toLowerCase());
  }
  return clean;
}

function createChapter(name, params) {
  const values = {};
  params.forEach(p => { values[p.id] = false; });
  return { id: randomUUID(), name, params: values, revisionCount: 0, createdAt: new Date().toISOString() };
}

/** Reorder `list` in place to follow `ids`. Returns an error message, or null on success. */
function applyOrder(list, ids) {
  if (!Array.isArray(ids) || ids.length !== list.length) return 'Order list does not match the items.';
  const byId = new Map(list.map(item => [item.id, item]));
  if (new Set(ids).size !== ids.length || ids.some(id => !byId.has(id))) return 'Order list does not match the items.';
  list.splice(0, list.length, ...ids.map(id => byId.get(id)));
  return null;
}

// ── Config ─────────────────────────────────────────────────

app.get('/config', (_req, res) => res.json(store.read().config));
app.put('/config', (req, res) => {
  const data = store.read();
  for (const key of ['startDate', 'targetDate']) {
    if (req.body[key] === undefined) continue;
    const value = String(req.body[key]);
    if (!isDateOrEmpty(value)) return fail(res, 400, 'Dates must be valid (YYYY-MM-DD).');
    data.config[key] = value;
  }
  for (const key of ['brandTitle', 'brandSubtitle']) {
    if (req.body[key] === undefined) continue;
    const value = String(req.body[key]).trim();
    if (value.length > 60) return fail(res, 400, 'Names must be 60 characters or fewer.');
    data.config[key] = value;
  }
  store.write(data);
  res.json(data.config);
});

// ── Subjects ───────────────────────────────────────────────

app.get('/subjects', (_req, res) => res.json(store.read().subjects));

app.post('/subjects', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return fail(res, 400, 'Subject name is required.');
  let params;
  try { params = cleanParams(req.body.params); } catch (err) { return fail(res, 400, err.message); }
  const data = store.read();
  const subject = { id: randomUUID(), name, params, chapters: [], createdAt: new Date().toISOString() };
  data.subjects.push(subject);
  store.write(data);
  res.status(201).json(subject);
});

// Must be declared before '/subjects/:id' so "order" isn't read as an id.
app.put('/subjects/order', (req, res) => {
  const data = store.read();
  const error = applyOrder(data.subjects, req.body.ids);
  if (error) return fail(res, 400, error);
  store.write(data);
  res.json({ success: true });
});

app.put('/subjects/:id', (req, res) => {
  const data = store.read();
  const subject = data.subjects.find(s => s.id === req.params.id);
  if (!subject) return fail(res, 404, 'Subject not found.');
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return fail(res, 400, 'Subject name is required.');
    subject.name = name;
  }
  if (req.body.params !== undefined) {
    let params;
    try { params = cleanParams(req.body.params); } catch (err) { return fail(res, 400, err.message); }
    subject.chapters.forEach(chapter => {
      const next = {};
      params.forEach(p => { next[p.id] = chapter.params?.[p.id] === true; });
      chapter.params = next;
    });
    subject.params = params;
  }
  store.write(data);
  res.json(subject);
});

app.delete('/subjects/:id', (req, res) => {
  const data = store.read();
  const index = data.subjects.findIndex(s => s.id === req.params.id);
  if (index < 0) return fail(res, 404, 'Subject not found.');
  data.subjects.splice(index, 1);
  store.write(data);
  res.json({ success: true });
});

// ── Chapters ───────────────────────────────────────────────

app.get('/subjects/:subjectId/chapters', (req, res) => {
  const subject = store.read().subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return fail(res, 404, 'Subject not found.');
  res.json(subject.chapters);
});

app.post('/subjects/:subjectId/chapters', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return fail(res, 400, 'Chapter name is required.');
  const data = store.read();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return fail(res, 404, 'Subject not found.');
  const chapter = createChapter(name, subject.params);
  subject.chapters.push(chapter);
  store.write(data);
  res.status(201).json(chapter);
});

// Declared before '/chapters/:chapterId' for the same reason as subjects.
app.put('/subjects/:subjectId/chapters/order', (req, res) => {
  const data = store.read();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return fail(res, 404, 'Subject not found.');
  const error = applyOrder(subject.chapters, req.body.ids);
  if (error) return fail(res, 400, error);
  store.write(data);
  res.json({ success: true });
});

app.put('/subjects/:subjectId/chapters/:chapterId', (req, res) => {
  const data = store.read();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return fail(res, 404, 'Subject not found.');
  const chapter = subject.chapters.find(c => c.id === req.params.chapterId);
  if (!chapter) return fail(res, 404, 'Chapter not found.');
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return fail(res, 400, 'Chapter name is required.');
    chapter.name = name;
  }
  if (req.body.revisionCount !== undefined) {
    const count = Number(req.body.revisionCount);
    if (!Number.isInteger(count) || count < 0) return fail(res, 400, 'Revision count must be a non-negative integer.');
    chapter.revisionCount = count;
  }
  if (req.body.params !== undefined) {
    if (!req.body.params || typeof req.body.params !== 'object' || Array.isArray(req.body.params)) {
      return fail(res, 400, 'Chapter params must be an object.');
    }
    subject.params.forEach(p => {
      if (req.body.params[p.id] !== undefined) chapter.params[p.id] = req.body.params[p.id] === true;
    });
  }
  store.write(data);
  res.json(chapter);
});

app.delete('/subjects/:subjectId/chapters/:chapterId', (req, res) => {
  const data = store.read();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return fail(res, 404, 'Subject not found.');
  const index = subject.chapters.findIndex(c => c.id === req.params.chapterId);
  if (index < 0) return fail(res, 404, 'Chapter not found.');
  subject.chapters.splice(index, 1);
  store.write(data);
  res.json({ success: true });
});

// ── Errors (e.g. damaged data file) come back as JSON so the UI can show them ──
app.use((err, _req, res, _next) => {
  console.error(err.message);
  fail(res, err.status || 500, err.message || 'Server error.');
});

const url = `http://localhost:${PORT}`;
app.listen(PORT, HOST, () => {
  console.log(`\ndvndrk Study Tracker running at ${url}\n`);
  if (process.argv.includes('--open') && process.platform === 'win32') exec(`start "" "${url}"`);
});
