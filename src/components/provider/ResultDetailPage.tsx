import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';

export default function ResultDetailPage() {
  const { resultId } = useParams();
  const { results, quizzes } = useAppData();
  const result = results.find(r => r.id === resultId);
  const quiz = result ? quizzes.find(q => q.id === result.quizId) : undefined;
  const isVocab = (quiz?.type ?? 'vocab') === 'vocab';

  if (!result) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Result not found.</p>
        <Link to="/admin/results" className="btn btn-secondary" style={{ marginTop: '1rem' }}>Back to Results</Link>
      </div>
    );
  }

  const pct = result.totalWords > 0 ? Math.round((result.score / result.totalWords) * 100) : 0;

  return (
    <div>
      <Link to="/admin/results" style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>&larr; Back to Results</Link>
      <h1 className="page-title" style={{ marginTop: '0.75rem' }}>{result.quizTitle}</h1>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div><span style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Student</span><div style={{ fontWeight: 700 }}>{result.kidName}</div></div>
          <div><span style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Score</span><div style={{ fontWeight: 700 }}>{result.score}/{result.totalWords} ({pct}%)</div></div>
          <div><span style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Date</span><div style={{ fontWeight: 700 }}>{new Date(result.completedAt).toLocaleString()}</div></div>
          {result.timeTaken != null && (
            <div><span style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>Time</span><div style={{ fontWeight: 700 }}>{Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s</div></div>
          )}
        </div>
      </div>

      <div className="table-wrap card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{isVocab ? 'Word' : 'Question'}</th>
              {isVocab && <th>Sentence</th>}
              <th>Selected</th>
              <th>Correct Answer</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {result.answers.map((a, i) => (
              <tr key={i} style={{ backgroundColor: a.isCorrect ? 'var(--color-success-light)' : 'var(--color-error-light)' }}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{isVocab ? a.word : a.sentence}</td>
                {isVocab && <td style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>{a.sentence}</td>}
                <td>{a.selected}</td>
                <td>{a.correctAnswer}</td>
                <td>
                  <span className={`badge ${a.isCorrect ? 'badge-success' : 'badge-error'}`}>
                    {a.isCorrect ? 'Correct' : 'Wrong'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
