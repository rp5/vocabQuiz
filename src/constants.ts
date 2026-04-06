export const STORAGE_KEY = 'vocabQuiz_data';

export const ROUTES = {
  HOME: '/',
  PROVIDER: '/provider',
  PROVIDER_DASHBOARD: '/provider/dashboard',
  PROVIDER_KIDS: '/provider/kids',
  PROVIDER_QUIZZES: '/provider/quizzes',
  PROVIDER_QUIZ_NEW: '/provider/quizzes/new',
  PROVIDER_QUIZ_EDIT: '/provider/quizzes/:quizId/edit',
  PROVIDER_RESULTS: '/provider/results',
  PROVIDER_RESULT_DETAIL: '/provider/results/:resultId',
  PROVIDER_ANALYTICS: '/provider/analytics',
  PROVIDER_EXPORT: '/provider/export',
  KID: '/kid',
  KID_DASHBOARD: '/kid/dashboard',
  KID_QUIZ: '/kid/quiz/:quizId',
  KID_QUIZ_RESULT: '/kid/quiz/:quizId/result/:resultId',
  KID_HISTORY: '/kid/history',
} as const;
