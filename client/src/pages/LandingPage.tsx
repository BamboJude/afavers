import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CARD_COLORS = [
  'bg-emerald-600', 'bg-blue-600', 'bg-teal-600', 'bg-orange-500',
  'bg-violet-600', 'bg-cyan-600', 'bg-green-700', 'bg-lime-600',
  'bg-rose-600', 'bg-indigo-600',
];

const SAMPLE_JOBS: PublicJob[] = [
  { id: -1, title: 'Nachhaltigkeitsberater (m/w/d)', company: 'GreenConsult GmbH', location: 'Düsseldorf', url: '#', salary: '45.000 – 60.000 €', source: 'sample', posted_date: null },
  { id: -2, title: 'GIS-Spezialist Umweltplanung', company: 'EnviroGeo AG', location: 'Köln', url: '#', salary: null, source: 'sample', posted_date: null },
  { id: -3, title: 'Projektmanager Erneuerbare Energien', company: 'SolarWind Solutions', location: 'Essen', url: '#', salary: '50.000 – 65.000 €', source: 'sample', posted_date: null },
  { id: -4, title: 'Umweltingenieur / Environmental Engineer', company: 'EcoTech GmbH', location: 'Bochum', url: '#', salary: null, source: 'sample', posted_date: null },
  { id: -5, title: 'Consultant Klimaschutz & Energie', company: 'ClimateForce', location: 'Dortmund', url: '#', salary: '42.000 – 58.000 €', source: 'sample', posted_date: null },
  { id: -6, title: 'Analyst Renewable Energy Markets', company: 'WindPower Consult', location: 'Köln', url: '#', salary: '48.000 – 62.000 €', source: 'sample', posted_date: null },
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

const FEATURES = [
  {
    icon: '🔄',
    title: 'Auto-fetched every 2h',
    desc: 'Jobs from Bundesagentur für Arbeit land in your feed automatically — no manual searching.',
  },
  {
    icon: '📋',
    title: 'Track every application',
    desc: 'Kanban board to move jobs from Saved → Applied → Interview → Offer.',
  },
  {
    icon: '⚡',
    title: 'Hot Picks',
    desc: 'Swipe-style triage — pass or save one job at a time. Clear your list in minutes.',
  },
];

export const LandingPage = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedJob, setSelectedJob] = useState<PublicJob | null>(null);
  const [jobs, setJobs] = useState<PublicJob[]>([]);

  const handleSearchFocus = () => {
    navigate(isAuthenticated ? '/jobs' : '/demo');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(isAuthenticated ? `/jobs${search ? `?q=${encodeURIComponent(search)}` : ''}` : '/demo');
  };

  useEffect(() => {
    fetch(`${API_URL}/api/jobs/public`)
      .then(r => r.json())
      .then((data: PublicJob[]) => {
        const source = data.length > 0 ? data : SAMPLE_JOBS;
        setJobs(source.map((j, i) => ({ ...j, color: CARD_COLORS[i % CARD_COLORS.length] })));
      })
      .catch(() => setJobs(SAMPLE_JOBS.map((j, i) => ({ ...j, color: CARD_COLORS[i % CARD_COLORS.length] }))));
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
          <img
            src="/logo.png"
            alt="afavers"
            className="h-14 w-auto"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full transition"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-full transition"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-green-50 to-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-4">
            Find green jobs in Germany.<br />
            <span className="text-green-600">Track every application.</span>
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-xl mx-auto mb-8">
            afavers fetches sustainability & consulting jobs from Bundesagentur für Arbeit every 2 hours and gives you a dashboard to manage your whole search.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto mb-3">
            <div
              className="flex items-center bg-white border-2 border-gray-200 focus-within:border-green-500 rounded-2xl shadow-md transition overflow-hidden h-14 cursor-text"
              onClick={handleSearchFocus}
            >
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
                onFocus={handleSearchFocus}
                className="flex-1 px-4 text-gray-800 placeholder-gray-400 bg-transparent outline-none text-base cursor-text"
                readOnly
              />
              <button
                type="submit"
                className="mr-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition shrink-0"
              >
                Search
              </button>
            </div>
          </form>
          <p className="text-gray-400 text-sm">Free forever · No credit card</p>
        </div>

        {/* ── Live job cards ── */}
        <div className="pb-14">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-500">
              {jobs.length > 0
                ? <>{jobs.length} live jobs · <span className="text-green-600">updated every 2h</span></>
                : <span className="text-gray-400">Loading jobs…</span>
              }
            </p>
            <span className="text-xs text-gray-400 hidden sm:block">Scroll to explore →</span>
          </div>
          <div className="flex gap-4 overflow-x-auto px-6 sm:px-8 pb-3 scrollbar-hide snap-x snap-mandatory">
            {jobs.map((job, i) => (
              <button
                key={job.id ?? i}
                onClick={() => setSelectedJob(job)}
                className="snap-start shrink-0 w-72 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${job.color} flex items-center justify-center text-white font-extrabold text-lg shrink-0`}>
                    {job.company[0].toUpperCase()}
                  </div>
                  <svg className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <p className="text-gray-900 font-bold text-sm leading-snug mb-1 group-hover:text-green-700 transition line-clamp-2">{job.title}</p>
                <p className="text-gray-400 text-xs mb-3">{job.company} · {job.location}</p>
                <div className="mt-auto">
                  {job.salary ? (
                    <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">{job.salary}</span>
                  ) : (
                    <span className="inline-block px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-lg">View job →</span>
                  )}
                </div>
              </button>
            ))}

            {/* Sign-up end card */}
            <div className="snap-start shrink-0 w-72 bg-green-50 border-2 border-dashed border-green-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-2xl">🌿</div>
              <div>
                <p className="text-base font-bold text-gray-800 mb-0.5">See all jobs</p>
                <p className="text-xs text-gray-500">Track & apply from one place</p>
              </div>
              <Link
                to="/register"
                className="w-full text-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl transition"
              >
                Create free account →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features (compact 3-column) ── */}
      <section className="py-16 px-6 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8">
          {FEATURES.map(f => (
            <div key={f.title} className="text-center sm:text-left">
              <div className="text-3xl mb-3">{f.icon}</div>
              <p className="font-bold text-gray-900 mb-1">{f.title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 bg-green-600 text-white text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold mb-3">Ready to get started?</h2>
          <p className="text-green-100 mb-8">Free account · Takes 30 seconds.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-white text-green-700 font-extrabold rounded-2xl hover:bg-green-50 transition shadow-md text-sm"
            >
              Create free account →
            </Link>
            <Link
              to="/login"
              className="px-8 py-3.5 border-2 border-white/40 text-white font-bold rounded-2xl hover:bg-white/10 transition text-sm"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <img src="/logo.png" alt="afavers" className="h-12 w-auto" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} afavers · Job tracker for Germany</p>
          <div className="flex gap-5 text-sm font-medium text-gray-400">
            <Link to="/login" className="hover:text-gray-900 transition">Log in</Link>
            <Link to="/register" className="hover:text-gray-900 transition">Sign up</Link>
          </div>
        </div>
      </footer>

      {/* ── Job preview modal ── */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedJob(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl ${selectedJob.color} flex items-center justify-center text-white font-extrabold text-2xl shrink-0`}>
                {selectedJob.company[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedJob.company}</p>
                <p className="text-gray-500 text-sm">{selectedJob.location}</p>
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 mb-3">{selectedJob.title}</h2>

            {selectedJob.salary && (
              <span className="inline-block px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl mb-6">
                {selectedJob.salary}
              </span>
            )}

            <a
              href={selectedJob.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-2xl transition mb-2"
            >
              Go to job posting ↗
            </a>
            <Link
              to="/register"
              className="block w-full text-center py-3 border-2 border-gray-200 hover:border-green-500 hover:text-green-700 text-gray-600 font-semibold text-sm rounded-2xl transition"
            >
              Sign up to track this application
            </Link>
            <p className="text-center text-xs text-gray-400 mt-3">Free · No credit card</p>
          </div>
        </div>
      )}

    </div>
  );
};
