export interface Kid {
  id: string;
  name: string;
  password: string;
  grade: string;
  createdAt: string;
}

export type QuizType = 'vocab' | 'reading' | 'satReading';

export interface ReadingQuestion {
  id: string;
  question: string;
  choices: [string, string, string, string];
  correctAnswer: string;
}

export interface SATQuestion {
  id: string;
  passage: string;
  question: string;
  choices: [string, string, string, string];
  correctAnswer: string;
}

export interface WordEntry {
  id: string;
  word: string;
  sentence: string;
  choices: [string, string, string, string];
  correctAnswer: string;
}

export interface Quiz {
  id: string;
  seq: number;
  title: string;
  type?: QuizType;
  // Vocab-specific
  alwaysShowSentence?: boolean;
  words: WordEntry[];
  // Reading-specific
  passage?: string;
  questions?: ReadingQuestion[];
  // SAT Reading-specific
  satQuestions?: SATQuestion[];
  timed?: boolean;
  // Common
  assignedKidIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnswerRecord {
  wordId: string;
  word: string;
  sentence: string;
  selected: string;
  correctAnswer: string;
  isCorrect: boolean;
  usedHint?: boolean;
}

export interface QuizResult {
  id: string;
  quizId: string;
  kidId: string;
  kidName: string;
  quizTitle: string;
  startedAt: string;
  completedAt: string;
  score: number;
  totalWords: number;
  timeTaken?: number; // elapsed seconds (timed quizzes)
  answers: AnswerRecord[];
}

export interface AppData {
  providerPasswordHash: string;
  kids: Kid[];
  quizzes: Quiz[];
  results: QuizResult[];
}

export interface ExportData {
  exportedAt: string;
  version: number;
  kids: Kid[];
  quizzes: Quiz[];
  results: QuizResult[];
}

export interface AuthState {
  role: 'none' | 'provider' | 'kid';
  kidId?: string;
  kidName?: string;
}
