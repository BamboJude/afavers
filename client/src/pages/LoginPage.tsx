import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useLanguage } from '../store/languageStore';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = useAuthStore((state) => state.login);
  const loginDemo = useAuthStore((state) => state.loginDemo);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await loginDemo();
      navigate('/dashboard');
    } catch {
      setError(t('demoUnavailable'));
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="afavers" className="h-24 mx-auto mb-4" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
            <p className="text-gray-500 text-sm">{t('loginSubtitle')}</p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t('password')}</label>
                <Link to="/forgot-password" className="text-xs text-green-600 hover:text-green-700 font-medium">
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition shadow-md hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {t('signingIn')}
                </span>
              ) : t('signIn')}
            </button>
          </form>

          <div className="mt-5">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200" />
              <span className="px-3 text-sm text-gray-400">{t('or')}</span>
              <div className="flex-grow border-t border-gray-200" />
            </div>
            <button
              onClick={handleDemo}
              disabled={demoLoading}
              className="mt-4 w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-amber-900 font-semibold py-3 px-4 rounded-lg transition"
            >
              {demoLoading ? t('loadingDemo') : t('tryDemo')}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t('noAccount')}{' '}
            <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
              {t('createOneFree')}
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          {t('loginFooter')}
        </p>
      </div>
    </div>
  );
};
