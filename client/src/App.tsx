import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { KanbanPage } from './pages/KanbanPage';
import { SettingsPage } from './pages/SettingsPage';
import { SetupPage } from './pages/SetupPage';
import { EnglishJobsPage } from './pages/EnglishJobsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard"    element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
        <Route path="/jobs"         element={<ProtectedLayout><JobsPage /></ProtectedLayout>} />
        <Route path="/jobs/:id"     element={<ProtectedLayout><JobDetailPage /></ProtectedLayout>} />
        <Route path="/kanban"       element={<ProtectedLayout><KanbanPage /></ProtectedLayout>} />
        <Route path="/settings"     element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
        <Route path="/setup"        element={<ProtectedLayout><SetupPage /></ProtectedLayout>} />
        <Route path="/english-jobs" element={<ProtectedLayout><EnglishJobsPage /></ProtectedLayout>} />
        <Route path="/analytics"    element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
