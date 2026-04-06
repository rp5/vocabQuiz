import { useState, useReducer } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import type { QuizType } from '../../types';

// --- Word (Vocab) reducer ---
interface WordDraft {
  word: string;
  sentence: string;
  choices: [string, string, string, string];
  correctIndex: number;
}
type WordAction =
  | { type: 'ADD' }
  | { type: 'REMOVE'; index: number }
  | { type: 'SET_FIELD'; index: number; field: 'word' | 'sentence'; value: string }
  | { type: 'SET_CHOICE'; index: number; choiceIndex: number; value: string }
  | { type: 'SET_CORRECT'; index: number; choiceIndex: number }
  | { type: 'LOAD'; words: WordDraft[] };
function emptyWord(): WordDraft {
  return { word: '', sentence: '', choices: ['', '', '', ''], correctIndex: -1 };
}
function wordsReducer(state: WordDraft[], action: WordAction): WordDraft[] {
  switch (action.type) {
    case 'ADD': return [...state, emptyWord()];
    case 'REMOVE': return state.filter((_, i) => i !== action.index);
    case 'SET_FIELD': return state.map((w, i) => i === action.index ? { ...w, [action.field]: action.value } : w);
    case 'SET_CHOICE': return state.map((w, i) => {
      if (i !== action.index) return w;
      const choices = [...w.choices] as [string, string, string, string];
      choices[action.choiceIndex] = action.value;
      return { ...w, choices };
    });
    case 'SET_CORRECT': return state.map((w, i) => i === action.index ? { ...w, correctIndex: action.choiceIndex } : w);
    case 'LOAD': return action.words;
    default: return state;
  }
}

// --- Question (Reading) reducer ---
interface QuestionDraft {
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
}
type QuestionAction =
  | { type: 'ADD' }
  | { type: 'REMOVE'; index: number }
  | { type: 'SET_QUESTION'; index: number; value: string }
  | { type: 'SET_CHOICE'; index: number; choiceIndex: number; value: string }
  | { type: 'SET_CORRECT'; index: number; choiceIndex: number }
  | { type: 'LOAD'; questions: QuestionDraft[] };
function emptyQuestion(): QuestionDraft {
  return { question: '', choices: ['', '', '', ''], correctIndex: -1 };
}
function questionsReducer(state: QuestionDraft[], action: QuestionAction): QuestionDraft[] {
  switch (action.type) {
    case 'ADD': return [...state, emptyQuestion()];
    case 'REMOVE': return state.filter((_, i) => i !== action.index);
    case 'SET_QUESTION': return state.map((q, i) => i === action.index ? { ...q, question: action.value } : q);
    case 'SET_CHOICE': return state.map((q, i) => {
      if (i !== action.index) return q;
      const choices = [...q.choices] as [string, string, string, string];
      choices[action.choiceIndex] = action.value;
      return { ...q, choices };
    });
    case 'SET_CORRECT': return state.map((q, i) => i === action.index ? { ...q, correctIndex: action.choiceIndex } : q);
    case 'LOAD': return action.questions;
    default: return state;
  }
}

// --- SAT Question reducer ---
interface SATDraft {
  passage: string;
  question: string;
  choices: [string, string, string, string];
  correctIndex: number;
}
type SATAction =
  | { type: 'ADD' }
  | { type: 'REMOVE'; index: number }
  | { type: 'SET_PASSAGE'; index: number; value: string }
  | { type: 'SET_QUESTION'; index: number; value: string }
  | { type: 'SET_CHOICE'; index: number; choiceIndex: number; value: string }
  | { type: 'SET_CORRECT'; index: number; choiceIndex: number }
  | { type: 'LOAD'; items: SATDraft[] };
function emptySAT(): SATDraft {
  return { passage: '', question: '', choices: ['', '', '', ''], correctIndex: -1 };
}
function satReducer(state: SATDraft[], action: SATAction): SATDraft[] {
  switch (action.type) {
    case 'ADD': return [...state, emptySAT()];
    case 'REMOVE': return state.filter((_, i) => i !== action.index);
    case 'SET_PASSAGE': return state.map((s, i) => i === action.index ? { ...s, passage: action.value } : s);
    case 'SET_QUESTION': return state.map((s, i) => i === action.index ? { ...s, question: action.value } : s);
    case 'SET_CHOICE': return state.map((s, i) => {
      if (i !== action.index) return s;
      const choices = [...s.choices] as [string, string, string, string];
      choices[action.choiceIndex] = action.value;
      return { ...s, choices };
    });
    case 'SET_CORRECT': return state.map((s, i) => i === action.index ? { ...s, correctIndex: action.choiceIndex } : s);
    case 'LOAD': return action.items;
    default: return state;
  }
}

