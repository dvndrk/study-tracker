# CA Final Study Tracker

A fully offline, local web application for tracking CA Final preparation across 14 months.

## Stack
- **Backend**: Node.js + Express
- **Frontend**: HTML + CSS + Vanilla JavaScript
- **Data**: JSON files (`/data/subjects.json`) — no database needed

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
node server.js
```

### 3. Open in browser
```
http://localhost:3000
```

---

## 📁 Project Structure

```
ca-tracker/
├── server.js              ← Express backend (API + static file serving)
├── package.json
├── data/
│   └── subjects.json      ← All data stored here (auto-created)
└── public/
    ├── index.html         ← App shell
    ├── styles.css         ← Dark theme stylesheet
    └── script.js          ← Frontend logic
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subjects` | Get all subjects |
| POST | `/subjects` | Add subject |
| PUT | `/subjects/:id` | Edit subject name |
| DELETE | `/subjects/:id` | Delete subject |
| GET | `/subjects/:id/chapters` | Get chapters |
| POST | `/subjects/:id/chapters` | Add chapter |
| PUT | `/subjects/:id/chapters/:cId` | Update chapter |
| DELETE | `/subjects/:id/chapters/:cId` | Delete chapter |

---

## 📊 Chapter Tracking Fields

Each chapter tracks 7 completion criteria:

| Field | Type | Description |
|-------|------|-------------|
| Concepts | Boolean | Concept reading done |
| Illustrations | Boolean | Illustrations reviewed |
| TYK | Boolean | Test Your Knowledge done |
| RTP | Boolean | Revision Test Paper done |
| MTP | Boolean | Mock Test Paper done |
| PYQ | Boolean | Previous Year Questions done |
| Revision | Integer | Revision count (≥1 = completed) |

**Chapter %** = (completed criteria / 7) × 100  
**Subject %** = average of all chapter %  
**Overall %** = average of all subject %

---

## 🔄 Portability

Move the entire folder to any system with Node.js:
```bash
npm install && node server.js
```
All data is in `/data/subjects.json` — fully portable.

Data folder and Subjects.json file will be created automatically on first install of dependencies.
