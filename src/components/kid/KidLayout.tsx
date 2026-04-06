import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function KidLayout() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/quiz/login');
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
          <span style={{ color: 'var(--color-text-light)', fontSize: '0.6875rem', opacity: 0.6 }}>v{__APP_VERSION__}</span>
        </div>
      </header>
      <main className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem', flex: 1 }}>
        <Outlet />
      </main>
    </>
  );
}
