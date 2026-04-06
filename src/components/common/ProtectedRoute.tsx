import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ role, children }: { role: 'provider' | 'kid'; children: React.ReactNode }) {
  const { auth } = useAuth();
  if (auth.role !== role) {
    return <Navigate to={role === 'kid' ? '/quiz/login' : '/'} replace />;
  }
  return <>{children}</>;
}
