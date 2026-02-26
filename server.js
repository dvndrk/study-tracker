/**
 * CA Final Study Tracker — server.js
 * Version 2 — adds config (startDate, targetDate) support
 * Data structure: { config: { startDate, targetDate }, subjects: [] }
 * Run: node server.js
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// process.cwd() ensures correct paths on Windows (including paths with spaces)
const ROOT       = process.cwd();
const DATA_DIR   = path.resolve(ROOT, 'data');
const DATA_FILE  = path.resolve(DATA_DIR, 'subjects.json');
const PUBLIC_DIR = path.resolve(ROOT, 'public');

console.log('Root     :', ROOT);
console.log('Public   :', PUBLIC_DIR);
console.log('Data file:', DATA_FILE);

// ─── Auto-create /data and subjects.json if missing ──────────────────────────
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('Created /data folder.');
}
if (!fs.existsSync(DATA_FILE)) {
  const initial = { config: { startDate: '', targetDate: '' }, subjects: [] };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  console.log('Created subjects.json.');
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Explicit root route for Windows compatibility
app.get('/', (req, res) => {
  res.sendFile(path.resolve(PUBLIC_DIR, 'index.html'));
});

// ─── File Helpers ─────────────────────────────────────────────────────────────

/**
 * Read full data object.
 * Also handles legacy v1 format (plain array) by migrating it automatically.
 */
function readData() {
  try {
    const raw    = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // Migrate v1 plain array → v2 object format
    if (Array.isArray(parsed)) {
      return { config: { startDate: '', targetDate: '' }, subjects: parsed };
    }

    // Ensure config key always exists with defaults
    if (!parsed.config) parsed.config = { startDate: '', targetDate: '' };
    if (!parsed.subjects) parsed.subjects = [];
    return parsed;

  } catch {
    return { config: { startDate: '', targetDate: '' }, subjects: [] };
  }
}

/** Write full data object back to file */
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Chapter Factory ──────────────────────────────────────────────────────────

function createChapter(name) {
  return {
    id: uuidv4(),
    name,
    concepts:      false,
    illustrations: false,
    tyk:           false,
    rtp:           false,
    mtp:           false,
    pyq:           false,
    revisionCount: 0,
    createdAt:     new Date().toISOString()
  };
}

// ─── Config Routes ────────────────────────────────────────────────────────────

/** GET /config — Return config object { startDate, targetDate } */
app.get('/config', (req, res) => {
  res.json(readData().config);
});

/** PUT /config — Update any config fields: startDate, targetDate, brandTitle, brandSubtitle */
app.put('/config', (req, res) => {
  const { startDate, targetDate, brandTitle, brandSubtitle } = req.body;
  const data = readData();
  if (startDate    !== undefined) data.config.startDate    = startDate;
  if (targetDate   !== undefined) data.config.targetDate   = targetDate;
  if (brandTitle   !== undefined) data.config.brandTitle   = brandTitle;
  if (brandSubtitle !== undefined) data.config.brandSubtitle = brandSubtitle;
  writeData(data);
  res.json(data.config);
});

// ─── Subject Routes ───────────────────────────────────────────────────────────

app.get('/subjects', (req, res) => {
  res.json(readData().subjects);
});

app.post('/subjects', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Subject name is required.' });
  const data = readData();
  const newSubject = {
    id:        uuidv4(),
    name:      name.trim(),
    chapters:  [],
    createdAt: new Date().toISOString()
  };
  data.subjects.push(newSubject);
  writeData(data);
  res.status(201).json(newSubject);
});

app.put('/subjects/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Subject name is required.' });
  const data    = readData();
  const subject = data.subjects.find(s => s.id === req.params.id);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  subject.name = name.trim();
  writeData(data);
  res.json(subject);
});

app.delete('/subjects/:id', (req, res) => {
  const data  = readData();
  const index = data.subjects.findIndex(s => s.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Subject not found.' });
  data.subjects.splice(index, 1);
  writeData(data);
  res.json({ success: true });
});

// ─── Chapter Routes ───────────────────────────────────────────────────────────

app.get('/subjects/:subjectId/chapters', (req, res) => {
  const data    = readData();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  res.json(subject.chapters);
});

app.post('/subjects/:subjectId/chapters', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Chapter name is required.' });
  const data    = readData();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  const chapter = createChapter(name.trim());
  subject.chapters.push(chapter);
  writeData(data);
  res.status(201).json(chapter);
});

app.put('/subjects/:subjectId/chapters/:chapterId', (req, res) => {
  const data    = readData();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  const chapter = subject.chapters.find(c => c.id === req.params.chapterId);
  if (!chapter) return res.status(404).json({ error: 'Chapter not found.' });
  const allowed = ['name', 'concepts', 'illustrations', 'tyk', 'rtp', 'mtp', 'pyq', 'revisionCount'];
  allowed.forEach(field => {
    if (req.body[field] !== undefined) chapter[field] = req.body[field];
  });
  writeData(data);
  res.json(chapter);
});

app.delete('/subjects/:subjectId/chapters/:chapterId', (req, res) => {
  const data    = readData();
  const subject = data.subjects.find(s => s.id === req.params.subjectId);
  if (!subject) return res.status(404).json({ error: 'Subject not found.' });
  const index   = subject.chapters.findIndex(c => c.id === req.params.chapterId);
  if (index === -1) return res.status(404).json({ error: 'Chapter not found.' });
  subject.chapters.splice(index, 1);
  writeData(data);
  res.json({ success: true });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅ dvndrk Study Tracker running at http://localhost:${PORT}\n`);
});
