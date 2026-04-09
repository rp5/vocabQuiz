# Rigor — Vocab | Reading

A quiz web app for kids supporting three quiz types: **vocabulary**, **reading comprehension**, and **SAT reading** (Bluebook-style). Parents/teachers create quizzes and assign them to kids. Each kid logs in with their name and password, and only sees their own quizzes and results. All devices share the same data through a backend API server.

## Prerequisites

- Node.js 18+

## Setup

```bash
cd /src/vocabQuiz
npm install
```

## Running the App

`DATA_DIR` is required — all persistent state (data.json, quizzes, seq_counter) lives in this directory.

```bash
# First time: initialize a data directory
./adminTools.sh init-data ~/rigor-data
export DATA_DIR=~/rigor-data

# Start the server
./adminTools.sh start         # Start dev server
./adminTools.sh start --prod  # Build and start production server
```

Or directly with npm (DATA_DIR must be set):

```bash
export DATA_DIR=~/rigor-data
npm run dev                   # Dev: Vite (5173) + Express API (3001)
npm run dev -- --host         # Dev with network access
npm run build && npm start    # Production on port 3000
```

- Admin: `http://localhost:5173/` (dev) or `http://localhost:3000/` (prod)
- Kids: `http://<your-ip>:5173/quiz/login` (dev) or `http://<your-ip>:3000/quiz/login` (prod)

### How It Works

All devices share the same data through the Express API server. When a kid takes a quiz on their iPad, the result appears on your admin dashboard within 10 seconds. Data is stored in `$DATA_DIR/data.json` on disk, making backups simple.

### First-Time Setup

1. Run `./adminTools.sh init-data ~/rigor-data` and `export DATA_DIR=~/rigor-data`
2. Start the server: `./adminTools.sh start`
3. Open `http://localhost:5173/` (admin login)
4. Set a password (protects the admin area)
5. Add kid profiles (name, password, grade)
6. Create quizzes and assign them to kids
7. Give kids the URL: `http://<your-ip>:5173/quiz/login`

## Adding Quizzes

### Method 1: Publish with adminTools (recommended)

```bash
./adminTools.sh publish myquiz.json Shrey
```

This copies the quiz file to the correct subdirectory (`vocab/`, `reading/`, or `sat-reading/`) under `$DATA_DIR/quizzes/`, auto-assigns the next sequence number (starting at 5000), sets `assignTo` to the given student name, and hot-reloads the server if it's running.

The quiz type is auto-detected from the JSON content (`words` = vocab, `passage`/`questions` = reading, `satQuestions` = satReading).

### Method 2: Drop files in the quizzes folder manually

Create a JSON file in one of the three formats below, save it in the appropriate subdirectory under `$DATA_DIR/quizzes/`, and restart the server. The server auto-discovers all `.json` files in the subdirectories — no index file needed.

```
quizzes/
  vocab/          ← vocabulary quizzes
  reading/        ← reading comprehension quizzes
  sat-reading/    ← SAT reading quizzes
```

#### Vocabulary quiz

