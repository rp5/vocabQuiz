const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));

const DATA_DIR = process.env.DATA_DIR || '';
const DATA_FILE = DATA_DIR
  ? path.join(DATA_DIR, 'data.json')
  : path.join(__dirname, process.env.DATA_FILE || 'data.json');
const QUIZZES_DIR = DATA_DIR
  ? path.join(DATA_DIR, 'quizzes')
  : path.join(__dirname, 'public', 'quizzes');
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);

const DEFAULT_DATA = {
  providerPasswordHash: '',
  kids: [],
  quizzes: [],
  results: [],
};

// --- Mutex for serializing writes ---
class Mutex {
  #queue = Promise.resolve();
  lock(fn) {
    let release;
    const next = new Promise(resolve => { release = resolve; });
    const prev = this.#queue;
    this.#queue = next;
    return prev.then(() => fn()).finally(() => release());
  }
}
const mutex = new Mutex();

// --- File I/O ---
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return { ...DEFAULT_DATA };
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function writeData(data) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// --- ID generation ---
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// --- Quiz auto-loading from public/quizzes ---
function normalizeQuiz(q, fallbackSeq) {
  const now = new Date().toISOString();
  let assignedKidIds = q.assignedKidIds || [];
  if (q.assignTo) {
    assignedKidIds = Array.isArray(q.assignTo) ? q.assignTo : [q.assignTo];
  }
  const seq = q.seq ?? fallbackSeq;
  const id = q.id || `quiz_seq_${seq}`;
  const type = q.type || (q.satQuestions ? 'satReading' : q.passage || q.questions ? 'reading' : 'vocab');

  const base = {
    id, seq, type,
    title: q.title || 'Untitled Quiz',
    assignedKidIds,
    createdAt: q.createdAt || now,
    updatedAt: q.updatedAt || now,
  };

  if (type === 'satReading') {
    return {
      ...base,
      timed: q.timed ?? false,
      satQuestions: (q.satQuestions || []).map((sq, i) => ({
        id: sq.id || `satq_${i}`,
        passage: sq.passage || '',
        question: sq.question || '',
        choices: sq.choices || ['', '', '', ''],
        correctAnswer: sq.correctAnswer || sq.answer || sq.choices?.[0] || '',
      })),
      words: [],
    };
  }

  if (type === 'reading') {
    return {
      ...base,
      passage: q.passage || '',
      questions: (q.questions || []).map((qn, i) => ({
        id: qn.id || `question_${i}`,
        question: qn.question || '',
        choices: qn.choices || ['', '', '', ''],
        correctAnswer: qn.correctAnswer || qn.answer || qn.choices?.[0] || '',
      })),
      words: [],
    };
  }

  return {
    ...base,
    alwaysShowSentence: q.alwaysShowSentence,
    words: (q.words || []).map((w, i) => ({
      id: w.id || `word_${i}`,
      word: w.word || '',
      sentence: w.sentence || '',
      choices: w.choices || ['', '', '', ''],
      correctAnswer: w.correctAnswer || w.answer || w.choices?.[0] || '',
    })),
  };
}

function resolveKidNames(quizzes, data) {
  const nameToId = new Map(data.kids.map(k => [k.name.toLowerCase(), k.id]));
  return quizzes.map(q => ({
    ...q,
    assignedKidIds: q.assignedKidIds.map(ref => {
      if (data.kids.some(k => k.id === ref)) return ref;
      return nameToId.get(ref.toLowerCase()) ?? ref;
    }),
  }));
}

function loadJsonFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json') || name === 'index.json') continue;
    const filePath = path.join(dir, name);
    try {
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      const text = fs.readFileSync(filePath, 'utf-8');
      const cleaned = text.replace(/\n\s*/g, ' ');
      const raw = JSON.parse(cleaned);
      if (Array.isArray(raw)) {
        raw.forEach((q, j) => files.push({ quiz: q, source: name, seqHint: j }));
      } else {
        files.push({ quiz: raw, source: name, seqHint: 0 });
      }
    } catch (err) {
      console.log(`[QuizLoader] Skipping ${name}: ${err.message}`);
    }
  }
  return files;
}

function loadQuizzesFromFolder() {
  try {
    if (!fs.existsSync(QUIZZES_DIR)) return;

    // Scan subdirectories (vocab/, reading/, sat-reading/) and root for .json files
    const entries = [];
    const subdirs = ['vocab', 'reading', 'sat-reading'];
    for (const sub of subdirs) {
      const subPath = path.join(QUIZZES_DIR, sub);
      const found = loadJsonFiles(subPath);
      if (found.length > 0) {
        console.log(`[QuizLoader] Found ${found.length} quiz(es) in ${sub}/`);
        entries.push(...found);
      }
    }
    // Also scan root for backward compatibility (flat files)
    const rootFiles = loadJsonFiles(QUIZZES_DIR);
    if (rootFiles.length > 0) {
      console.log(`[QuizLoader] Found ${rootFiles.length} quiz(es) in root`);
      entries.push(...rootFiles);
    }

    if (entries.length === 0) return;

    const quizzes = entries.map((e, i) =>
      normalizeQuiz(e.quiz, (i + 1) * 100 + e.seqHint)
    );

    const data = readData();
    const resolved = resolveKidNames(quizzes, data);
    const existingMap = new Map(data.quizzes.map(q => [q.id, q]));
    for (const q of resolved) {
      existingMap.set(q.id, q);
    }
    // Re-resolve all quizzes
    for (const [id, q] of existingMap) {
      const reresolved = resolveKidNames([q], data)[0];
      existingMap.set(id, reresolved);
    }
    data.quizzes = Array.from(existingMap.values());
    writeData(data);
    console.log(`[QuizLoader] Loaded ${quizzes.length} quizzes total`);
  } catch (err) {
    console.error('[QuizLoader] Error:', err.message);
  }
}

