import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Settings {
  keywords: string;
  locations: string;
}

export const SettingsPage = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>({
    keywords: '',
    locations: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Search Settings</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-lg transition"
          >
            ← Dashboard
          </button>
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
                  Job Keywords
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
                  Locations
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
                  ✓ Settings saved
                </span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
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
