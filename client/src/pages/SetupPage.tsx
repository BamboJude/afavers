import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const FIELD_PRESETS = [
  { label: 'Tech / IT',      keywords: 'developer, software engineer, data analyst, DevOps, IT', emoji: '💻' },
  { label: 'Environment',   keywords: 'umwelt, klimaschutz, nachhaltigkeit, GIS, energie',        emoji: '🌱' },
  { label: 'Business',       keywords: 'consulting, beratung, project manager, finance, accounting', emoji: '📊' },
  { label: 'Healthcare',     keywords: 'nurse, Pflegefachkraft, doctor, Arzt, medical',            emoji: '🏥' },
  { label: 'Engineering',    keywords: 'Ingenieur, engineer, mechanical, electrical, civil',       emoji: '⚙️' },
  { label: 'Marketing',      keywords: 'marketing, social media, SEO, content, brand manager',    emoji: '📣' },
];

const LOCATION_PRESETS = [
  'Berlin', 'München', 'Hamburg', 'Frankfurt', 'Köln',
  'Düsseldorf', 'Stuttgart', 'Leipzig', 'Dortmund', 'Essen',
];

export const SetupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [keywords, setKeywords] = useState('');
  const [locations, setLocations] = useState('');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCities = locations.split(',').map(l => l.trim()).filter(Boolean);

  const handleFieldSelect = (preset: typeof FIELD_PRESETS[0]) => {
    setSelectedField(preset.label);
    setKeywords(preset.keywords);
  };

  const handleCityToggle = (city: string) => {
    if (selectedCities.includes(city)) {
      setLocations(selectedCities.filter(c => c !== city).join(', '));
    } else {
      setLocations([...selectedCities, city].join(', '));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', {
        keywords: keywords.trim() || 'developer, analyst, engineer',
        locations: locations.trim() || 'Berlin, München, Hamburg',
      });
    } catch {
      // Best effort — go to dashboard anyway
    } finally {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s < step  ? 'w-10 bg-blue-500' :
                s === step ? 'w-14 bg-blue-500' :
                             'w-6 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* ── STEP 1: Keywords ── */}
          {step === 1 && (
            <div className="p-8">
              <div className="text-center mb-7">
                <div className="text-5xl mb-3">🎯</div>
                <h1 className="text-2xl font-bold text-gray-900">What kind of jobs are you looking for?</h1>
                <p className="text-gray-500 text-sm mt-2">afavers will fetch matching jobs every 2 hours automatically</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {FIELD_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => handleFieldSelect(preset)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedField === preset.label
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <div className="text-2xl mb-1">{preset.emoji}</div>
                    <div className="font-semibold text-gray-800 text-sm">{preset.label}</div>
                    <div className="text-gray-400 text-xs mt-0.5 truncate">{preset.keywords.split(',')[0]}...</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or enter custom keywords <span className="text-gray-400">(comma-separated)</span>
                </label>
                <textarea
                  rows={2}
                  value={keywords}
                  onChange={e => { setKeywords(e.target.value); setSelectedField(null); }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm resize-none"
                  placeholder="e.g. project manager, analyst, Ingenieur"
                />
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!keywords.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition shadow-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Locations ── */}
          {step === 2 && (
            <div className="p-8">
              <div className="text-center mb-7">
                <div className="text-5xl mb-3">📍</div>
                <h1 className="text-2xl font-bold text-gray-900">Where are you looking?</h1>
                <p className="text-gray-500 text-sm mt-2">Select the cities you want to search in</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {LOCATION_PRESETS.map(city => (
                  <button
                    key={city}
                    onClick={() => handleCityToggle(city)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                      selectedCities.includes(city)
                        ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or type custom locations
                </label>
                <input
                  type="text"
                  value={locations}
                  onChange={e => setLocations(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="e.g. München, remote, Frankfurt"
                />
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !locations.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition shadow-sm"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Start Searching 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          You can change these anytime in Settings
        </p>
      </div>
    </div>
  );
};
