import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AuthState } from '../types';

interface AuthContextValue {
  auth: AuthState;
  loginAsProvider: () => void;
  loginAsKid: (kidId: string, kidName: string) => void;
  logout: () => void;
}

const AUTH_SESSION_KEY = 'vocabQuiz_auth';

function loadAuth(): AuthState {
  try {
    const raw = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { role: 'none' };
}

function saveAuth(auth: AuthState) {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(auth));
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadAuth);

  const loginAsProvider = useCallback(() => {
    const next: AuthState = { role: 'provider' };
    saveAuth(next);
    setAuth(next);
  }, []);

  const loginAsKid = useCallback((kidId: string, kidName: string) => {
    const next: AuthState = { role: 'kid', kidId, kidName };
    saveAuth(next);
    setAuth(next);
  }, []);

  const logout = useCallback(() => {
    const next: AuthState = { role: 'none' };
    saveAuth(next);
    setAuth(next);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loginAsProvider, loginAsKid, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
