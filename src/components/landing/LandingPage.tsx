import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../hooks/useAppData';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { loginAsProvider } = useAuth();
  const { isProviderPasswordSet, verifyProviderPassword, setProviderPassword } = useAppData();
  const navigate = useNavigate();
  const isFirstTime = !isProviderPasswordSet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isFirstTime) {
        if (password.length < 4) {
          setError('Password must be at least 4 characters');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords don\'t match');
          return;
        }
        await setProviderPassword(password);
        loginAsProvider();
        navigate('/admin/kids');
      } else {
        const ok = await verifyProviderPassword(password);
        if (ok) {
          loginAsProvider();
          navigate('/admin/dashboard');
        } else {
          setError('Incorrect password');
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
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
          Admin Dashboard
        </p>
      </div>

      <div className="card" style={{ maxWidth: 420, width: '100%', padding: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 700 }}>
          {isFirstTime ? 'Welcome! Set a Password' : 'Login'}
        </h2>
        {isFirstTime && <p style={{ color: 'var(--color-text-light)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>This password protects the admin area.</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              className="input"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoFocus
            />
          </div>
          {isFirstTime && (
            <div className="form-group">
              <label className="label" htmlFor="admin-confirm-password">Confirm Password</label>
              <input
                id="admin-confirm-password"
                type="password"
                className="input"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              />
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            {isFirstTime ? 'Set Password & Enter' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
