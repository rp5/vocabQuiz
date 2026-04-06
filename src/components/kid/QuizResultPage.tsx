import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { boldWord } from '../../utils/boldWord';

export default function QuizResultPage() {
  const { resultId } = useParams();
  const { results, quizzes } = useAppData();
  const result = results.find(r => r.id === resultId);

  if (!result) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Result not found.</p>
        <Link to="/quiz/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Dashboard</Link>
      </div>
    );
  }

  const quiz = quizzes.find(q => q.id === result.quizId);
  const isVocab = (quiz?.type ?? 'vocab') === 'vocab';
  const pct = result.totalWords > 0 ? Math.round((result.score / result.totalWords) * 100) : 0;
  const emoji = pct >= 90 ? '🌟' : pct >= 70 ? '👍' : pct >= 50 ? '📚' : '💪';

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '2.5rem', background: pct >= 70 ? 'linear-gradient(135deg, var(--color-success-light) 0%, var(--color-surface) 100%)' : 'linear-gradient(135deg, var(--color-error-light) 0%, var(--color-surface) 100%)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{emoji}</div>
        <h1 style={{ fontFamily: 'var(--font-brand)', fontSize: '2.5rem', fontWeight: 400, marginBottom: '0.25rem', color: 'var(--color-text)' }}>
          {result.score} out of {result.totalWords}
        </h1>
        <div style={{ fontSize: '1.5rem', color: pct >= 70 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700 }}>
          {pct}%
        </div>
        <div style={{ marginTop: '0.75rem', color: 'var(--color-text-light)', fontSize: '1.0625rem' }}>
          {pct >= 90 ? 'Amazing job!' : pct >= 70 ? 'Great work!' : pct >= 50 ? 'Good effort! Keep studying!' : 'Keep practicing, you\'ll get there!'}
        </div>
        {result.timeTaken != null && (
          <div style={{ marginTop: '0.5rem', color: 'var(--color-text-light)', fontSize: '0.9375rem' }}>
            Time: {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
          </div>
        )}
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Review</h2>

      {result.answers.map((a, i) => (
        <div key={i} className="card" style={{
          marginBottom: '0.75rem',
          borderLeft: `4px solid ${a.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', minWidth: 0 }}>
              {isVocab ? `${i + 1}. ${a.word}` : `${i + 1}.`}
            </span>
            <span className={`badge ${a.isCorrect ? 'badge-success' : 'badge-error'}`} style={{ flexShrink: 0 }}>
              {a.isCorrect ? 'Correct' : 'Wrong'}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-light)', fontSize: '0.9375rem', fontStyle: isVocab ? 'italic' : 'normal', marginBottom: '0.5rem' }}>
            {isVocab ? `"${boldWord(a.sentence, a.word)}"` : a.sentence}
          </p>
          {!a.isCorrect && (
            <div style={{ fontSize: '0.9375rem' }}>
              <span style={{ color: 'var(--color-error)' }}>Your answer: {a.selected}</span>
              <span style={{ margin: '0 0.5rem' }}>&middot;</span>
              <span style={{ color: 'var(--color-success)' }}>Correct: {a.correctAnswer}</span>
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <Link to="/quiz/dashboard" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>Back to Quizzes</Link>
        <Link to={`/quiz/take/${result.quizId}`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>Try Again</Link>
      </div>
    </div>
  );
}