```json
{
  "title": "Week 12 Vocab",
  "seq": 12,
  "assignTo": "Shrey",
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

#### Reading comprehension quiz

```json
{
  "title": "The Water Cycle",
  "type": "reading",
  "seq": 15,
  "assignTo": "Shrey",
  "passage": "Water on Earth is constantly moving. The sun heats water in oceans, lakes, and rivers, causing it to evaporate...",
  "questions": [
    {
      "question": "What causes water to evaporate?",
      "choices": ["The moon's gravity", "The sun's heat", "Wind", "Cold temperatures"],
      "answer": "The sun's heat"
    }
  ]
}
```

#### SAT reading quiz

```json
{
  "title": "SAT Practice Set 1",
  "type": "satReading",
  "seq": 20,
  "assignTo": "Shrey",
  "satQuestions": [
    {
      "passage": "Fleming noticed that a mold called **Penicillium** had contaminated one of his petri dishes and killed the surrounding bacteria.",
      "question": "What did Fleming observe?",
      "choices": ["Bacteria growing rapidly", "Mold killing bacteria", "A clean petri dish", "Virus contamination"],
      "answer": "Mold killing bacteria"
    },
    {
      "passage": "The Industrial Revolution shifted economies from agrarian to manufacturing, fundamentally changing how people lived and worked.",
      "question": "What was the main effect of the Industrial Revolution?",
      "choices": ["Increased farming", "Economic shift to manufacturing", "Population decline", "Return to rural life"],
      "answer": "Economic shift to manufacturing"
    }
  ]
}
```

**Common fields:**
- `title` — quiz name shown to the kid
- `type` — `"vocab"` (default), `"reading"`, or `"satReading"`
- `seq` — sequence number (controls quiz order; also used as the quiz ID)
- `assignTo` — kid name (or array of names: `["Shrey", "Arjun"]`)

**Vocab fields:**
- `words[].word` — the vocabulary word
- `words[].sentence` — context sentence using the word
- `words[].choices` — array of 4 answer options
- `words[].answer` — the correct choice (must match one of the choices exactly)
- `alwaysShowSentence` — (optional, default `true`) if `false`, sentences are hidden behind a "Show word in a sentence" button per question. Hint usage is recorded per word in the results.

**Reading fields:**
- `passage` — the reading passage text. Supports `**bold**`, `*italic*`, and paragraph breaks (blank lines).
- `questions[].question` — a question about the passage
- `questions[].choices` — array of 4 answer options
- `questions[].answer` — the correct choice (must match one of the choices exactly)

**SAT Reading fields:**
- `timed` — (optional, default `false`) if `true`, elapsed time is recorded in results. Timer UI is always visible on SAT and reading quizzes regardless of this setting.
- `satQuestions[]` — array of question objects, each with its own passage
- `satQuestions[].passage` — short passage for this question (25-150 words). Supports `**bold**`, `*italic*`, and paragraph breaks.
- `satQuestions[].question` — the question about the passage
- `satQuestions[].choices` — array of 4 answer options
- `satQuestions[].answer` — the correct choice (must match one of the choices exactly)

**Validating your JSON before dropping:**
```bash
python3 -m json.tool $DATA_DIR/quizzes/vocab/week12.json > /dev/null
```
Prints an error with the line number if invalid, or silently succeeds if valid. Note: the app handles minor issues like newlines inside strings, but validating is a good habit.

### Method 3: Import via the UI

Go to **Admin > Export page > Upload file**. Accepts single quiz, array of quizzes, or full export format.

### Method 4: Create in the UI

Go to **Admin > Quizzes > + New Quiz** and fill in the form.

## Quiz-Taking Workflow

Kids see **one quiz at a time** (the next untaken quiz, ordered by `seq`):

1. Kid logs in with name + password at `/quiz/login`
2. Sees the next untaken quiz with a "Start Quiz" button
3. Takes the quiz:
   - **Vocab:** word + context sentence + 4 shuffled A/B/C/D bubble choices
   - **Reading:** split-screen (passage pinned on left, all questions scrollable on right with A/B/C/D bubble choices), always-on timer with hide/pause
   - **SAT Reading:** Bluebook-style split-screen (passage left, question + A/B/C/D bubble choices right), one question at a time, numbered navigation bar + prev/next arrows, review screen before submit, always-on timer with hide/pause
4. Submits and sees score + per-question review immediately
5. Quiz moves to a collapsible "Previously Taken" section
6. Next untaken quiz appears, or "All caught up!" message
7. Kids can retake any previously taken quiz from the collapsed section

## Admin Tools

`adminTools.sh` provides command-line server management and quiz publishing.

```bash
./adminTools.sh init-data <directory>           # Initialize data directory (no DATA_DIR needed)
./adminTools.sh start [--prod]                  # Start server (dev or production)
./adminTools.sh stop                            # Stop server
./adminTools.sh restart [--prod]                # Restart server (auto-detects prod mode)
./adminTools.sh status                          # Show if server is running
./adminTools.sh reset-password                  # Clear admin password (re-setup on next login)
./adminTools.sh publish <file.json> <student>   # Publish quiz for a student
./adminTools.sh upgrade <tarball.tar.gz>        # Upgrade code from tarball
```

All commands except `init-data`, `package`, and `help` require `DATA_DIR` to be set.

**Server management** uses a PID file (`.server.pid`) and a mode file (`.server.mode`). The `stop` command kills the entire process group, handling dev mode's child processes (Vite + Express). The `restart` command auto-detects whether the server was running in production mode and preserves it.

**Reset password** clears the admin password hash in `data.json`, so the next login shows the "Set Password" form. Warns if the server is running (changes would be overwritten).

**Publish** auto-assigns the next sequence number from `seq_counter` (starts at 5000), sets `assignTo`, auto-detects quiz type, copies to the correct subdirectory under `$DATA_DIR/quizzes/` (`vocab/`, `reading/`, or `sat-reading/`), and hot-reloads the running server via the `/api/reload-quizzes` endpoint.

**Init data** creates the data directory structure (required before first use).

## Architecture

```
Browser (React SPA)  <-->  Express API (server.cjs)  <-->  $DATA_DIR/data.json
                           port 3001 (dev) / 3000 (prod)    $DATA_DIR/quizzes/{vocab,reading,sat-reading}/
