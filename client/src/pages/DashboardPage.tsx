import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const { user, logout, isMockMode } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mock Mode Banner */}
      {isMockMode && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 text-center">
          <p className="text-sm font-medium">
            🎨 <strong>Mock Mode Active</strong> - You're exploring the UI without a backend. Set up your database to use real data!
          </p>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Job Tracker</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600">Here's what's happening with your job search</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Saved</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Applied</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Interviews</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📞</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className={`rounded-lg shadow-lg p-8 text-white ${
          isMockMode
            ? 'bg-gradient-to-r from-purple-500 to-pink-600'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        }`}>
          <h3 className="text-2xl font-bold mb-4">
            {isMockMode ? '🎨 Mock Mode Active!' : '🚀 Backend is Ready!'}
          </h3>
          <p className={isMockMode ? 'text-purple-100 mb-4' : 'text-blue-100 mb-4'}>
            {isMockMode
              ? "You're exploring the UI without a backend connection. To enable full functionality:"
              : "Your authentication system is working perfectly. Next steps:"
            }
          </p>
          <ul className={`space-y-2 ${isMockMode ? 'text-purple-50' : 'text-blue-50'}`}>
            {isMockMode ? (
              <>
                <li>📦 Sign up for Supabase (free PostgreSQL database)</li>
                <li>🔑 Add DATABASE_URL to server/.env</li>
                <li>▶️ Start backend server: cd server && npm run dev</li>
                <li>✅ Login with real credentials on the login page</li>
              </>
            ) : (
              <>
                <li>✓ Backend API running on http://localhost:3000</li>
                <li>✓ Frontend connected and authenticated</li>
                <li>⏳ Job fetching services (coming next)</li>
                <li>⏳ Job management features</li>
                <li>⏳ Kanban board for applications</li>
                <li>⏳ Analytics dashboard</li>
              </>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
};
