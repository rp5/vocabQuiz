import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../hooks/useAppData';
import { getQuizItemLabel } from '../../utils/quizHelpers';

export default function KidDashboard() {
  const { auth } = useAuth();
  const { getQuizzesForKid, getResultsForKid } = useAppData();
  const [showPrevious, setShowPrevious] = useState(false);

  const quizzes = getQuizzesForKid(auth.kidId!);
  const results = getResultsForKid(auth.kidId!);

  // Sort by seq number
  const sorted = [...quizzes].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  // Split into taken and untaken
  const takenQuizIds = new Set(results.map(r => r.quizId));
  const taken = sorted.filter(q => takenQuizIds.has(q.id));
  const untaken = sorted.filter(q => !takenQuizIds.has(q.id));

  // Next untaken quiz per type
  const nextVocab = untaken.find(q => (q.type ?? 'vocab') === 'vocab') ?? null;
  const nextReading = untaken.find(q => q.type === 'reading' || q.type === 'satReading') ?? null;

  // Get latest result for a quiz
  const getLatestResult = (quizId: string) => {
    const attempts = results.filter(r => r.quizId === quizId);
    if (attempts.length === 0) return null;
    return attempts.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  };

  return (
    <div>
      <h1 className="page-title">My Quizzes</h1>

      {/* Next quizzes to take — one card per type */}
      {(nextVocab || nextReading) ? (
        <div style={{ display: 'grid', gridTemplateColumns: nextVocab && nextReading ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {nextVocab && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-surface) 100%)', borderColor: 'var(--color-primary)', borderWidth: 2 }}>
              <div style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                Vocabulary
              </div>
              <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 400, fontSize: '1.5rem', marginBottom: '0.25rem', color: 'var(--color-text)' }}>{nextVocab.title}</div>
              <div style={{ color: 'var(--color-text-light)', fontSize: '0.9375rem', marginBottom: '1.25rem' }}>
                {getQuizItemLabel(nextVocab)}
              </div>
              <Link to={`/quiz/take/${nextVocab.id}`} className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
                Start Quiz
              </Link>
            </div>
          )}
          {nextReading && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--color-secondary-light) 0%, var(--color-surface) 100%)', borderColor: 'var(--color-accent)', borderWidth: 2 }}>
              <div style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                Reading
              </div>
              <div style={{ fontFamily: 'var(--font-brand)', fontWeight: 400, fontSize: '1.5rem', marginBottom: '0.25rem', color: 'var(--color-text)' }}>{nextReading.title}</div>
              <div style={{ color: 'var(--color-text-light)', fontSize: '0.9375rem', marginBottom: '1.25rem' }}>
                {getQuizItemLabel(nextReading)}
              </div>
              <Link to={`/quiz/take/${nextReading.id}`} className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}>
                Start Quiz
              </Link>
            </div>
          )}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.25rem', color: 'var(--color-text-light)' }}>No quizzes assigned to you yet!</p>
          <p style={{ color: 'var(--color-text-light)', marginTop: '0.5rem' }}>Check back later.</p>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>All caught up!</div>
          <p style={{ color: 'var(--color-text-light)', fontSize: '1rem' }}>
            Review your past quizzes while you wait.
          </p>
        </div>
      )}

      {/* Previously taken section */}
      {taken.length > 0 && (
        <div>
          <button
            onClick={() => setShowPrevious(!showPrevious)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-family)',
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0',
              fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-light)',
            }}
          >
            <span style={{ transform: showPrevious ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>&#9654;</span>
            Previously Taken ({taken.length})
          </button>

          {showPrevious && (
            <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
              {taken.map(quiz => {
                const latest = getLatestResult(quiz.id);
                const pct = latest ? Math.round((latest.score / latest.totalWords) * 100) : 0;
                return (
                  <div key={quiz.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{quiz.title}</div>
                      <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
                        {getQuizItemLabel(quiz)}
                        {latest && (
                          <> &middot; Last: {latest.score}/{latest.totalWords} ({pct}%)</>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      {latest && (
                        <Link to={`/quiz/take/${quiz.id}/result/${latest.id}`} className="btn btn-secondary btn-sm">
                          Review
                        </Link>
                      )}
                      <Link to={`/quiz/take/${quiz.id}`} className="btn btn-primary btn-sm">
                        Retake
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
