import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';

export default function ResultsPage() {
  const { kids, quizzes, results } = useAppData();
  const [kidFilter, setKidFilter] = useState('');
  const [quizFilter, setQuizFilter] = useState('');

  const filtered = results.filter(r => {
    if (kidFilter && r.kidId !== kidFilter) return false;
    if (quizFilter && r.quizId !== quizFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  return (
    <div>
      <h1 className="page-title">Results</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="label" htmlFor="results-kid-filter">Filter by Kid</label>
            <select id="results-kid-filter" className="input" value={kidFilter} onChange={e => setKidFilter(e.target.value)}>
              <option value="">All Kids</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="results-quiz-filter">Filter by Quiz</label>
            <select id="results-quiz-filter" className="input" value={quizFilter} onChange={e => setQuizFilter(e.target.value)}>
              <option value="">All Quizzes</option>
              {quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-light)' }}>No results yet.</p>
        </div>
      ) : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Kid</th>
                <th>Quiz</th>
                <th>Score</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const pct = Math.round((r.score / r.totalWords) * 100);
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.kidName}</td>
                    <td>{r.quizTitle}</td>
                    <td>
                      <span className={`badge ${pct >= 70 ? 'badge-success' : 'badge-error'}`}>
                        {r.score}/{r.totalWords} ({pct}%)
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
                      {new Date(r.completedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Link to={`/admin/results/${r.id}`} className="btn btn-secondary btn-sm">Details</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
