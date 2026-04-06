import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLoginPage from './components/landing/LandingPage';
import KidLoginPage from './components/landing/KidLoginPage';
import ProviderLayout from './components/provider/ProviderLayout';
import DashboardPage from './components/provider/DashboardPage';
import KidsManagePage from './components/provider/KidsManagePage';
import QuizzesManagePage from './components/provider/QuizzesManagePage';
import QuizForm from './components/provider/QuizForm';
import ResultsPage from './components/provider/ResultsPage';
import ResultDetailPage from './components/provider/ResultDetailPage';
import AnalyticsPage from './components/provider/AnalyticsPage';
import ExportImportPage from './components/provider/ExportImportPage';
import KidLayout from './components/kid/KidLayout';
import KidDashboard from './components/kid/KidDashboard';
import QuizTakePage from './components/kid/QuizTakePage';
import QuizResultPage from './components/kid/QuizResultPage';
import KidResultsHistory from './components/kid/KidResultsHistory';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin login at root */}
          <Route path="/" element={<AdminLoginPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute role="provider"><ProviderLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="kids" element={<KidsManagePage />} />
            <Route path="quizzes" element={<QuizzesManagePage />} />
            <Route path="quizzes/new" element={<QuizForm />} />
            <Route path="quizzes/:quizId/edit" element={<QuizForm />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="results/:resultId" element={<ResultDetailPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="export" element={<ExportImportPage />} />
          </Route>

          {/* Kid login */}
          <Route path="/kids" element={<KidLoginPage />} />
          <Route path="/quiz/login" element={<KidLoginPage />} />

          {/* Kid routes */}
          <Route path="/quiz" element={
            <ProtectedRoute role="kid"><KidLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<KidDashboard />} />
            <Route path="take/:quizId" element={<QuizTakePage />} />
            <Route path="take/:quizId/result/:resultId" element={<QuizResultPage />} />
            <Route path="history" element={<KidResultsHistory />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
