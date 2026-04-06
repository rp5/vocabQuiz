import { useState, useMemo } from 'react';
import { useAppData } from '../../hooks/useAppData';

interface WordStat {
  word: string;
  totalAttempts: number;
  correctCount: number;
  missCount: number;
  missRate: number;
}

export default function AnalyticsPage() {
  const { kids, quizzes, results } = useAppData();
  const [kidFilter, setKidFilter] = useState('');
  const [quizFilter, setQuizFilter] = useState('');

  // Build a set of vocab quiz IDs for filtering
  const vocabQuizIds = useMemo(() => {
    return new Set(quizzes.filter(q => (q.type ?? 'vocab') === 'vocab').map(q => q.id));
  }, [quizzes]);

  const stats = useMemo(() => {
    const filtered = results.filter(r => {
      if (kidFilter && r.kidId !== kidFilter) return false;
      if (quizFilter && r.quizId !== quizFilter) return false;
      // Only include vocab quiz results — reading/SAT "Q1","Q2" labels are not meaningful words
      if (!vocabQuizIds.has(r.quizId)) return false;
      return true;
    });

    const wordMap = new Map<string, WordStat>();

    for (const result of filtered) {
      for (const answer of result.answers) {
        const key = answer.word.toLowerCase();
        const existing = wordMap.get(key) ?? {
          word: answer.word,
          totalAttempts: 0,
          correctCount: 0,
          missCount: 0,
          missRate: 0,
        };
        existing.totalAttempts++;
        if (answer.isCorrect) {
          existing.correctCount++;
        } else {
          existing.missCount++;
        }
        existing.missRate = existing.missCount / existing.totalAttempts;
        wordMap.set(key, existing);
      }
    }

    return Array.from(wordMap.values()).sort((a, b) => b.missRate - a.missRate);
  }, [results, kidFilter, quizFilter, vocabQuizIds]);

  return (
    <div>
      <h1 className="page-title">Word Analytics</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="label" htmlFor="analytics-kid-filter">Filter by Kid</label>
            <select id="analytics-kid-filter" className="input" value={kidFilter} onChange={e => setKidFilter(e.target.value)}>
              <option value="">All Kids</option>
              {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="label" htmlFor="analytics-quiz-filter">Filter by Quiz</label>
            <select id="analytics-quiz-filter" className="input" value={quizFilter} onChange={e => setQuizFilter(e.target.value)}>
              <option value="">All Vocab Quizzes</option>
              {quizzes.filter(q => (q.type ?? 'vocab') === 'vocab').map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-light)' }}>No data yet. Results will appear after quizzes are taken.</p>
        </div>
      ) : (
        <div className="table-wrap card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Word</th>
                <th>Times Seen</th>
                <th>Correct</th>
                <th>Missed</th>
                <th>Miss Rate</th>
                <th>Mastery</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => {
                const pct = Math.round(s.missRate * 100);
                const barColor = pct > 50 ? 'var(--color-error)' : pct > 25 ? 'var(--color-warning)' : 'var(--color-success)';
                return (
                  <tr key={s.word}>
                    <td style={{ fontWeight: 600 }}>{s.word}</td>
                    <td>{s.totalAttempts}</td>
                    <td>{s.correctCount}</td>
                    <td>{s.missCount}</td>
                    <td>{pct}%</td>
                    <td style={{ minWidth: 120 }}>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${100 - pct}%`, backgroundColor: barColor }} />
                      </div>
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
