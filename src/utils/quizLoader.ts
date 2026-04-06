import type { Quiz } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeQuiz(q: any, fallbackSeq: number): Quiz {
  const now = new Date().toISOString();
  let assignedKidIds: string[] = q.assignedKidIds || [];
  if (q.assignTo) {
    assignedKidIds = Array.isArray(q.assignTo) ? q.assignTo : [q.assignTo];
  }
  const seq = q.seq ?? fallbackSeq;
  const id = q.id || `quiz_seq_${seq}`;
  const type = q.type || (q.satQuestions ? 'satReading' : q.passage || q.questions ? 'reading' : 'vocab');

  const base = {
    id,
    seq,
    type,
    title: q.title || 'Untitled Quiz',
    assignedKidIds,
    createdAt: q.createdAt || now,
    updatedAt: q.updatedAt || now,
  };

  if (type === 'satReading') {
    return {
      ...base,
      timed: q.timed ?? false,
      satQuestions: (q.satQuestions || []).map((sq: any, i: number) => ({
        id: sq.id || `satq_${i}`,
        passage: sq.passage || '',
        question: sq.question || '',
        choices: sq.choices || ['', '', '', ''],
        correctAnswer: sq.correctAnswer || sq.answer || sq.choices?.[0] || '',
      })),
      words: [],
    };
  }

  if (type === 'reading') {
    return {
      ...base,
      passage: q.passage || '',
      questions: (q.questions || []).map((qn: any, i: number) => ({
        id: qn.id || `question_${i}`,
        question: qn.question || '',
        choices: qn.choices || ['', '', '', ''],
        correctAnswer: qn.correctAnswer || qn.answer || qn.choices?.[0] || '',
      })),
      words: [],
    };
  }

  return {
    ...base,
    alwaysShowSentence: q.alwaysShowSentence,
    words: (q.words || []).map((w: any, i: number) => ({
      id: w.id || `word_${i}`,
      word: w.word || '',
      sentence: w.sentence || '',
      choices: w.choices || ['', '', '', ''],
      correctAnswer: w.correctAnswer || w.answer || w.choices?.[0] || '',
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
