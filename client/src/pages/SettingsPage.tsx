import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useLanguage } from '../store/languageStore';
import { useAuthStore } from '../store/authStore';

interface Settings {
  keywords: string;
  locations: string;
}

export const SettingsPage = () => {
  const { t } = useLanguage();
  const isDemo = useAuthStore((s) => s.isDemo);
  const [settings, setSettings] = useState<Settings>({ keywords: '', locations: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ text: t('pwMismatch'), ok: false });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ text: t('pwTooShort'), ok: false });
      return;
    }
    setPwSaving(true);
    try {
      await api.patch('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next });
      setPwMsg({ text: t('pwChanged'), ok: true });
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwMsg({ text: err?.response?.data?.error || t('pwChangeFailed'), ok: false });
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
      setError(t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('settings')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('settingsSubtitle')}</p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 flex gap-3">
            <span className="text-lg shrink-0">ℹ️</span>
            <div>
              <strong>How it works:</strong> Jobs are fetched from Bundesagentur für Arbeit every 2 hours using your keywords and locations. Separate values with commas. Changes apply on the next fetch.
            </div>
          </div>

          {/* Search settings */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-base font-semibold text-gray-900">{t('searchSettings')}</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('keywords')}</label>
              <p className="text-xs text-gray-400 mb-2">{t('keywordsDesc')}</p>
              <textarea
                rows={3}
                value={settings.keywords}
                onChange={e => setSettings(s => ({ ...s, keywords: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none bg-white"
                placeholder={t('keywordsPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{t('locations')}</label>
              <p className="text-xs text-gray-400 mb-2">{t('locationsDesc')}</p>
              <textarea
                rows={2}
                value={settings.locations}
                onChange={e => setSettings(s => ({ ...s, locations: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none bg-white"
                placeholder={t('locationsPlaceholder')}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between items-center pt-1">
              <span className={`text-sm transition ${saved ? 'text-green-600' : 'text-transparent'}`}>
                ✓ {t('settingsSaved')}
              </span>
              <button
                onClick={handleSave}
                disabled={saving || isDemo}
                title={isDemo ? t('notAvailableDemo') : undefined}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
              >
                {saving ? t('saving') : t('saveSettings')}
              </button>
            </div>
          </div>

          {/* Keyword presets */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">{t('keywordIdeas')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { field: 'Tech / IT',    icon: '💻', kw: 'developer, software engineer, data analyst, DevOps, IT' },
                { field: 'Environment', icon: '🌿', kw: 'umwelt, klimaschutz, nachhaltigkeit, GIS, energie' },
                { field: 'Business',    icon: '📈', kw: 'consulting, beratung, project manager, finance, accounting' },
                { field: 'Healthcare',  icon: '🏥', kw: 'nurse, Pflegefachkraft, doctor, Arzt, medical' },
                { field: 'Engineering', icon: '⚙️', kw: 'Ingenieur, engineer, mechanical, electrical, civil' },
                { field: 'Marketing',   icon: '📢', kw: 'marketing, social media, SEO, content, brand' },
              ].map(({ field, icon, kw }) => (
                <button
                  key={field}
                  onClick={() => setSettings(s => ({ ...s, keywords: kw }))}
                  className="text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition group"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span>{icon}</span>
                    <span className="font-semibold text-sm text-gray-800 group-hover:text-blue-700">{field}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{kw}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">{t('changePassword')}</h2>
            {[
              { key: 'current', labelKey: 'currentPassword', placeholder: '••••••••' },
              { key: 'next',    labelKey: 'newPassword',     placeholderKey: 'minCharsHint' },
              { key: 'confirm', labelKey: 'confirmNewPassword', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t(f.labelKey)}</label>
                <input
                  type="password"
                  value={pwForm[f.key as keyof typeof pwForm]}
                  onChange={e => setPwForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
                  placeholder={f.placeholderKey ? t(f.placeholderKey) : f.placeholder}
                />
              </div>
            ))}
            {pwMsg && (
              <p className={`text-sm ${pwMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pwMsg.text}</p>
            )}
            <div className="flex justify-end pt-1">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm || isDemo}
                title={isDemo ? t('notAvailableDemo') : undefined}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition"
              >
                {pwSaving ? t('saving') : t('updatePassword')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
