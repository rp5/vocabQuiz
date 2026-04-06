import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProviderLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="app-header">
        <div className="container">
          <span className="app-header-title">
            Rigor <span className="header-type">Vocab | Reading</span>
            <span style={{ color: 'var(--color-text-light)', fontSize: '0.75rem', fontFamily: 'var(--font-family)', marginLeft: '0.5rem' }}>Admin</span>
          </span>
          <nav>
            <NavLink to="/admin/dashboard">Dashboard</NavLink>
            <NavLink to="/admin/kids">Kids</NavLink>
            <NavLink to="/admin/quizzes">Quizzes</NavLink>
            <NavLink to="/admin/results">Results</NavLink>
            <NavLink to="/admin/analytics">Analytics</NavLink>
            <NavLink to="/admin/export">Export</NavLink>
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
