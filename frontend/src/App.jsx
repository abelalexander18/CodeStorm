// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { StudentProvider, useStudent } from './hooks/useStudent';
import Navbar from './components/Navbar';
import OnboardingPage from './pages/OnboardingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import AttendancePage from './pages/AttendancePage';

function ProtectedRoute({ children }) {
  const { student } = useStudent();
  if (!student) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { student } = useStudent();

  return (
    <div className="min-h-screen hero-gradient">
      {student && <Navbar />}
      <main className={student ? 'pt-16' : ''}>
        <Routes>
          <Route
            path="/"
            element={student ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StudentProvider>
      <AppRoutes />
    </StudentProvider>
  );
}
