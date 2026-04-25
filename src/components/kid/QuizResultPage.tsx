import { useParams, Link } from 'react-router-dom';
import { useAppData } from '../../hooks/useAppData';
import { boldWord } from '../../utils/boldWord';
import { renderPassage } from '../../utils/renderPassage';
import { getQuizType } from '../../utils/quizHelpers';
import type { AnswerRecord, Quiz } from '../../types';

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];

function choiceClass(choice: string, a: AnswerRecord): string {
  const isCorrect = choice === a.correctAnswer;
  const isPicked = choice === a.selected;
  if (isCorrect) return 'sat-choice sat-choice--correct';
  if (isPicked) return 'sat-choice sat-choice--wrong';
  return 'sat-choice';
}

function ChoiceList({ choices, answer }: { choices: string[]; answer: AnswerRecord }) {
  return (
    <div className="sat-choices">
      {choices.map((choice, ci) => (
        <div key={ci} className={choiceClass(choice, answer)}>
          <span className="sat-choice-letter">{CHOICE_LETTERS[ci]}</span>
          <span style={{ flex: 1 }}>{choice}</span>
          {choice === answer.selected && choice !== answer.correctAnswer && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Your answer</span>
          )}
          {choice === answer.correctAnswer && choice !== answer.selected && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Correct</span>
          )}
          {choice === answer.correctAnswer && choice === answer.selected && (
            <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Your answer</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ResultBadge({ a }: { a: AnswerRecord }) {
  return (
    <span className={`badge ${a.isCorrect ? 'badge-success' : 'badge-error'}`} style={{ flexShrink: 0 }}>
      {a.isCorrect ? 'Correct' : 'Wrong'}
    </span>
  );
}

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

  const quiz: Quiz | undefined = quizzes.find(q => q.id === result.quizId);
  const quizType = quiz ? getQuizType(quiz) : 'vocab';
  const pct = result.totalWords > 0 ? Math.round((result.score / result.totalWords) * 100) : 0;
  const emoji = pct >= 90 ? '🌟' : pct >= 70 ? '👍' : pct >= 50 ? '📚' : '💪';

  // Build a lookup from item id -> choices (in original order)
  const choicesById: Record<string, string[]> = {};
  if (quiz) {
    if (quizType === 'vocab') {
      for (const w of quiz.words ?? []) choicesById[w.id] = w.choices;
    } else if (quizType === 'reading') {
      for (const q of quiz.questions ?? []) choicesById[q.id] = q.choices;
    } else {
      for (const sq of quiz.satQuestions ?? []) choicesById[sq.id] = sq.choices;
    }
  }

  // For SAT we need passage per question; for reading we have one shared passage
  const satPassageById: Record<string, string> = {};
  if (quiz && quizType === 'satReading') {
    for (const sq of quiz.satQuestions ?? []) satPassageById[sq.id] = sq.passage;
  }

  const headerCard = (
    <div className="card" style={{
      textAlign: 'center', marginBottom: '1.5rem', padding: '2.5rem',
      background: pct >= 70
        ? 'linear-gradient(135deg, var(--color-success-light) 0%, var(--color-surface) 100%)'
        : 'linear-gradient(135deg, var(--color-error-light) 0%, var(--color-surface) 100%)',
    }}>
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
  );

  const footer = (
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
      <Link to="/quiz/dashboard" className="btn btn-secondary" style={{ flex: 1, textAlign: 'center' }}>Back to Quizzes</Link>
      <Link to={`/quiz/take/${result.quizId}`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>Try Again</Link>
    </div>
  );

  // Fallback when the underlying quiz has been deleted: show the legacy summary.
  if (!quiz) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {headerCard}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Review</h2>
        <p style={{ color: 'var(--color-text-light)', marginBottom: '1rem', fontSize: '0.9375rem' }}>
          The original quiz is no longer available, so the full passage and choices can't be shown.
        </p>
        {result.answers.map((a, i) => (
          <div key={i} className="card" style={{
            marginBottom: '0.75rem',
            borderLeft: `4px solid ${a.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{i + 1}. {a.word}</span>
              <ResultBadge a={a} />
            </div>
            <p style={{ color: 'var(--color-text-light)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>{a.sentence}</p>
            {!a.isCorrect && (
              <div style={{ fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-error)' }}>Your answer: {a.selected}</span>
                <span style={{ margin: '0 0.5rem' }}>&middot;</span>
                <span style={{ color: 'var(--color-success)' }}>Correct: {a.correctAnswer}</span>
              </div>
            )}
          </div>
        ))}
        {footer}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {headerCard}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Review</h2>

      {/* Reading: show shared passage once at the top */}
      {quizType === 'reading' && quiz.passage && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            Passage
          </div>
          <div className="sat-passage-content">{renderPassage(quiz.passage)}</div>
        </div>
      )}

      {result.answers.map((a, i) => {
        const choices = choicesById[a.wordId];
        const passage = quizType === 'satReading' ? satPassageById[a.wordId] : null;

        return (
          <div key={i} className="card" style={{
            marginBottom: '1rem',
            borderLeft: `4px solid ${a.isCorrect ? 'var(--color-success)' : 'var(--color-error)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                {quizType === 'vocab' ? `${i + 1}. ${a.word}` : `${i + 1}.`}
              </span>
              <ResultBadge a={a} />
            </div>

            {/* SAT: per-question passage */}
            {passage && (
              <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <div className="sat-passage-content">{renderPassage(passage)}</div>
              </div>
            )}

            {/* Vocab: italic context sentence with the word bolded */}
            {quizType === 'vocab' && (
              <p style={{ color: 'var(--color-text-light)', fontSize: '1.0625rem', fontStyle: 'italic', marginBottom: '1rem' }}>
                "{boldWord(a.sentence, a.word)}"
              </p>
            )}

            {/* Reading / SAT: question text */}
            {quizType !== 'vocab' && (
              <div className="sat-question-text" style={{ marginBottom: '1rem' }}>{a.sentence}</div>
            )}

            {choices ? (
              <ChoiceList choices={choices} answer={a} />
            ) : (
              <div style={{ fontSize: '0.9375rem' }}>
                <span style={{ color: 'var(--color-error)' }}>Your answer: {a.selected || '(none)'}</span>
                <span style={{ margin: '0 0.5rem' }}>&middot;</span>
                <span style={{ color: 'var(--color-success)' }}>Correct: {a.correctAnswer}</span>
              </div>
            )}
          </div>
        );
      })}

      {footer}
    </div>
  );
}
