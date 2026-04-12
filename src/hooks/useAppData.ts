import { useState, useCallback, useEffect } from 'react';
import type { AppData, Kid, Quiz, QuizResult } from '../types';
import { getCachedData, updateCachedData, loadAppData, apiPost, apiPostWithRetry, apiPatch, apiDelete, hasPendingSaves, mergePendingResults } from '../utils/storage';
import { enqueueResult, dequeueResult, getPendingResults } from '../utils/resultQueue';
import { debugLog } from '../utils/debugLog';
import { generateId } from '../utils/ids';
import { hashPassword } from '../utils/crypto';

function recoverPendingResults() {
  const pending = getPendingResults();
  if (pending.length === 0) return;
  debugLog(`Recovery: found ${pending.length} pending result(s) in localStorage`);
  for (const result of pending) {
    apiPostWithRetry('/results', result)
      .then(() => {
        debugLog(`Recovery: ${result.id} confirmed by server`);
        dequeueResult(result.id);
      })
      .catch(err => {
        debugLog(`Recovery: ${result.id} still failing: ${err}`, 'error');
      });
  }
}

export function useAppData() {
  const [data, setDataRaw] = useState<AppData>(getCachedData);
  const [loading, setLoading] = useState(true);

  // Wrap setData to also update the shared cache
  const setData = useCallback((updater: AppData | ((prev: AppData) => AppData)) => {
    setDataRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      updateCachedData(() => next);
      return next;
    });
  }, []);

  // Initial load from server
  useEffect(() => {
    // Skip fetch if cache already has data (avoids overwriting optimistic updates on navigation)
    const cached = getCachedData();
    const hasData = cached.kids.length > 0 || cached.quizzes.length > 0 || cached.results.length > 0 || cached.providerPasswordHash !== '';
    if (hasData) {
      setLoading(false);
      recoverPendingResults();
      return;
    }
    loadAppData().then(d => {
      setData(mergePendingResults(d));
      setLoading(false);
      recoverPendingResults();
    }).catch(() => {
      setLoading(false);
    });
  }, [setData]);

  // Poll for updates every 10 seconds (skip while saves are in-flight to avoid
  // overwriting optimistic updates with stale server data)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (hasPendingSaves()) return;
      try {
        const fresh = await loadAppData();
        setData(mergePendingResults(fresh));
      } catch { /* silent */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // --- Provider password ---
  const isProviderPasswordSet = useCallback(() => {
    return data.providerPasswordHash !== '';
  }, [data.providerPasswordHash]);

  const setProviderPassword = useCallback(async (password: string) => {
    const hash = await hashPassword(password);
    setData(d => ({ ...d, providerPasswordHash: hash }));
    apiPatch('/provider-password', { hash }).catch(console.error);
  }, []);

  const verifyProviderPassword = useCallback(async (password: string) => {
    const hash = await hashPassword(password);
    return hash === data.providerPasswordHash;
  }, [data.providerPasswordHash]);

  // --- Kids ---
  const addKid = useCallback((kid: Omit<Kid, 'id' | 'createdAt'>): Kid => {
    const newKid: Kid = {
      ...kid,
      id: generateId('kid'),
      createdAt: new Date().toISOString(),
    };
    setData(d => ({ ...d, kids: [...d.kids, newKid] }));
    apiPost('/kids', newKid).catch(err => {
      console.error('Failed to save kid:', err);
      setData(d => ({ ...d, kids: d.kids.filter(k => k.id !== newKid.id) }));
    });
    return newKid;
  }, []);

  const updateKid = useCallback((id: string, updates: Partial<Omit<Kid, 'id' | 'createdAt'>>) => {
    setData(d => ({
      ...d,
      kids: d.kids.map(k => k.id === id ? { ...k, ...updates } : k),
    }));
    apiPatch(`/kids/${id}`, updates).catch(console.error);
  }, []);

  const deleteKid = useCallback((id: string) => {
    setData(d => ({
      ...d,
      kids: d.kids.filter(k => k.id !== id),
      quizzes: d.quizzes.map(q => ({
        ...q,
        assignedKidIds: q.assignedKidIds.filter(kid => kid !== id),
      })),
      results: d.results.filter(r => r.kidId !== id),
    }));
    apiDelete(`/kids/${id}`).catch(console.error);
  }, []);

  const authenticateKid = useCallback((name: string, password: string): Kid | undefined => {
    return data.kids.find(k => k.name.toLowerCase() === name.toLowerCase() && k.password === password);
  }, [data.kids]);

  const isNameTaken = useCallback((name: string, excludeId?: string): boolean => {
    return data.kids.some(k => k.name.toLowerCase() === name.toLowerCase() && k.id !== excludeId);
  }, [data.kids]);

  // --- Quizzes ---
  const addQuiz = useCallback((quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>): Quiz => {
    const now = new Date().toISOString();
    const newQuiz: Quiz = {
      ...quiz,
      id: generateId('quiz'),
      createdAt: now,
      updatedAt: now,
    };
    setData(d => ({ ...d, quizzes: [...d.quizzes, newQuiz] }));
    apiPost('/quizzes', newQuiz).catch(err => {
      console.error('Failed to save quiz:', err);
      setData(d => ({ ...d, quizzes: d.quizzes.filter(q => q.id !== newQuiz.id) }));
    });
    return newQuiz;
  }, []);

  const updateQuiz = useCallback((id: string, updates: Partial<Omit<Quiz, 'id' | 'createdAt'>>) => {
    setData(d => ({
      ...d,
      quizzes: d.quizzes.map(q =>
        q.id === id ? { ...q, ...updates, updatedAt: new Date().toISOString() } : q
      ),
    }));
    apiPatch(`/quizzes/${id}`, updates).catch(console.error);
  }, []);

  const deleteQuiz = useCallback((id: string) => {
    setData(d => ({
      ...d,
      quizzes: d.quizzes.filter(q => q.id !== id),
      results: d.results.filter(r => r.quizId !== id),
    }));
    apiDelete(`/quizzes/${id}`).catch(console.error);
  }, []);

  const getQuizzesForKid = useCallback((kidId: string): Quiz[] => {
    return data.quizzes.filter(q => q.assignedKidIds.includes(kidId));
  }, [data.quizzes]);

  // --- Results ---
  const saveResult = useCallback((result: Omit<QuizResult, 'id'>): QuizResult => {
    const newResult: QuizResult = {
      ...result,
      id: generateId('result'),
    };
    debugLog(`saveResult: ${newResult.id} for "${newResult.quizTitle}"`);
    // Persist to localStorage BEFORE anything else (survives browser close)
    enqueueResult(newResult);
    // Optimistic update to React state
    setData(d => ({ ...d, results: [...d.results, newResult] }));
    // POST with retry; dequeue on success, keep in localStorage on failure
    apiPostWithRetry('/results', newResult)
      .then(() => {
        debugLog(`saveResult: ${newResult.id} confirmed by server`);
        dequeueResult(newResult.id);
      })
      .catch(err => {
        debugLog(`saveResult: ${newResult.id} FAILED after retries: ${err}`, 'error');
      });
    return newResult;
  }, []);

  const getResultsForKid = useCallback((kidId: string): QuizResult[] => {
    return data.results.filter(r => r.kidId === kidId);
  }, [data.results]);

  const getResultsForQuiz = useCallback((quizId: string): QuizResult[] => {
    return data.results.filter(r => r.quizId === quizId);
  }, [data.results]);

  // --- Bulk import (used by ExportImportPage) ---
  const persistImport = useCallback(async (imported: { kids?: Kid[]; quizzes?: Quiz[]; results?: QuizResult[] }) => {
    try {
      const result = await apiPatch('/data', imported) as AppData;
      setData({ ...getCachedData(), ...result });
    } catch (err) {
      console.error('Import failed:', err);
    }
  }, []);

  return {
    data,
    loading,
    // Provider password
    isProviderPasswordSet,
    setProviderPassword,
    verifyProviderPassword,
    // Kids
    kids: data.kids,
    addKid,
    updateKid,
    deleteKid,
    authenticateKid,
    isNameTaken,
    // Quizzes
    quizzes: data.quizzes,
    addQuiz,
    updateQuiz,
    deleteQuiz,
    getQuizzesForKid,
    // Results
    results: data.results,
    saveResult,
    getResultsForKid,
    getResultsForQuiz,
    // Import
    persistImport,
  };
}
