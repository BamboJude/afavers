import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
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
import { HotpicksPage } from './pages/HotpicksPage';
import { InterviewPrepPage } from './pages/InterviewPrepPage';
import { CareerGuidesPage } from './pages/CareerGuidesPage';
import { LandingPage } from './pages/LandingPage';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { DemoJobsPage } from './pages/DemoJobsPage';
import { RemindersPage } from './pages/RemindersPage';
import { NewsPage } from './pages/NewsPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { AdminPage } from './pages/AdminPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AppLayout } from './components/layout/AppLayout';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

function SessionGuard() {
  const { isAuthenticated, updateActivity, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const onActivity = () => updateActivity();
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const { lastActivity: current } = useAuthStore.getState();
      if (current && Date.now() - current > TIMEOUT_MS) {
        logout();
      }
    }, 60_000);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, updateActivity, logout]);

  return null;
}

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <SessionGuard />
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
        <Route path="/hotpicks"        element={<ProtectedLayout><HotpicksPage /></ProtectedLayout>} />
        <Route path="/interview-prep" element={<ProtectedLayout><InterviewPrepPage /></ProtectedLayout>} />
        <Route path="/career-guides"  element={<ProtectedLayout><CareerGuidesPage /></ProtectedLayout>} />
        <Route path="/reminders"      element={<ProtectedLayout><RemindersPage /></ProtectedLayout>} />
        <Route path="/news"           element={<ProtectedLayout><NewsPage /></ProtectedLayout>} />
        <Route path="/admin" element={
          <AdminRoute>
            <AppLayout><AdminPage /></AppLayout>
          </AdminRoute>
        } />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/demo" element={<DemoJobsPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
