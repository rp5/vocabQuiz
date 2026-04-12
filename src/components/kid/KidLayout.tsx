import { useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DebugLogPanel from '../common/DebugLogPanel';

export default function KidLayout() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleLogout = () => {
    logout();
    navigate('/quiz/login');
  };

  const handleVersionTap = () => {
    tapCountRef.current++;
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      clearTimeout(tapTimerRef.current);
      setShowDebug(prev => !prev);
      return;
    }
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 600);
  };

  return (
    <>
      <header className="app-header">
        <div className="container">
          <span className="app-header-title">
            Rigor <span className="header-type">Vocab | Reading</span>
          </span>
          <nav>
            <NavLink to="/quiz/dashboard">My Quizzes</NavLink>
            <NavLink to="/quiz/history">My Results</NavLink>
            <span style={{ color: 'var(--color-text-light)', fontWeight: 500, fontSize: '0.875rem' }}>Hi, {auth.kidName}!</span>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
          </nav>
          <span
            onClick={handleVersionTap}
            style={{ color: 'var(--color-text-light)', fontSize: '0.6875rem', opacity: 0.6, cursor: 'default', userSelect: 'none' }}
          >
            v{__APP_VERSION__}
          </span>
        </div>
      </header>
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: showDebug ? 'calc(50vh + 2rem)' : '2rem', flex: 1 }}>
        <Outlet />
      </main>
      <DebugLogPanel visible={showDebug} onClose={() => setShowDebug(false)} />
    </>
  );
}
