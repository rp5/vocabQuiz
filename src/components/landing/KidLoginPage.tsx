import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../hooks/useAppData';

export default function KidLoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginAsKid } = useAuth();
  const { authenticateKid } = useAppData();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Enter your name');
      return;
    }
    if (!password) {
      setError('Enter your password');
      return;
    }
    const kid = authenticateKid(name.trim(), password);
    if (kid) {
      loginAsKid(kid.id, kid.name);
      navigate('/quiz/dashboard');
    } else {
      setError('Name or password is incorrect. Try again!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem', position: 'relative' }}>
      <span style={{ position: 'absolute', top: '1rem', right: '1.5rem', color: 'var(--color-text-light)', fontSize: '0.6875rem', opacity: 0.6 }}>v{__APP_VERSION__}</span>

      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-brand)', fontSize: '3rem', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
          <span style={{ color: 'var(--color-primary)' }}>Rigor</span>
        </h1>
        <div style={{ color: 'var(--color-accent)', fontSize: '1rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Vocab | Reading
        </div>
        <p style={{ color: 'var(--color-text-light)', marginTop: '1rem', fontSize: '0.9375rem' }}>
          Ready for a quiz?
        </p>
      </div>

      <div className="card" style={{ maxWidth: 420, width: '100%', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700 }}>Student Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="kid-login-name">Name</label>
            <input
              id="kid-login-name"
              className="input"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="kid-login-password">Password</label>
            <input
              id="kid-login-password"
              type="password"
              className="input"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
