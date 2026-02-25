# Study Tracker

A clean, offline-first study tracker web application built with Node.js and Vanilla JavaScript. Track subjects, chapters, and multiple completion criteria — all stored locally in a JSON file with no database required.

![Study Tracker Dashboard](https://img.shields.io/badge/version-2.0-blue) ![Node.js](https://img.shields.io/badge/node-%3E%3D14.0-green) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Screenshots

> Dashboard view with subject cards, progress tracking, and pace indicator.

---

## Features

**Tracking**
- Add unlimited subjects and chapters
- 6 boolean completion parameters per chapter: Concepts, Illustrations, TYK, RTP, MTP, PYQ
- Revision counter per chapter with increment/decrement
- Auto-calculated completion % at chapter, subject, and overall level

**Dashboard**
- At-a-glance summary of all subjects
- Total and completed chapter counts
- Clickable subject cards that navigate directly to that subject
- "Needs Attention" list — chapters not yet started

**Progress & Dates**
- Set a start date and target completion date
- Days remaining counter
- Expected vs actual progress comparison (Ahead / Behind / On Track)

**Customisation**
- Editable app title and subtitle — hover over the brand name to edit
- Logo support — drop a `logo.png` into `/public` and it appears automatically
- Falls back to emoji if no logo is present

**General**
- Light theme, professional UI
- Completed chapters highlighted with a subtle green row
- Fully offline — no internet required after setup
- All data stored in a single JSON file — easy to back up and move

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | HTML + CSS + Vanilla JavaScript |
| Storage | JSON file (`data/subjects.json`) |
| Dependencies | `express`, `uuid` |

No frameworks. No build tools. No database.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) v14 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/dvndrk/study-tracker.git

# Navigate into the folder
cd study-tracker

# Install dependencies
npm install
```

### Running

```bash
node server.js
```

Then open your browser at:
```
http://localhost:3000
```

### Windows — One Click Launch

Double-click `start.bat` — opens the browser and starts the server automatically.

---

## Project Structure

```
study-tracker/
├── server.js           ← Express backend + REST API
├── package.json
├── start.bat           ← Windows one-click launcher
├── data/
│   └── subjects.json   ← All data (auto-created on first run)
└── public/
    ├── index.html
    ├── styles.css
    ├── script.js
    └── logo.png        ← Optional custom logo
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config` | Get app config |
| PUT | `/config` | Update config (dates, brand name) |
| GET | `/subjects` | Get all subjects |
| POST | `/subjects` | Create subject |
| PUT | `/subjects/:id` | Update subject |
| DELETE | `/subjects/:id` | Delete subject |
| GET | `/subjects/:id/chapters` | Get chapters |
| POST | `/subjects/:id/chapters` | Create chapter |
| PUT | `/subjects/:id/chapters/:cid` | Update chapter |
| DELETE | `/subjects/:id/chapters/:cid` | Delete chapter |

---

## Parameter Reference

Each chapter tracks six boolean parameters and one revision counter. The default labels are designed for professional exam preparation:

| Label | Full Name | Description |
|-------|-----------|-------------|
| CON | Concepts | Core concept reading done |
| ILL | Illustrations | Worked examples and illustrations reviewed |
| TYK | Test Your Knowledge | End-of-chapter practice questions attempted |
| RTP | Revision Test Paper | Official revision test paper completed |
| MTP | Mock Test Paper | Mock test paper completed |
| PYQ | Previous Year Questions | Past exam questions practiced |
| REV | Revision Count | Number of times the chapter has been revised |

> These labels work for any structured study system — not limited to any specific exam or course. Adapt them to whatever your preparation requires.

---

## Completion Logic

Each chapter tracks 7 criteria:

| Criteria | Type |
|----------|------|
| Concepts | Boolean |
| Illustrations | Boolean |
| TYK | Boolean |
| RTP | Boolean |
| MTP | Boolean |
| PYQ | Boolean |
| Revision ≥ 1 | Integer milestone |

```
Chapter %  = (completed criteria / 7) × 100
Subject %  = average of all chapter %
Overall %  = average of all subject %
Expected % = (days elapsed / total days) × 100
```

A chapter row is highlighted green when all 7 criteria are complete.

---

## Data & Portability

All data lives in `data/subjects.json`. To back up, copy that file. To move to another machine, copy the entire project folder and run `npm install` once.

The `data/` folder and `subjects.json` are auto-created on first run if missing — no manual setup needed.

---

## Customisation

**App name** — hover over the title in the sidebar, click the ✏️ pencil, enter your preferred name and subtitle. Saved immediately.

**Logo** — add a `logo.png` file to the `public/` folder. Recommended size: 36×36px or larger square PNG. Emoji fallback is shown if no logo is found.

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

---

## License

[MIT](https://github.com/dvndrk/study-tracker/blob/main/LICENSE)
