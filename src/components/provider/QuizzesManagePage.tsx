import { Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { getQuizItemLabel, getQuizType } from '../../utils/quizHelpers';

export default function QuizzesManagePage() {
  const { quizzes, kids, deleteQuiz } = useAppData();

  const kidName = (id: string) => kids.find(k => k.id === id)?.name ?? 'Unknown';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Quizzes</h1>
        <Link to="/admin/quizzes/new" className="btn btn-primary">+ New Quiz</Link>
      </div>

      {quizzes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-light)', fontSize: '1.125rem' }}>
            No quizzes yet. {kids.length === 0 ? 'Add a kid first, then create a quiz.' : 'Create your first quiz!'}
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {quizzes.map(quiz => (
          <div key={quiz.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{quiz.title}</div>
              <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
                #{quiz.seq ?? '?'} &middot;
                <span className={`badge`} style={{ marginLeft: '0.25rem', marginRight: '0.25rem', padding: '0.125rem 0.5rem', fontSize: '0.6875rem', background: getQuizType(quiz) === 'vocab' ? 'var(--color-primary-bg)' : 'var(--color-secondary-light)', color: getQuizType(quiz) === 'vocab' ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                  {getQuizType(quiz) === 'vocab' ? 'Vocab' : getQuizType(quiz) === 'reading' ? 'Reading' : 'SAT Reading'}
                </span>
                &middot; {getQuizItemLabel(quiz)} &middot;
                Assigned to: {quiz.assignedKidIds.length === 0 ? 'nobody' : quiz.assignedKidIds.map(kidName).join(', ')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <Link to={`/admin/quizzes/${quiz.id}/edit`} className="btn btn-secondary btn-sm">Edit</Link>
              <button className="btn btn-danger btn-sm" onClick={() => {
                if (confirm(`Delete "${quiz.title}"? This will also remove all results for this quiz.`)) {
                  deleteQuiz(quiz.id);
                }
              }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
