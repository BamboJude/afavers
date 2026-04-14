import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getPublicJobs } from '../services/publicJobs.service';

const CARD_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-teal-600', 'bg-orange-500',
  'bg-violet-600', 'bg-cyan-600', 'bg-green-700', 'bg-lime-600',
  'bg-rose-600', 'bg-indigo-600',
];

interface PublicJob {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  salary: string | null;
  source: string;
  posted_date: string | null;
  color?: string;
}

const SAMPLE_JOBS: PublicJob[] = [
  { id: -1, title: 'Nachhaltigkeitsberater (m/w/d)', company: 'GreenConsult GmbH', location: 'Düsseldorf', url: '#', salary: '45.000 – 60.000 €', source: 'sample', posted_date: null },
  { id: -2, title: 'GIS-Spezialist Umweltplanung', company: 'EnviroGeo AG', location: 'Köln', url: '#', salary: null, source: 'sample', posted_date: null },
  { id: -3, title: 'Projektmanager Erneuerbare Energien', company: 'SolarWind Solutions', location: 'Essen', url: '#', salary: '50.000 – 65.000 €', source: 'sample', posted_date: null },
  { id: -4, title: 'Umweltingenieur / Environmental Engineer', company: 'EcoTech GmbH', location: 'Bochum', url: '#', salary: null, source: 'sample', posted_date: null },
  { id: -5, title: 'Consultant Klimaschutz & Energie', company: 'ClimateForce', location: 'Dortmund', url: '#', salary: '42.000 – 58.000 €', source: 'sample', posted_date: null },
  { id: -6, title: 'Referent Nachhaltigkeit / CSR', company: 'NatureTech AG', location: 'Düsseldorf', url: '#', salary: null, source: 'sample', posted_date: null },
  { id: -7, title: 'Analyst Renewable Energy Markets', company: 'WindPower Consult', location: 'Köln', url: '#', salary: '48.000 – 62.000 €', source: 'sample', posted_date: null },
  { id: -8, title: 'Umweltschutzbeauftragter (m/w/d)', company: 'GreenFactory GmbH', location: 'Essen', url: '#', salary: null, source: 'sample', posted_date: null },
];

export const DemoJobsPage = () => {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getPublicJobs()
      .then((data: PublicJob[]) => {
        const source = data.length > 0 ? data : SAMPLE_JOBS;
        setJobs(source.map((j, i) => ({ ...j, color: CARD_COLORS[i % CARD_COLORS.length] })));
      })
      .catch(() => setJobs(SAMPLE_JOBS.map((j, i) => ({ ...j, color: CARD_COLORS[i % CARD_COLORS.length] }))))
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j =>
    !search.trim() ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    j.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
    <Helmet>
      <title>Live Job Demo – afavers | Green Jobs in Germany</title>
      <meta name="description" content="Browse real green and sustainability jobs in Germany fetched live from Bundesagentur für Arbeit. No login required. See how afavers tracks your applications." />
      <link rel="canonical" href="https://afavers.com/demo" />
      <meta property="og:title" content="Live Job Demo – afavers" />
      <meta property="og:description" content="Browse real green jobs in Germany fetched live from Bundesagentur für Arbeit. No login required." />
      <meta property="og:url" content="https://afavers.com/demo" />
    </Helmet>
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Sign-up banner ── */}
      <div className="bg-green-600 text-white py-3 px-6 text-center text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-3">
        <span>You're browsing in demo mode — sign up to track, save and apply to jobs.</span>
        <Link
          to="/register"
          className="shrink-0 px-4 py-1.5 bg-white text-green-700 font-bold rounded-full text-xs hover:bg-green-50 transition"
        >
          Create free account →
        </Link>
      </div>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <Link to="/">
            <img
              src="/logo.png"
              alt="afavers"
              className="h-14 w-auto"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition">
              Log in
            </Link>
            <Link to="/register" className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-full transition">
              Sign up free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Search header ── */}
      <div className="bg-white border-b border-gray-200 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center bg-white border-2 border-gray-200 focus-within:border-green-500 rounded-2xl shadow-sm transition overflow-hidden h-14">
            <span className="pl-5 text-gray-400 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search jobs, companies, cities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-4 text-gray-800 placeholder-gray-400 bg-transparent outline-none text-base"
              autoFocus={false}
            />
            {search && (
              <button onClick={() => setSearch('')} className="pr-4 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Jobs list ── */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <p className="text-sm text-gray-500 font-medium mb-6">
          {loading ? 'Loading jobs…' : `${filtered.length} jobs found · `}
          {!loading && <span className="text-green-600">updated every 2h</span>}
        </p>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-semibold mb-2">No jobs match your search</p>
            <p className="text-sm">Try a different keyword or city</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((job, i) => (
              <a
                key={job.id ?? i}
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-2xl p-6 border border-gray-200 hover:border-green-400 hover:shadow-md transition-all group"
              >
                <div className="flex gap-5 items-start">
                  {/* Company logo */}
                  <div className={`w-14 h-14 rounded-2xl ${job.color} flex items-center justify-center text-white font-extrabold text-xl shrink-0`}>
                    {job.company[0].toUpperCase()}
                  </div>

                  {/* Job info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-bold text-base group-hover:text-green-700 transition truncate">{job.title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{job.company}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                      {job.salary && (
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                          {job.salary}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* External link */}
                  <span className="text-gray-200 group-hover:text-green-500 transition shrink-0 mt-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* CTA at bottom */}
        {!loading && filtered.length > 0 && (
          <div className="mt-10 bg-green-50 border border-green-100 rounded-3xl p-8 text-center">
            <p className="text-lg font-bold text-gray-900 mb-2">Want to track your applications?</p>
            <p className="text-gray-500 text-sm mb-5">Sign up free to save jobs, track every application, and get reminders.</p>
            <Link
              to="/register"
              className="inline-block px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition shadow-sm"
            >
              Create free account →
            </Link>
          </div>
        )}
      </div>
    </div>
    </>
  );
};