```

- **API server** reads/writes `data.json` with atomic file writes and mutex locking
- **Quiz auto-loading** — server scans `quizzes/vocab/`, `quizzes/reading/`, `quizzes/sat-reading/` for `.json` files on startup (no index file needed)
- **Client polling** every 10s keeps admin dashboard updated with kid results
- **Optimistic updates** — UI responds instantly, syncs to server in background
- **DATA_DIR** (required) — all persistent state lives in this directory, separate from code

## data.json

All app data is stored in `$DATA_DIR/data.json`. It contains:

- `providerPasswordHash` — admin password (hashed)
- `kids` — array of kid profiles (name, password, grade)
- `quizzes` — array of quizzes (including auto-loaded ones from the quizzes directory)
- `results` — array of quiz attempt results

**Common edits** (stop the server first, restart after):

| Situation | What to do |
|---|---|
| Remove test data | Delete entries from `kids` and `results` arrays |
| Forgot admin password | Run `./adminTools.sh reset-password`, or set `"providerPasswordHash": ""` manually |
| Delete a quiz result | Remove the entry from `results` array |
| Fix a kid's name/password | Edit the entry in `kids` array |

**Backup:** Copy `data.json` somewhere safe. To restore, copy it back and restart the server.

**Note:** Always stop the server before editing `data.json`. The server overwrites it on every API call — edits while running will be lost.

## Running Tests

91 end-to-end tests cover all key flows using Playwright, including vocab, reading comprehension, and SAT reading quizzes.

```bash
# Run all tests (headless)
npx playwright test

# See each test name as it runs
npx playwright test --reporter=list

# Run a specific test suite
npx playwright test -g "Taking a Quiz"

# Run with browser visible
npx playwright test --headed

# View HTML report after a run
npx playwright show-report
```

First time only — install the browser:

```bash
npx playwright install chromium
```

## Production Deployment

`DATA_DIR` is required for all modes (dev and production). It stores all persistent state (data, quizzes, results) outside the code directory, making it safe to update the code without affecting data.

```
~/rigor-data/              ← persistent, survives deploys
  data.json                ← kids, results, quiz state
  seq_counter              ← next quiz sequence number
  quizzes/
    vocab/                 ← vocabulary quizzes
    reading/               ← reading comprehension quizzes
    sat-reading/           ← SAT reading quizzes

~/rigor/                   ← code, replaceable on each deploy
  server.cjs, dist/, src/, ...
```

### First-time deploy

```bash
# On the production machine
tar xzf vocabQuiz.tar.gz
cd vocabQuiz
./setup.sh                              # checks Node.js 18+, installs deps

# Initialize data directory (copies existing quizzes)
./adminTools.sh init-data ~/rigor-data

# Set DATA_DIR and start
export DATA_DIR=~/rigor-data
./adminTools.sh start --prod
```

Add `export DATA_DIR=~/rigor-data` to your shell profile (`~/.bashrc` or `~/.zshrc`) so it persists across sessions.

### Subsequent deploys (code upgrades)

```bash
export DATA_DIR=~/rigor-data
./adminTools.sh upgrade vocabQuiz-new.tar.gz
```

This stops the server, extracts the new code (excluding data files), runs `npm install`, builds, and restarts. Your kids, results, quiz assignments, and published quizzes in `~/rigor-data/` are **not touched**.

Or manually:

```bash
./adminTools.sh stop
tar xzf vocabQuiz-new.tar.gz            # replace code
cd vocabQuiz && npm install
./adminTools.sh start --prod            # DATA_DIR still set, state untouched
```

### Deploying to another machine

```bash
# On the source machine — create a tarball (excludes build artifacts)
cd /src
tar --exclude='node_modules' --exclude='dist' --exclude='test-results' --exclude='data.json' -czf vocabQuiz.tar.gz vocabQuiz/

# Transfer vocabQuiz.tar.gz to your Mac (scp, AirDrop, USB, etc.)
# Then follow "First-time deploy" steps above
```

The only prerequisite is **Node.js 18+**. If missing, the setup script will prompt you to install it (`brew install node` or https://nodejs.org).

Find your Mac's IP with: `ifconfig | grep "inet " | grep -v 127.0.0.1`

## Version

The version number (shown in the app header) comes from `package.json`. Bump it there when you release updates.

## Upgrading to SQLite

The API endpoints are designed for a clean SQLite migration. Each endpoint maps to a SQL query — swap `readData()`/`writeData()` in `server.cjs` with SQLite calls. Zero client changes needed.
