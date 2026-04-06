import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../hooks/useAppData';

export default function KidResultsHistory() {
  const { auth } = useAuth();
  const { getResultsForKid } = useAppData();

  const results = getResultsForKid(auth.kidId!)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  return (
    <div>
      <h1 className="page-title">My Results</h1>

      {results.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-text-light)' }}>No results yet. Take a quiz first!</p>
          <Link to="/quiz/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>Go to Quizzes</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {results.map(r => {
            const pct = Math.round((r.score / r.totalWords) * 100);
            return (
              <Link
                key={r.id}
                to={`/quiz/take/${r.quizId}/result/${r.id}`}
                className="card"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.0625rem' }}>{r.quizTitle}</div>
                  <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
                    {new Date(r.completedAt).toLocaleDateString()} at {new Date(r.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className={`badge ${pct >= 70 ? 'badge-success' : 'badge-error'}`} style={{ fontSize: '0.9375rem', padding: '0.375rem 0.75rem', flexShrink: 0 }}>
                  {r.score}/{r.totalWords} ({pct}%)
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