// --- API Endpoints ---

// Reset (for tests)
app.post('/api/reset', async (req, res) => {
  await mutex.lock(() => {
    writeData({ ...DEFAULT_DATA });
  });
  res.json({ ok: true });
});

// Reload quizzes from folder (for tests)
app.post('/api/reload-quizzes', async (req, res) => {
  await mutex.lock(() => {
    loadQuizzesFromFolder();
  });
  res.json({ ok: true });
});

// Full data (for initial load and export)
app.get('/api/data', (req, res) => {
  res.json(readData());
});

// Merge data (for import)
app.patch('/api/data', async (req, res) => {
  const result = await mutex.lock(() => {
    const data = readData();
    const imported = req.body;
    const mergeById = (existing, incoming) => {
      const map = new Map(existing.map(item => [item.id, item]));
      for (const item of (incoming || [])) map.set(item.id, item);
      return Array.from(map.values());
    };
    // Resolve kid names in imported quizzes
    const allKids = mergeById(data.kids, imported.kids);
    const nameToId = new Map(allKids.map(k => [k.name.toLowerCase(), k.id]));
    const resolvedQuizzes = (imported.quizzes || []).map(q => ({
      ...q,
      assignedKidIds: (q.assignedKidIds || []).map(ref => {
        if (allKids.some(k => k.id === ref)) return ref;
        return nameToId.get(ref.toLowerCase()) ?? ref;
      }),
    }));
    data.kids = allKids;
    data.quizzes = mergeById(data.quizzes, resolvedQuizzes);
    data.results = mergeById(data.results, imported.results);
    writeData(data);
    return data;
  });
  res.json(result);
});

// Kids
app.post('/api/kids', async (req, res) => {
  const kid = await mutex.lock(() => {
    const data = readData();
    const newKid = { ...req.body, id: req.body.id || generateId('kid'), createdAt: req.body.createdAt || new Date().toISOString() };
    data.kids.push(newKid);
    writeData(data);
    return newKid;
  });
  res.json(kid);
});

app.patch('/api/kids/:id', async (req, res) => {
  const result = await mutex.lock(() => {
    const data = readData();
    const idx = data.kids.findIndex(k => k.id === req.params.id);
    if (idx === -1) return null;
    data.kids[idx] = { ...data.kids[idx], ...req.body };
    writeData(data);
    return data.kids[idx];
  });
  if (!result) return res.status(404).json({ error: 'Kid not found' });
  res.json(result);
});

app.delete('/api/kids/:id', async (req, res) => {
  await mutex.lock(() => {
    const data = readData();
    const id = req.params.id;
    data.kids = data.kids.filter(k => k.id !== id);
    data.quizzes = data.quizzes.map(q => ({
      ...q,
      assignedKidIds: q.assignedKidIds.filter(kid => kid !== id),
    }));
    data.results = data.results.filter(r => r.kidId !== id);
    writeData(data);
  });
  res.json({ ok: true });
});

// Quizzes
app.post('/api/quizzes', async (req, res) => {
  const quiz = await mutex.lock(() => {
    const data = readData();
    const now = new Date().toISOString();
    const newQuiz = {
      ...req.body,
      id: req.body.id || generateId('quiz'),
      createdAt: req.body.createdAt || now,
      updatedAt: req.body.updatedAt || now,
    };
    data.quizzes.push(newQuiz);
    writeData(data);
    return newQuiz;
  });
  res.json(quiz);
});

app.patch('/api/quizzes/:id', async (req, res) => {
  const result = await mutex.lock(() => {
    const data = readData();
    const idx = data.quizzes.findIndex(q => q.id === req.params.id);
    if (idx === -1) return null;
    data.quizzes[idx] = { ...data.quizzes[idx], ...req.body, updatedAt: new Date().toISOString() };
    writeData(data);
    return data.quizzes[idx];
  });
  if (!result) return res.status(404).json({ error: 'Quiz not found' });
  res.json(result);
});

app.delete('/api/quizzes/:id', async (req, res) => {
  await mutex.lock(() => {
    const data = readData();
    const id = req.params.id;
    data.quizzes = data.quizzes.filter(q => q.id !== id);
    data.results = data.results.filter(r => r.quizId !== id);
    writeData(data);
  });
  res.json({ ok: true });
});

// Results
app.post('/api/results', async (req, res) => {
  const result = await mutex.lock(() => {
    const data = readData();
    const newResult = { ...req.body, id: req.body.id || generateId('result') };
    data.results.push(newResult);
    writeData(data);
    return newResult;
  });
  res.json(result);
});

// Provider password
app.patch('/api/provider-password', async (req, res) => {
  await mutex.lock(() => {
    const data = readData();
    data.providerPasswordHash = req.body.hash;
    writeData(data);
  });
  res.json({ ok: true });
});

// --- Static files (production) ---
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// --- Start ---
loadQuizzesFromFolder();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Rigor API running on port ${PORT}`);
  if (DATA_DIR) {
    console.log(`[Server] DATA_DIR: ${DATA_DIR}`);
  }
  console.log(`[Server] Data file: ${DATA_FILE}`);
  console.log(`[Server] Quizzes dir: ${QUIZZES_DIR}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Server] API: http://localhost:${PORT}/api/data`);
  }
});
