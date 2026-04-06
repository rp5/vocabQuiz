# Rigor — Features

## Overview

Rigor is a quiz web app for kids supporting three quiz types: **vocabulary**, **reading comprehension**, and **SAT reading** (Bluebook-style). Parents/teachers create quizzes and assign them to kids. Each kid logs in with their name and password, sees one quiz at a time, and gets immediate feedback on their results.

**Tech stack:** React + Vite + TypeScript frontend, Express API backend with JSON file storage. All devices share the same data.

---

## Authentication

- **Admin login** at `/` — password-protected (SHA-256 hashed)
- **Kid login** at `/quiz/login` — name + password (set by admin)
- **Role-based routing** — admin routes (`/admin/*`) and kid routes (`/quiz/*`) are protected
- **Session-based auth** — stored in sessionStorage, cleared when tab closes
- **First-time setup** — admin sets password on first visit

## Kid Management (Admin)

- Create kid profiles: name (used as username), password, grade
- Edit and delete kid profiles
- Name uniqueness enforced (case-insensitive)
- Deleting a kid cascades: removes quiz assignments and results

## Quiz Creation

### Method 1: Publish with adminTools (recommended)
- `./adminTools.sh publish <file.json> <student-name>`
- Auto-detects quiz type from JSON content (vocab, reading, or satReading)
- Places quiz in the correct subdirectory (`vocab/`, `reading/`, or `sat-reading/`)
- Auto-assigns next sequence number from `seq_counter` (starts at 5000)
- Sets `assignTo` to the given student name
- Hot-reloads the running server (no restart needed)

### Method 2: Drop JSON files manually
- Place quiz files in the appropriate subdirectory under the quizzes folder:
  - `quizzes/vocab/` — vocabulary quizzes
  - `quizzes/reading/` — reading comprehension quizzes
  - `quizzes/sat-reading/` — SAT reading quizzes
- Server auto-discovers all `.json` files in subdirectories on startup (no index file needed)
- Handles malformed JSON (newlines in strings) gracefully
- Resolves kid names to internal IDs automatically

### Method 3: Import via UI
- Admin > Export page > Upload file
- Accepts: single quiz, array of quizzes, or full export format
- Merges by ID — safe for repeated imports

### Method 4: Create in UI
- Admin > Quizzes > New Quiz
- Type selector: Vocabulary, Reading Comprehension, or SAT Reading
- Dynamic word/question editor with add/remove items
- Sequence number for ordering
- Assign to one or multiple kids

## Quiz-Taking Workflow

### Vocab Quizzes
- **Sequential flow** — kid sees only the next untaken quiz (lowest `seq` not yet completed)
- **Scrollable page** — all questions on one page, variable count
- **Shuffled choices** — answer order randomized on each quiz load
- **Bold word in sentence** — the vocabulary word is highlighted in the context sentence
- **Optional sentence hints** — when `alwaysShowSentence: false`, sentence is hidden behind a "Show word in a sentence" button per question; hint usage is recorded per word
- **Progress tracking** — submit button shows "X/Y answered", disabled until all answered
- **Sticky submit** — submit button stays visible at bottom while scrolling
- **Results at end** — score and per-question review shown immediately after submission

### Reading Comprehension Quizzes
- **Split-screen layout** — passage pinned on the left, all questions scrollable on the right
- **Lettered bubble choices** — A/B/C/D choice format matching SAT style
- **Passage rendering** — supports `**bold**`, `*italic*`, and paragraph breaks
- **Shuffled choices** — answer order randomized on each quiz load
- **Progress tracking** — submit button shows "X/Y answered", disabled until all answered
- **Results at end** — score and per-question review shown immediately after submission

### SAT Reading Quizzes (Bluebook-style)
- **Split-screen layout** — passage on the left, question + lettered choices (A/B/C/D) on the right
- **One question at a time** — each question has its own passage (25-150 words)
- **Numbered navigation bar** — question numbers at top; blue = current, green = answered, gray = unanswered
- **Previous/Next arrows** — step through questions at bottom of screen
- **Review screen** — grid of question numbers showing answered/unanswered status; click any number to jump back to that question
- **Submit from review** — "Submit Test" button on review screen; shows count of answered questions
- **Passage formatting** — supports `**bold**`, `*italic*`, and paragraph breaks
- **Shuffled choices** — answer order randomized on each quiz load
- **Optional timer** — when `timed: true`, shows elapsed-time stopwatch (MM:SS) in the top-right with pause/resume; pausing blurs the quiz content; elapsed time recorded in results

