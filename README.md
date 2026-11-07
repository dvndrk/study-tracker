\# dvndrk Study Tracker



A customizable, offline-first study tracker built with Node.js, Express, HTML, CSS, and vanilla JavaScript.



\## Features



\### Dashboard \& Overview

\- \*\*Progress Tracking\*\*: Real-time overall completion percentage and animated progress bar.

\- \*\*Summary Metrics\*\*: Quick counters for overall progress, total subjects, total chapters, and completed chapters.

\- \*\*Target Date \& Countdown\*\*: Set study start and target dates with an automatic days remaining or overdue counter.

\- \*\*Dynamic Pace Indicator\*\*: Evaluates actual progress against elapsed time to show if you are \*\*Ahead\*\*, \*\*Behind\*\*, or \*\*On Track\*\*.

\- \*\*Subject Cards\*\*: Overview cards showing chapter completion ratios (`done / total`) and color-coded progress indicators.

\- \*\*Completed Chapters View\*\*: Collapsible list of completed chapters grouped by subject, detailing revision status.



\### Subjects \& Custom Parameters

\- \*\*Subject Management\*\*: Create, rename, delete, and reorder subjects directly from the sidebar.

\- \*\*Custom Tracking Criteria\*\*: Configure 1 to 30 custom parameters per subject (e.g., Theory, Notes, Exercises, PYQs).

\- \*\*Flexible Labels\*\*: Each parameter supports a full name (up to 80 characters) and a short table header label (up to 12 characters).

\- \*\*In-Place Reordering\*\*: Reorder parameters anytime to dynamically restructure table columns.



\### Chapter Tracking \& Revisions

\- \*\*Chapter Matrix\*\*: Add, rename, delete, and reorder chapters within each subject.

\- \*\*Checkbox Tracking\*\*: Toggle completion for individual parameters with instant recalculation of chapter and subject progress.

\- \*\*Color-Coded Progress\*\*: Dynamic progress bars transitioning through Red (<25%), Orange (25–49%), Blue (50–79%), and Green (≥80%).

\- \*\*Revision Counter\*\*: Dedicated counter with increment (`+`) and decrement (`−`) controls.

\- \*\*Visual Status\*\*: Distinct green row tint for chapters revised at least once.

\- \*\*Table Legend\*\*: Built-in legend mapping short column labels to parameter full names.



\### Search \& Filtering

\- \*\*Live Search\*\*: Instant chapter name filter within the active subject.

\- \*\*Filter Pills\*\*: Switch views between \*\*All\*\*, \*\*Pending\*\*, \*\*Complete\*\*, and \*\*Revised\*\* chapters.

\- \*\*Keyboard-Driven\*\*: Quickly focus search without reaching for the mouse.



\### UI \& Customization

\- \*\*Custom Branding\*\*: Rename the app title and subtitle directly from the UI.

\- \*\*Logo Support\*\*: Displays `logo.png` from the `public/` directory with an emoji fallback (`📘`).

\- \*\*Theme Modes\*\*: One-click toggle between Dark and Light themes with persistent preference (`localStorage` and system `prefers-color-scheme`).

\- \*\*Zero-Build Frontend\*\*: Built with native browser ES modules; no bundler, compiler, or build step required.



\### Storage \& Reliability

\- \*\*Offline-First\*\*: All data is stored locally on your machine in JSON format.

\- \*\*Atomic File Writes\*\*: Writes use temporary file swaps (`.tmp` → rename) to eliminate the risk of partial writes or corrupted files on sudden shutdown.

\- \*\*Startup Backups\*\*: Automatically refreshes a safe backup copy (`subjects.bak.json`) on launch from verified valid data.

\- \*\*Crash Protection\*\*: The server halts with an alert rather than overwriting existing files if a data file cannot be parsed.

\- \*\*In-Memory Cache\*\*: Fast reads with memory caching.



\---



\## Requirements



\- \*\*Node.js\*\*: `>= 24.0.0`

\- \*\*Browser\*\*: Any modern web browser



\---



\## Installation



1\. \*\*Clone the repository\*\*:

&#x20;  ```bash

&#x20;  git clone <https://github.com/dvndrk/study-tracker>

&#x20;  cd study-tracker

&#x20;  ```



2\. \*\*Install dependencies\*\*:

&#x20;  ```bash

&#x20;  npm install

&#x20;  ```



3\. \*\*Start the application\*\*:

&#x20;  ```bash

&#x20;  npm start

&#x20;  ```

&#x20;  \*On Windows, you can also double-click `start.bat`.\*



4\. \*\*Open in browser\*\*:

&#x20;  Navigate to \[http://localhost:3000](http://localhost:3000) (opened automatically when using `start.bat` or the `--open` flag).



\---



\## Environment Variables



| Variable | Default | Description |

|---|---|---|

| `PORT` | `3000` | Port for the Express server to listen on. |

| `DATA\_DIR` | `./data` | Directory where data and backup JSON files are saved. |



\---



\## Keyboard Shortcuts



| Shortcut | Context | Action |

|---|---|---|

| `/` | Subject View | Focus and select chapter search input. |

| `Esc` | Search Input | Clear search filter and restore full list. |



\---



\## Data \& Privacy



All study data is kept strictly local in the `data/` directory:

\- `data/subjects.json`: Active application state and study records.

\- `data/subjects.bak.json`: Startup backup copy.



The `data/` folder is excluded by `.gitignore`. The server binds strictly to `127.0.0.1` by default to ensure only your local computer can access the app.



\---



\## Development Status



hobby project to learn building so no status.

