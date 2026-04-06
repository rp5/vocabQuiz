import { useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../hooks/useAppData';
import { boldWord } from '../../utils/boldWord';
import { getQuizType, getQuizItemCount } from '../../utils/quizHelpers';
import { renderPassage } from '../../utils/renderPassage';
import { shuffleArray } from '../../utils/shuffle';
import SATQuizTakePage from './SATQuizTakePage';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizTakePage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { quizzes, saveResult } = useAppData();
  const startedAt = useRef(new Date().toISOString());
  const submittingRef = useRef(false);

  const quiz = quizzes.find(q => q.id === quizId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [revealedHints, setRevealedHints] = useState<Set<string>>(new Set());

  const quizType = quiz ? getQuizType(quiz) : 'vocab';
  const isVocab = quizType === 'vocab';
  const itemCount = quiz ? getQuizItemCount(quiz) : 0;

  // Shuffle choices once per quiz load (depend on quizId, not quiz object which
  // gets a new reference every 10s from polling)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledChoices = useMemo(() => {
    if (!quiz) return {};
    const map: Record<string, string[]> = {};
    if (!isVocab) {
      for (const q of (quiz.questions ?? [])) {
        map[q.id] = shuffleArray(q.choices);
      }
    } else {
      for (const w of quiz.words) {
        map[w.id] = shuffleArray(w.choices);
      }
    }
    return map;
  }, [quizId]);

  if (!quiz || !quiz.assignedKidIds.includes(auth.kidId!)) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p style={{ fontSize: '1.125rem' }}>Quiz not found or not assigned to you.</p>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/quiz/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  if (quizType === 'satReading') {
    return <SATQuizTakePage quiz={quiz} />;
  }

  const allAnswered = !isVocab
    ? (quiz.questions ?? []).every(q => answers[q.id])
    : quiz.words.every(w => answers[w.id]);

  const alwaysShowSentence = quiz.alwaysShowSentence ?? true;

  const handleSubmit = () => {
    if (submittingRef.current || !allAnswered || submitted) return;
    submittingRef.current = true;
    setSubmitted(true);

    let answerRecords;
    if (!isVocab) {
      answerRecords = (quiz.questions ?? []).map((q, i) => ({
        wordId: q.id,
        word: `Q${i + 1}`,
        sentence: q.question,
        selected: answers[q.id],
        correctAnswer: q.correctAnswer,
        isCorrect: answers[q.id] === q.correctAnswer,
      }));
    } else {
      answerRecords = quiz.words.map(w => ({
        wordId: w.id,
        word: w.word,
        sentence: w.sentence,
        selected: answers[w.id],
        correctAnswer: w.correctAnswer,
        isCorrect: answers[w.id] === w.correctAnswer,
        usedHint: alwaysShowSentence ? undefined : revealedHints.has(w.id),
      }));
    }

    const score = answerRecords.filter(a => a.isCorrect).length;

    const result = saveResult({
      quizId: quiz.id,
      kidId: auth.kidId!,
      kidName: auth.kidName!,
      quizTitle: quiz.title,
      startedAt: startedAt.current,
      completedAt: new Date().toISOString(),
      score,
      totalWords: itemCount,
      answers: answerRecords,
    });

    navigate(`/quiz/take/${quiz.id}/result/${result.id}`);
  };

  const renderChoiceButton = (itemId: string, choice: string, ci: number) => {
    const selected = answers[itemId] === choice;
    return (
      <button
        key={ci}
        type="button"
        onClick={() => setAnswers(prev => ({ ...prev, [itemId]: choice }))}
        style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-sm)',
          border: `2px solid ${selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
          backgroundColor: selected ? 'rgba(108, 99, 255, 0.08)' : 'var(--color-surface)',
          color: selected ? 'var(--color-primary)' : 'var(--color-text)',
          fontWeight: selected ? 700 : 500,
          fontSize: '1.0625rem',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-family)',
          transition: 'border-color 0.15s, background-color 0.15s',
          minHeight: 48,
        }}
      >
        {choice}
      </button>
    );
  };

  // --- Reading: split-screen layout ---
  if (!isVocab) {
    const questions = quiz.questions ?? [];
    return (
      <div className="sat-layout">
        <div className="sat-nav-bar">
          <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{quiz.title}</div>
          <div className="sat-nav-counter">
            {Object.keys(answers).length}/{questions.length} answered
          </div>
        </div>

        <div className="sat-split">
          <div className="sat-split-left">
            <div className="sat-passage-content">
              {quiz.passage && renderPassage(quiz.passage)}
            </div>
          </div>
          <div className="sat-split-right" style={{ overflowY: 'auto' }}>
            {questions.map((q, i) => (
              <div key={q.id} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-light)', fontWeight: 600, fontSize: '0.875rem' }}>{i + 1}.</span>
                  <span className="sat-question-text" style={{ marginBottom: 0 }}>{q.question}</span>
                </div>
                <div className="sat-choices">
                  {(shuffledChoices[q.id] || q.choices).map((choice, ci) => {
                    const selected = answers[q.id] === choice;
                    return (
                      <button
                        key={ci}
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: choice }))}
                        className={`sat-choice ${selected ? 'sat-choice--selected' : ''}`}
                      >
                        <span className="sat-choice-letter">{CHOICE_LETTERS[ci]}</span>
                        <span>{choice}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sat-bottom-nav">
          <div />
          <button
            className="btn btn-primary"
            style={{ minWidth: 160 }}
            disabled={!allAnswered || submitted}
            onClick={handleSubmit}
          >
            {allAnswered ? 'Submit Quiz' : `${Object.keys(answers).length}/${itemCount} answered`}
          </button>
        </div>
      </div>
    );
  }

  // --- Vocab: scrollable single-page layout ---
  return (
    <div>
      <h1 className="page-title">{quiz.title}</h1>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '2rem', fontSize: '1.0625rem' }}>
        Answer all {itemCount} questions, then submit.
      </p>

      {quiz.words.map((word, i) => {
        const hintRevealed = revealedHints.has(word.id);
        return (
        <div key={word.id} className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--color-text-light)', fontWeight: 600, fontSize: '0.875rem' }}>{i + 1}.</span>
            <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{word.word}</span>
          </div>
          {alwaysShowSentence || hintRevealed ? (
            <p style={{ color: 'var(--color-text-light)', marginBottom: '1rem', fontSize: '1.0625rem', fontStyle: 'italic' }}>
              "{boldWord(word.sentence, word.word)}"
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setRevealedHints(prev => new Set(prev).add(word.id))}
              className="btn btn-secondary btn-sm"
              style={{ marginBottom: '1rem', fontSize: '0.875rem' }}
            >
              Show word in a sentence
            </button>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {(shuffledChoices[word.id] || word.choices).map((choice, ci) =>
              renderChoiceButton(word.id, choice, ci)
            )}
          </div>
        </div>
        );
      })}

      <div style={{ position: 'sticky', bottom: 0, padding: '1rem 0', background: 'var(--color-bg)' }}>
        <button
          className="btn btn-primary"
          style={{ width: '100%', fontSize: '1.125rem', padding: '0.875rem' }}
          disabled={!allAnswered || submitted}
          onClick={handleSubmit}
        >
          {allAnswered ? 'Submit Quiz' : `${Object.keys(answers).length}/${itemCount} answered`}
        </button>
      </div>
    </div>
  );
}
