import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { AppLayout } from './components/layout/AppLayout';

const LoginPage         = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage      = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const DashboardPage     = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const JobsPage          = lazy(() => import('./pages/JobsPage').then(m => ({ default: m.JobsPage })));
const JobDetailPage     = lazy(() => import('./pages/JobDetailPage').then(m => ({ default: m.JobDetailPage })));
const KanbanPage        = lazy(() => import('./pages/KanbanPage').then(m => ({ default: m.KanbanPage })));
const SettingsPage      = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SetupPage         = lazy(() => import('./pages/SetupPage').then(m => ({ default: m.SetupPage })));
const EnglishJobsPage   = lazy(() => import('./pages/EnglishJobsPage').then(m => ({ default: m.EnglishJobsPage })));
const AnalyticsPage     = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const HotpicksPage      = lazy(() => import('./pages/HotpicksPage').then(m => ({ default: m.HotpicksPage })));
const InterviewPrepPage = lazy(() => import('./pages/InterviewPrepPage').then(m => ({ default: m.InterviewPrepPage })));
const CareerGuidesPage  = lazy(() => import('./pages/CareerGuidesPage').then(m => ({ default: m.CareerGuidesPage })));
const LandingPage       = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const DisclaimerPage    = lazy(() => import('./pages/DisclaimerPage').then(m => ({ default: m.DisclaimerPage })));
const DemoJobsPage      = lazy(() => import('./pages/DemoJobsPage').then(m => ({ default: m.DemoJobsPage })));
const RemindersPage     = lazy(() => import('./pages/RemindersPage').then(m => ({ default: m.RemindersPage })));
const NewsPage          = lazy(() => import('./pages/NewsPage').then(m => ({ default: m.NewsPage })));
const AdminPage         = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const AdminLoginPage    = lazy(() => import('./pages/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })));
const WerkstudentPage   = lazy(() => import('./pages/WerkstudentPage').then(m => ({ default: m.WerkstudentPage })));

const TIMEOUT_MS  = 30 * 60 * 1000; // 30 minutes → logout
const WARNING_MS  = 25 * 60 * 1000; // 25 minutes → show warning

function SessionGuard() {
  const { isAuthenticated, updateActivity, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { setShowWarning(false); return; }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const onActivity = () => { updateActivity(); setShowWarning(false); };
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const { lastActivity: current } = useAuthStore.getState();
      if (!current) return;
      const idle = Date.now() - current;
      if (idle > TIMEOUT_MS) {
        setShowWarning(false);
        logout();
      } else if (idle > WARNING_MS) {
        setShowWarning(true);
      }
    }, 30_000);

    return () => {
      events.forEach(e => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, updateActivity, logout]);

  if (!showWarning) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '28px 32px', maxWidth: 360, width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center', fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⏱️</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, color: '#111' }}>Are you still there?</h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>
          You'll be logged out in a few minutes due to inactivity.
        </p>
        <button
          onClick={() => { updateActivity(); setShowWarning(false); }}
          style={{
            padding: '10px 28px', background: '#16a34a', color: '#fff',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15,
          }}
        >
          Yes, keep me logged in
        </button>
      </div>
    </div>
  );
}

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <AppLayout>{children}</AppLayout>
  </ProtectedRoute>
);

const RootRedirect = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />;
};

function App() {
  return (
    <BrowserRouter>
      <SessionGuard />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" /></div>}>
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
        <Route path="/werkstudent"    element={<ProtectedLayout><WerkstudentPage /></ProtectedLayout>} />
        <Route path="/admin" element={
          <AdminRoute>
            <AppLayout><AdminPage /></AppLayout>
          </AdminRoute>
        } />
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/demo" element={<DemoJobsPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/" element={<RootRedirect />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
