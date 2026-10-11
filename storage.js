import fs from 'node:fs';
import path from 'node:path';

/**
 * Small JSON file store.
 *  - Writes are atomic (temp file, then rename), so a crash can't leave a half-written file.
 *  - A file that can't be parsed is NEVER treated as empty. We throw, so it can't be overwritten.
 *  - One backup copy (subjects.bak.json) is refreshed at startup from a file known to be valid.
 */

export function defaultConfig() {
  return { startDate: '', targetDate: '', brandTitle: '', brandSubtitle: '' };
}

export function createStore(dataDir) {
  const file = path.join(dataDir, 'subjects.json');
  const backup = path.join(dataDir, 'subjects.bak.json');
  const temp = path.join(dataDir, 'subjects.tmp.json');

  function normalise(parsed) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Data file has an unrecognised format.');
    }
    parsed.config = { ...defaultConfig(), ...(parsed.config || {}) };
    parsed.subjects = Array.isArray(parsed.subjects) ? parsed.subjects : [];
    parsed.subjects.forEach(subject => {
      subject.params = Array.isArray(subject.params) ? subject.params : [];
      subject.chapters = Array.isArray(subject.chapters) ? subject.chapters : [];
      subject.chapters.forEach(chapter => {
        chapter.params = chapter.params && typeof chapter.params === 'object' ? chapter.params : {};
        subject.params.forEach(p => { if (chapter.params[p.id] === undefined) chapter.params[p.id] = false; });
        chapter.revisionCount = Math.max(0, Number(chapter.revisionCount) || 0);
      });
    });
    return parsed;
  }

  function read() {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (err) {
      throw new Error(`Cannot read data file: ${err.message}`);
    }
    try {
      return normalise(JSON.parse(text));
    } catch (err) {
      throw new Error(
        `Data file is damaged (${err.message}). Nothing was changed. ` +
        `Restore data/subjects.bak.json over data/subjects.json, then restart.`
      );
    }
  }

  function write(data) {
    fs.writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(temp, file);
  }

  /** Create the file if missing, verify it if present, refresh the backup. Throws if damaged. */
  function init() {
    fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(file)) {
      write({ config: defaultConfig(), subjects: [] });
      return;
    }
    read(); // throws if damaged — the server then refuses to start rather than risk overwriting
    fs.copyFileSync(file, backup);
  }

  return { read, write, init, file };
}