## Kid Dashboard

- **Two-card layout** — separate cards for Vocabulary and Reading (Reading groups both reading comprehension and SAT reading quizzes)
- **Next quiz per type** — each card shows the next untaken quiz with a "Start Quiz" button
- **Previously Taken** — collapsible section showing taken quizzes with latest score, Review and Retake buttons
- **All caught up** — encouraging message when no quizzes are pending
- **Retakes** — kids can retake any previously completed quiz; each attempt saved separately

## Results & Analytics (Admin)

### Results Table
- All attempts across all kids and quizzes
- Filters: by kid, by quiz
- Score badges: green (>=70%), red (<70%)
- Click through to per-word detail

### Result Detail
- Per-question breakdown: word/question, sentence, student's answer, correct answer
- Color-coded rows (green = correct, red = wrong)
- Summary header: student name, score, date/time, elapsed time (timed quizzes)

### Word Analytics
- Per-word statistics: times seen, correct, missed, miss rate
- Vocab quizzes only — reading/SAT quiz results are excluded (Q1/Q2 labels are not meaningful words)
- Sorted by miss rate (most-missed first)
- Mastery progress bar (red > 50%, orange 25-50%, green < 25%)
- Filters: by kid, by vocab quiz

### Admin Dashboard
- Summary stats: total kids, quizzes, attempts, average score
- Recent results feed (5 most recent)

## Admin Tools (`adminTools.sh`)

Command-line script for server management and quiz publishing:

