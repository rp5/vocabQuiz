import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../hooks/useAppData';
import { renderPassage } from '../../utils/renderPassage';
import { shuffleArray } from '../../utils/shuffle';
import type { Quiz } from '../../types';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];

export default function SATQuizTakePage({ quiz }: { quiz: Quiz }) {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { saveResult } = useAppData();
  const startedAt = useRef(new Date().toISOString());
  const submittingRef = useRef(false);

  const questions = quiz.satQuestions ?? [];
  const isTimed = quiz.timed ?? false;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showReview, setShowReview] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Timer state — uses wall-clock time via Date.now() to avoid drift
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerStartRef = useRef(Date.now());
  const pausedDurationRef = useRef(0);
  const pauseStartRef = useRef(0);

  // Timer tick — uses Date.now() deltas for accuracy
  useEffect(() => {
    if (!isTimed || paused || submitted) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timerStartRef.current - pausedDurationRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [isTimed, paused, submitted]);

  const togglePause = useCallback(() => {
    setPaused(prev => {
      if (!prev) {
        // Pausing: record when pause started
        pauseStartRef.current = Date.now();
      } else {
        // Resuming: accumulate paused duration
        pausedDurationRef.current += Date.now() - pauseStartRef.current;
      }
      return !prev;
    });
  }, []);

  // Shuffle choices once per quiz load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const shuffledChoices = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const q of questions) {
      map[q.id] = shuffleArray(q.choices);
    }
    return map;
  }, [quiz.id]);

  const current = questions[currentIndex];
  const answeredCount = questions.filter(q => answers[q.id]).length;
  const allAnswered = answeredCount === questions.length;

  const handleSubmit = () => {
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;
    setSubmitted(true);

    const answerRecords = questions.map((sq, i) => ({
      wordId: sq.id,
      word: `Q${i + 1}`,
      sentence: sq.question,
      selected: answers[sq.id] || '',
      correctAnswer: sq.correctAnswer,
      isCorrect: answers[sq.id] === sq.correctAnswer,
    }));

    const score = answerRecords.filter(a => a.isCorrect).length;

    const result = saveResult({
      quizId: quiz.id,
      kidId: auth.kidId!,
      kidName: auth.kidName!,
      quizTitle: quiz.title,
      startedAt: startedAt.current,
      completedAt: new Date().toISOString(),
      score,
      totalWords: questions.length,
      ...(isTimed ? { timeTaken: elapsed } : {}),
      answers: answerRecords,
    });

    navigate(`/quiz/take/${quiz.id}/result/${result.id}`);
  };

  // --- Timer display (fixed position in app header area, top-right) ---
  const timerDisplay = isTimed ? (
    <div className="sat-timer-fixed">
      <span className="sat-timer-time" data-testid="sat-timer">{formatTime(elapsed)}</span>
      <button
        type="button"
        className={`sat-timer-btn ${paused ? 'sat-timer-btn--paused' : ''}`}
        onClick={togglePause}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
    </div>
  ) : null;

  // --- Pause overlay ---
  if (paused && !showReview) {
    return (
      <div className="sat-layout">
        {timerDisplay}
        <div className="sat-nav-bar">
          <div className="sat-nav-numbers">
            {questions.map((q, i) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = i === currentIndex;
              return (
                <button key={q.id} type="button" disabled className={`sat-nav-btn ${isCurrent ? 'sat-nav-btn--current' : ''} ${isAnswered ? 'sat-nav-btn--answered' : ''}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="sat-nav-counter">Q {currentIndex + 1} of {questions.length}</div>
        </div>
        <div className="sat-split sat-split--blurred">
          <div className="sat-split-left">
            <div className="sat-passage-content">{renderPassage(current.passage)}</div>
          </div>
          <div className="sat-split-right">
            <div className="sat-question-text">{current.question}</div>
            <div className="sat-choices">
              {(shuffledChoices[current.id] || current.choices).map((choice, ci) => (
                <button key={ci} type="button" disabled className="sat-choice">
                  <span className="sat-choice-letter">{CHOICE_LETTERS[ci]}</span>
                  <span>{choice}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="sat-bottom-nav">
          <div />
          <div style={{ color: 'var(--color-text-light)', fontWeight: 600 }}>Test Paused</div>
          <div />
        </div>
      </div>
    );
  }

  // --- Review screen ---
  if (showReview) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {timerDisplay}
        <h1 className="page-title">{quiz.title}</h1>
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Review Your Answers</div>
          <div style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
            {answeredCount} of {questions.length} answered
          </div>
          {isTimed && (
            <div style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
              Time: {formatTime(elapsed)}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2rem' }}>
            {questions.map((q, i) => {
              const isAnswered = !!answers[q.id];
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => { setCurrentIndex(i); setShowReview(false); }}
                  style={{
                    width: 44, height: 44,
                    borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${isAnswered ? 'var(--color-success)' : 'var(--color-border)'}`,
                    backgroundColor: isAnswered ? 'var(--color-success-light)' : 'var(--color-surface)',
                    color: isAnswered ? 'var(--color-success)' : 'var(--color-text-light)',
                    fontWeight: 700, fontSize: '0.9375rem',
                    cursor: 'pointer', fontFamily: 'var(--font-family)',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setShowReview(false)}>Go Back</button>
            <button className="btn btn-primary" disabled={submitted} onClick={handleSubmit} style={{ minWidth: 160 }}>
              {allAnswered ? 'Submit Test' : `Submit (${answeredCount}/${questions.length})`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Question screen (split layout) ---
  if (!current) return null;

  const choices = shuffledChoices[current.id] || current.choices;

  return (
    <div className="sat-layout">
      {timerDisplay}
      {/* Top nav bar */}
      <div className="sat-nav-bar">
        <div className="sat-nav-numbers">
          {questions.map((q, i) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={`sat-nav-btn ${isCurrent ? 'sat-nav-btn--current' : ''} ${isAnswered ? 'sat-nav-btn--answered' : ''}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="sat-nav-counter">
          Q {currentIndex + 1} of {questions.length}
        </div>
      </div>

      {/* Split content */}
      <div className="sat-split">
        <div className="sat-split-left">
          <div className="sat-passage-content">
            {renderPassage(current.passage)}
          </div>
        </div>
        <div className="sat-split-right">
          <div className="sat-question-text">{current.question}</div>
          <div className="sat-choices">
            {choices.map((choice, ci) => {
              const selected = answers[current.id] === choice;
              return (
                <button
                  key={ci}
                  type="button"
                  onClick={() => setAnswers(prev => ({ ...prev, [current.id]: choice }))}
                  className={`sat-choice ${selected ? 'sat-choice--selected' : ''}`}
                >
                  <span className="sat-choice-letter">{CHOICE_LETTERS[ci]}</span>
                  <span>{choice}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="sat-bottom-nav">
        <button
          className="btn btn-secondary"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(i => i - 1)}
        >
          Previous
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentIndex < questions.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setCurrentIndex(i => i + 1)}>
              Next
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowReview(true)}>
              Review &amp; Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
