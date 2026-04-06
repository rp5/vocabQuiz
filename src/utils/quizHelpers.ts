import type { Quiz, QuizType } from '../types';

export function getQuizType(quiz: Quiz): QuizType {
  return quiz.type ?? 'vocab';
}

export function getQuizItemCount(quiz: Quiz): number {
  const type = getQuizType(quiz);
  if (type === 'reading') return quiz.questions?.length ?? 0;
  if (type === 'satReading') return quiz.satQuestions?.length ?? 0;
  return quiz.words.length;
}

export function getQuizItemLabel(quiz: Quiz): string {
  const count = getQuizItemCount(quiz);
  return getQuizType(quiz) === 'vocab'
    ? `${count} word${count !== 1 ? 's' : ''}`
    : `${count} question${count !== 1 ? 's' : ''}`;
}
