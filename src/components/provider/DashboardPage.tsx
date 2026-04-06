import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';

export default function DashboardPage() {
  const { kids, quizzes, results } = useAppData();

  const recentResults = [...results]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{kids.length}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Kids</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{quizzes.length}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Quizzes</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{results.length}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Total Attempts</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.score / r.totalWords) * 100, 0) / results.length) : 0}%
          </div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Avg Score</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Results</h2>
      {recentResults.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: 'var(--color-text-light)' }}>No quiz attempts yet.</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            {kids.length === 0 && <Link to="/admin/kids" className="btn btn-primary">Add Kids</Link>}
            {kids.length > 0 && quizzes.length === 0 && <Link to="/admin/quizzes/new" className="btn btn-primary">Create a Quiz</Link>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {recentResults.map(r => (
            <Link key={r.id} to={`/admin/results/${r.id}`} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 700 }}>{r.kidName}</span>
                <span style={{ color: 'var(--color-text-light)', margin: '0 0.5rem' }}>&middot;</span>
                <span>{r.quizTitle}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <span className={`badge ${(r.score / r.totalWords) >= 0.7 ? 'badge-success' : 'badge-error'}`}>
                  {r.score}/{r.totalWords}
                </span>
                <span style={{ color: 'var(--color-text-light)', fontSize: '0.8125rem' }}>
                  {new Date(r.completedAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