- **`start [--prod]`** — start server in dev (default) or production mode; PID tracked in `.server.pid`
- **`stop`** — stop server; kills entire process group (handles dev mode's Vite + Express children)
- **`restart [--prod]`** — stop then start
- **`status`** — show whether server is running with PID; shows DATA_DIR location
- **`reset-password`** — clear admin password hash in `data.json`; next login shows "Set Password" form; warns if server is running
- **`publish <file.json> <student>`** — publish a quiz: auto-detects type, auto-assigns seq from `seq_counter` (starts at 5000), sets `assignTo`, copies to correct subdir (`vocab/`, `reading/`, or `sat-reading/`), hot-reloads running server
- **`init-data <directory>`** — initialize an external data directory for production; copies existing quizzes, data.json, and seq_counter; prints setup instructions
- **`upgrade <tarball.tar.gz>`** — stop server, extract new code from tarball (skipping data files), install deps, build, and restart; requires `DATA_DIR` to protect production state

All commands respect the `DATA_DIR` environment variable. When set, persistent state (data.json, quizzes, seq_counter) is read from/written to that directory instead of the project directory.

## Data Management

- **External data directory** — set `DATA_DIR` env var to store all persistent state outside the code directory, making deploys safe
- **Export** — download all data (kids, quizzes, results) as JSON
- **Import** — upload JSON to restore or merge data
- **Server-side storage** — all data in `data.json`, shared across all devices
- **Live updates** — admin dashboard polls every 10s, so kid results appear automatically
- **Optimistic UI** — actions feel instant; data syncs to server in background
- **Concurrent writes** — mutex-based locking prevents data loss when multiple kids submit simultaneously
- **Atomic file writes** — write to temp file then rename, preventing corruption on crash
- **Deploy-safe** — code directory can be replaced without affecting production state (kids, results, published quizzes)

## Quiz Types

### Vocabulary Quiz
Standard vocab quiz: each question presents a word with a context sentence and 4 answer choices.

### Reading Comprehension Quiz
A passage of text followed by multiple-choice questions about it. Each question has 4 answer choices.

### SAT Reading Quiz
Bluebook-style SAT prep: each question has its own short passage (25-150 words). Presented in a split-screen layout (passage left, question right) with one question at a time, numbered navigation bar, previous/next arrows, and a review/submit screen.

## Quiz JSON Format

### Vocabulary Quiz

```json
{
  "title": "Week 12 Vocab",
  "type": "vocab",
  "seq": 12,
  "assignTo": "Shrey",
  "alwaysShowSentence": false,
  "words": [
    {
      "word": "benevolent",
      "sentence": "The benevolent king helped the poor.",
      "choices": ["kind", "cruel", "lazy", "angry"],
      "answer": "kind"
    }
  ]
}
```

### Reading Comprehension Quiz

```json
{
  "title": "The Water Cycle",
  "type": "reading",
  "seq": 15,
  "assignTo": "Shrey",
  "passage": "Water on Earth is constantly moving. The sun heats water in oceans, lakes, and rivers, causing it to evaporate into the atmosphere as water vapor...",
  "questions": [
    {
      "question": "What causes water to evaporate?",
      "choices": ["The moon's gravity", "The sun's heat", "Wind", "Cold temperatures"],
      "answer": "The sun's heat"
    }
  ]
}
```

**Common Fields:**
| Field | Required | Description |
|---|---|---|
| `title` | yes | Quiz name shown to the kid |
| `type` | no | `"vocab"` (default), `"reading"`, or `"satReading"` |
| `seq` | yes | Sequence number — controls order and serves as quiz ID |
| `assignTo` | yes | Kid name or array of names |

**Vocab-specific Fields:**
| Field | Required | Description |
|---|---|---|
| `alwaysShowSentence` | no | Default `true`. Set `false` to hide sentences behind hint buttons |
| `words[].word` | yes | The vocabulary word |
| `words[].sentence` | yes | Context sentence using the word |
| `words[].choices` | yes | Array of 4 answer options |
| `words[].answer` | yes | The correct choice (must match one of the choices) |

**Reading-specific Fields:**
| Field | Required | Description |
|---|---|---|
| `passage` | yes | The reading passage text. Supports `**bold**`, `*italic*`, and paragraph breaks (blank lines). |
| `questions[].question` | yes | The question about the passage |
| `questions[].choices` | yes | Array of 4 answer options |
| `questions[].answer` | yes | The correct choice (must match one of the choices) |

**SAT Reading-specific Fields:**
| Field | Required | Description |
|---|---|---|
| `timed` | no | Default `false`. Set `true` to show elapsed-time stopwatch with pause/resume. |
| `satQuestions[].passage` | yes | Short passage for this question (25-150 words). Supports `**bold**`, `*italic*`, and paragraph breaks. |
| `satQuestions[].question` | yes | The question about the passage |
| `satQuestions[].choices` | yes | Array of 4 answer options |
| `satQuestions[].answer` | yes | The correct choice (must match one of the choices) |

### SAT Reading Quiz

```json
{
  "title": "SAT Practice Set 1",
  "type": "satReading",
  "seq": 20,
  "assignTo": "Shrey",
  "satQuestions": [
    {
      "passage": "The discovery of **penicillin** in 1928 by Alexander Fleming...",
      "question": "Which choice best describes the main purpose of the passage?",
      "choices": ["To explain a scientific process", "To describe a historical discovery", "To argue for more research", "To compare two medicines"],
      "answer": "To describe a historical discovery"
    }
  ]
}
```

## Architecture

```
Browser (React SPA)  <-->  Express API (server.cjs)  <-->  $DATA_DIR/data.json
                           port 3001 (dev) / 3000 (prod)    $DATA_DIR/quizzes/{vocab,reading,sat-reading}/
```

- **Dev mode:** Vite (port 5173) + Express (port 3001) via `concurrently`, Vite proxies `/api/*`
- **Production:** Express serves built frontend + API on port 3000
- **Quiz auto-loading:** Server scans `quizzes/vocab/`, `quizzes/reading/`, `quizzes/sat-reading/` for `.json` files on startup
- **DATA_DIR:** Separates persistent state from code for safe deploys
- **SQLite upgrade path:** API endpoints map 1:1 to SQL queries, zero client changes needed

## Deployment

- Runs on any machine with Node.js 18+
- `./setup.sh` checks prerequisites and installs dependencies
- `./adminTools.sh start` for development, `./adminTools.sh start --prod` for production
- `./adminTools.sh stop` / `./adminTools.sh restart` for server management
- `./adminTools.sh init-data ~/rigor-data` to set up external data directory
- `DATA_DIR=~/rigor-data` separates persistent state from code for safe upgrades
- Version number from `package.json`, displayed in app header

## Testing

- 91 end-to-end Playwright tests covering all key flows
- Run with `npx playwright test`
- Tests use `data.test.json` (via `DATA_FILE` env var) — production `data.json` is never touched
- `reuseExistingServer: false` in Playwright config prevents accidentally running tests against a dev server
- Tests cover: auth, kid management, quiz CRUD (vocab, reading, SAT reading), quiz taking (all three types), split-screen layouts, SAT navigation, SAT review/submit, timed quizzes with pause/resume, analytics filtering, bold word rendering, results, export/import, auto-loading, hint system, quiz progression, retakes, cascading deletes, backend API integration
