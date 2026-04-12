import type { QuizResult } from '../types';
import { debugLog } from './debugLog';

const PENDING_KEY = 'vocabQuiz_pendingResults';

export function enqueueResult(result: QuizResult): void {
  try {
    const pending = getPendingResults().filter(r => r.id !== result.id);
    pending.push(result);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    debugLog(`Enqueued result ${result.id} for "${result.quizTitle}"`);
  } catch {
    debugLog('Failed to enqueue result to localStorage', 'warn');
  }
}

export function dequeueResult(resultId: string): void {
  try {
    const pending = getPendingResults().filter(r => r.id !== resultId);
    if (pending.length === 0) {
      localStorage.removeItem(PENDING_KEY);
    } else {
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    }
    debugLog(`Dequeued result ${resultId} (confirmed by server)`);
  } catch {
    debugLog('Failed to dequeue result from localStorage', 'warn');
  }
}

export function getPendingResults(): QuizResult[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