const TYPE_LABELS: Record<QuizType, string> = {
  vocab: 'Vocabulary',
  reading: 'Reading Comprehension',
  satReading: 'SAT Reading',
};

const TITLE_PLACEHOLDERS: Record<QuizType, string> = {
  vocab: 'e.g. Week 12 Vocabulary',
  reading: 'e.g. The Water Cycle',
  satReading: 'e.g. SAT Practice Set 1',
};

export default function QuizForm() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { quizzes, kids, addQuiz, updateQuiz } = useAppData();
  const existingQuiz = quizId ? quizzes.find(q => q.id === quizId) : undefined;

  const [quizType, setQuizType] = useState<QuizType>((existingQuiz?.type as QuizType) ?? 'vocab');
  const [title, setTitle] = useState(existingQuiz?.title ?? '');
  const [seq, setSeq] = useState<number>(existingQuiz?.seq ?? (quizzes.reduce((max, q) => Math.max(max, q.seq ?? 0), 0) + 1));
  const [assignedKidIds, setAssignedKidIds] = useState<string[]>(existingQuiz?.assignedKidIds ?? []);
  const [passage, setPassage] = useState(existingQuiz?.passage ?? '');
  const [words, dispatchWords] = useReducer(
    wordsReducer,
    existingQuiz && (existingQuiz.type ?? 'vocab') === 'vocab'
      ? existingQuiz.words.map(w => ({ word: w.word, sentence: w.sentence, choices: w.choices, correctIndex: w.choices.indexOf(w.correctAnswer) }))
      : [emptyWord()]
  );
  const [questions, dispatchQuestions] = useReducer(
    questionsReducer,
    existingQuiz && existingQuiz.type === 'reading' && existingQuiz.questions
      ? existingQuiz.questions.map(q => ({ question: q.question, choices: q.choices, correctIndex: q.choices.indexOf(q.correctAnswer) }))
      : [emptyQuestion()]
  );
  const [satItems, dispatchSAT] = useReducer(
    satReducer,
    existingQuiz && existingQuiz.type === 'satReading' && existingQuiz.satQuestions
      ? existingQuiz.satQuestions.map(sq => ({ passage: sq.passage, question: sq.question, choices: sq.choices, correctIndex: sq.choices.indexOf(sq.correctAnswer) }))
      : [emptySAT()]
  );
  const [errors, setErrors] = useState<string[]>([]);

  const toggleKid = (kidId: string) => {
    setAssignedKidIds(prev => prev.includes(kidId) ? prev.filter(id => id !== kidId) : [...prev, kidId]);
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!title.trim()) errs.push('Quiz title is required');

    if (quizType === 'vocab') {
      if (words.length === 0) errs.push('Add at least one word');
      words.forEach((w, i) => {
        const n = i + 1;
        if (!w.word.trim()) errs.push(`Word #${n}: word is required`);
        if (!w.sentence.trim()) errs.push(`Word #${n}: sentence is required`);
        if (w.choices.some(c => !c.trim())) errs.push(`Word #${n}: all 4 choices are required`);
        if (w.correctIndex < 0) errs.push(`Word #${n}: select the correct answer`);
      });
    } else if (quizType === 'reading') {
      if (!passage.trim()) errs.push('Passage text is required');
      if (questions.length === 0) errs.push('Add at least one question');
      questions.forEach((q, i) => {
        const n = i + 1;
        if (!q.question.trim()) errs.push(`Question #${n}: question text is required`);
        if (q.choices.some(c => !c.trim())) errs.push(`Question #${n}: all 4 choices are required`);
        if (q.correctIndex < 0) errs.push(`Question #${n}: select the correct answer`);
      });
    } else {
      if (satItems.length === 0) errs.push('Add at least one question');
      satItems.forEach((s, i) => {
        const n = i + 1;
        if (!s.passage.trim()) errs.push(`Question #${n}: passage is required`);
        if (!s.question.trim()) errs.push(`Question #${n}: question is required`);
        if (s.choices.some(c => !c.trim())) errs.push(`Question #${n}: all 4 choices are required`);
        if (s.correctIndex < 0) errs.push(`Question #${n}: select the correct answer`);
      });
    }
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }

    const common = { title: title.trim(), seq, assignedKidIds };

    if (quizType === 'satReading') {
      const satQuestions = satItems.map((s, i) => ({
        id: `satq_${i}`,
        passage: s.passage.trim(),
        question: s.question.trim(),
        choices: s.choices.map(c => c.trim()) as [string, string, string, string],
        correctAnswer: s.choices[s.correctIndex].trim(),
      }));
      if (existingQuiz) {
        updateQuiz(existingQuiz.id, { ...common, type: 'satReading', satQuestions, words: [] });
      } else {
        addQuiz({ ...common, type: 'satReading', satQuestions, words: [] });
      }
    } else if (quizType === 'reading') {
      const questionEntries = questions.map((q, i) => ({
        id: `question_${i}`,
        question: q.question.trim(),
        choices: q.choices.map(c => c.trim()) as [string, string, string, string],
        correctAnswer: q.choices[q.correctIndex].trim(),
      }));
      if (existingQuiz) {
        updateQuiz(existingQuiz.id, { ...common, type: 'reading', passage: passage.trim(), questions: questionEntries, words: [] });
      } else {
        addQuiz({ ...common, type: 'reading', passage: passage.trim(), questions: questionEntries, words: [] });
      }
    } else {
      const wordEntries = words.map((w, i) => ({
        id: `word_${i}`,
        word: w.word.trim(),
        sentence: w.sentence.trim(),
        choices: w.choices.map(c => c.trim()) as [string, string, string, string],
        correctAnswer: w.choices[w.correctIndex].trim(),
      }));
      if (existingQuiz) {
        updateQuiz(existingQuiz.id, { ...common, type: 'vocab', words: wordEntries });
      } else {
        addQuiz({ ...common, type: 'vocab', words: wordEntries });
      }
    }
    navigate('/admin/quizzes');
  };

  // Shared choice grid renderer
  const renderChoiceGrid = (
    choices: [string, string, string, string],
    correctIndex: number,
    radioName: string,
    onChoice: (ci: number, val: string) => void,
    onCorrect: (ci: number) => void,
  ) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      {choices.map((choice, ci) => (
        <label key={ci} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="radio" name={radioName} checked={correctIndex === ci} onChange={() => onCorrect(ci)} style={{ width: 18, height: 18 }} />
          <input className="input" value={choice} onChange={e => onChoice(ci, e.target.value)} placeholder={`Choice ${ci + 1}`} style={{ flex: 1 }} />
        </label>
      ))}
    </div>
  );

  return (
    <div>
      <h1 className="page-title">{existingQuiz ? 'Edit Quiz' : 'New Quiz'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          {/* Quiz type selector */}
          {!existingQuiz ? (
            <div className="form-group">
              <label className="label">Quiz Type</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['vocab', 'reading', 'satReading'] as QuizType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuizType(t)}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: 'var(--radius-sm)',
                      border: `2px solid ${quizType === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      backgroundColor: quizType === t ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                      color: quizType === t ? 'var(--color-primary)' : 'var(--color-text-light)',
                      fontWeight: quizType === t ? 700 : 500,
                      fontSize: '0.9375rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family)',
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label className="label">Quiz Type</label>
              <div style={{ color: 'var(--color-text-light)', fontSize: '0.9375rem' }}>{TYPE_LABELS[quizType]}</div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group" style={{ flex: 3 }}>
              <label className="label">Quiz Title</label>
              <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder={TITLE_PLACEHOLDERS[quizType]} autoFocus />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="label">Sequence #</label>
              <input className="input" type="number" value={seq} onChange={e => setSeq(Number(e.target.value))} min={1} />
            </div>
          </div>
          {kids.length > 0 && (
            <div className="form-group">
              <label className="label">Assign to</label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {kids.map(kid => (
                  <label key={kid.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9375rem' }}>
                    <input type="checkbox" checked={assignedKidIds.includes(kid.id)} onChange={() => toggleKid(kid.id)} style={{ width: 18, height: 18 }} />
                    {kid.name} ({kid.grade})
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* === VOCAB === */}
        {quizType === 'vocab' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Words ({words.length})</h2>
            {words.map((word, wi) => (
              <div key={wi} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Word #{wi + 1}</span>
                  {words.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => dispatchWords({ type: 'REMOVE', index: wi })}>Remove</button>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="label">Word</label>
                    <input className="input" value={word.word} onChange={e => dispatchWords({ type: 'SET_FIELD', index: wi, field: 'word', value: e.target.value })} placeholder="e.g. benevolent" />
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label className="label">Sentence</label>
                    <input className="input" value={word.sentence} onChange={e => dispatchWords({ type: 'SET_FIELD', index: wi, field: 'sentence', value: e.target.value })} placeholder="e.g. The benevolent king helped the poor." />
                  </div>
                </div>
                <label className="label">Choices (select the correct one)</label>
                {renderChoiceGrid(word.choices, word.correctIndex, `correct_${wi}`,
                  (ci, val) => dispatchWords({ type: 'SET_CHOICE', index: wi, choiceIndex: ci, value: val }),
                  (ci) => dispatchWords({ type: 'SET_CORRECT', index: wi, choiceIndex: ci }))}
              </div>
            ))}
            <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: '1.5rem' }} onClick={() => dispatchWords({ type: 'ADD' })}>+ Add Word</button>
          </>
        )}

        {/* === READING === */}
        {quizType === 'reading' && (
          <>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="label">Passage</label>
                <textarea className="input" value={passage} onChange={e => setPassage(e.target.value)} placeholder="Paste or type the reading passage here..." rows={8} style={{ resize: 'vertical', lineHeight: 1.6 }} />
              </div>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Questions ({questions.length})</h2>
            {questions.map((q, qi) => (
              <div key={qi} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Question #{qi + 1}</span>
                  {questions.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => dispatchQuestions({ type: 'REMOVE', index: qi })}>Remove</button>}
                </div>
                <div className="form-group">
                  <label className="label">Question</label>
                  <input className="input" value={q.question} onChange={e => dispatchQuestions({ type: 'SET_QUESTION', index: qi, value: e.target.value })} placeholder="e.g. What is the main idea of the passage?" />
                </div>
                <label className="label">Choices (select the correct one)</label>
                {renderChoiceGrid(q.choices, q.correctIndex, `q_correct_${qi}`,
                  (ci, val) => dispatchQuestions({ type: 'SET_CHOICE', index: qi, choiceIndex: ci, value: val }),
                  (ci) => dispatchQuestions({ type: 'SET_CORRECT', index: qi, choiceIndex: ci }))}
              </div>
            ))}
            <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: '1.5rem' }} onClick={() => dispatchQuestions({ type: 'ADD' })}>+ Add Question</button>
          </>
        )}

        {/* === SAT READING === */}
        {quizType === 'satReading' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Questions ({satItems.length})</h2>
            {satItems.map((s, si) => (
              <div key={si} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Question #{si + 1}</span>
                  {satItems.length > 1 && <button type="button" className="btn btn-danger btn-sm" onClick={() => dispatchSAT({ type: 'REMOVE', index: si })}>Remove</button>}
                </div>
                <div className="form-group">
                  <label className="label">Passage</label>
                  <textarea className="input" value={s.passage} onChange={e => dispatchSAT({ type: 'SET_PASSAGE', index: si, value: e.target.value })} placeholder="Short passage (25-150 words)..." rows={4} style={{ resize: 'vertical', lineHeight: 1.6 }} />
                </div>
                <div className="form-group">
                  <label className="label">Question</label>
                  <input className="input" value={s.question} onChange={e => dispatchSAT({ type: 'SET_QUESTION', index: si, value: e.target.value })} placeholder="e.g. Which choice best describes the main purpose?" />
                </div>
                <label className="label">Choices (select the correct one)</label>
                {renderChoiceGrid(s.choices, s.correctIndex, `sat_correct_${si}`,
                  (ci, val) => dispatchSAT({ type: 'SET_CHOICE', index: si, choiceIndex: ci, value: val }),
                  (ci) => dispatchSAT({ type: 'SET_CORRECT', index: si, choiceIndex: ci }))}
              </div>
            ))}
            <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: '1.5rem' }} onClick={() => dispatchSAT({ type: 'ADD' })}>+ Add Question</button>
          </>
        )}

        {errors.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            {errors.map((err, i) => <p key={i} className="error-text">{err}</p>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/quizzes')}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{existingQuiz ? 'Save Changes' : 'Create Quiz'}</button>
        </div>
      </form>
    </div>
  );
}
