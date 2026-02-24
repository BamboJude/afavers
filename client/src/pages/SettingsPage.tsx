import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useLanguage } from '../store/languageStore';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { DemoBanner } from '../components/common/DemoBanner';
import { useAuthStore } from '../store/authStore';

interface Settings {
  keywords: string;
  locations: string;
}

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isDemo = useAuthStore((s) => s.isDemo);
  const [settings, setSettings] = useState<Settings>({
    keywords: '',
    locations: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Change password state
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ text: 'New passwords do not match.', ok: false });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ text: 'New password must be at least 8 characters.', ok: false });
      return;
    }
    setPwSaving(true);
    try {
      await api.patch('/auth/password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwMsg({ text: 'Password changed successfully.', ok: true });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to change password.';
      setPwMsg({ text: msg, ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  useEffect(() => {
    api.get<Settings>('/settings').then(r => {
      setSettings(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner />
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('settings')}</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-lg transition"
            >
              ← {t('dashboard')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>How it works:</strong> Jobs are fetched from Bundesagentur für Arbeit using your keywords and locations every 2 hours. Separate multiple values with commas. Changes apply on the next fetch — or click <em>Fetch Now</em> on the dashboard.
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('keywords')}
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  What to search for. Examples: <code>developer, data analyst, marketing, finance, nurse, teacher</code>
                </p>
                <textarea
                  rows={3}
                  value={settings.keywords}
                  onChange={e => setSettings(s => ({ ...s, keywords: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm resize-none"
                  placeholder="e.g. developer, data analyst, project manager"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('locations')}
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Cities or regions to search in. Examples: <code>Berlin, München, Hamburg, Frankfurt, remote</code>
                </p>
                <textarea
                  rows={2}
                  value={settings.locations}
                  onChange={e => setSettings(s => ({ ...s, locations: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm resize-none"
                  placeholder="e.g. Düsseldorf, Köln, Dortmund"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div className="flex justify-between items-center pt-2">
                <span className={`text-sm transition ${saved ? 'text-green-600' : 'text-transparent'}`}>
                  ✓ {t('settingsSaved')}
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving || isDemo}
                  title={isDemo ? 'Not available in demo mode' : undefined}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                >
                  {saving ? '...' : t('saveSettings')}
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Current password</label>
                <input
                  type="password"
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New password</label>
                <input
                  type="password"
                  value={pwForm.next}
                  onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
              {pwMsg && (
                <p className={`text-sm ${pwMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pwMsg.text}</p>
              )}
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm || isDemo}
                  title={isDemo ? 'Not available in demo mode' : undefined}
                  className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
                >
                  {pwSaving ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Popular keyword ideas by field</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { field: 'Tech / IT',        kw: 'developer, software engineer, data analyst, DevOps, IT' },
                  { field: 'Environment',      kw: 'umwelt, klimaschutz, nachhaltigkeit, GIS, energie' },
                  { field: 'Business',         kw: 'consulting, beratung, project manager, finance, accounting' },
                  { field: 'Healthcare',       kw: 'nurse, Pflegefachkraft, doctor, Arzt, medical' },
                  { field: 'Engineering',      kw: 'Ingenieur, engineer, mechanical, electrical, civil' },
                  { field: 'Marketing',        kw: 'marketing, social media, SEO, content, brand' },
                ].map(({ field, kw }) => (
                  <button
                    key={field}
                    onClick={() => setSettings(s => ({ ...s, keywords: kw }))}
                    className="text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition"
                  >
                    <p className="font-medium text-gray-800">{field}</p>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">{kw}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
