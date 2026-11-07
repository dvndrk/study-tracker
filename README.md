# dvndrk Study Tracker

A customizable, offline-first study tracker built with Node.js, Express, HTML, CSS, and vanilla JavaScript.

## Features

- **Dashboard & Pace Tracking**: Real-time overall progress bar, summary metrics, target date countdown, and dynamic pace calculation (Ahead, Behind, or On Track).
- **Custom Subjects & Parameters**: Create and reorder subjects with 1 to 30 custom tracking parameters (e.g., Theory, Notes, Exercises, PYQs) with custom labels and column orders.
- **Chapter Tracking & Revisions**: Chapter matrix with per-parameter checkboxes, color-coded progress bars, dedicated revision counter (`+`/`−`), and green row highlights for revised chapters.
- **Search & Filters**: Instant chapter name search, filter pills (All, Pending, Complete, Revised), and `/` keyboard shortcut.
- **Completed Chapters**: Collapsible dashboard overview of all completed chapters grouped by subject with revision status.
- **Customizable UI**: Editable app name and subtitle, custom logo support (`logo.png`), and Dark/Light mode toggle with persistence.
- **Offline & Safe Storage**: Local JSON storage with atomic file writes (`.tmp` swap), automatic startup backups (`subjects.bak.json`), and crash protection.

---

## Requirements

- **Node.js**: `>= 24.0.0`
- **Browser**: Any modern web browser

---

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dvndrk/study-tracker
   cd study-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```
   *On Windows, you can also double-click `start.bat` to launch and open the browser automatically.*

4. **Open in browser**:
   Navigate to [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the Express server to listen on. |
| `DATA_DIR` | `./data` | Directory where data and backup JSON files are saved. |

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
|---|---|---|
| `/` | Subject View | Focus and select chapter search input. |
| `Esc` | Search Input | Clear search filter. |

---

## Data & Privacy

All study data is kept strictly local in the `data/` directory:
- `data/subjects.json`: Active application data.
- `data/subjects.bak.json`: Startup backup copy.

The `data/` folder is excluded by `.gitignore` to keep personal study data off Git. The server binds strictly to `127.0.0.1`.

---

## Development Status

Hobby project to learn building so no status.
