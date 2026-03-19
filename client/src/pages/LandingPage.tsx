import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const CARD_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-orange-500',
  'bg-cyan-500', 'bg-green-600', 'bg-pink-500', 'bg-amber-500',
  'bg-teal-500', 'bg-indigo-500',
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
    desc: 'Fresh jobs from Bundesagentur für Arbeit land on your dashboard automatically — no manual searching.',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
  },
  {
    icon: '📋',
    title: 'Kanban board',
    desc: 'Move jobs through Saved → Applied → Interview → Offer. Every application tracked visually.',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: '🔥',
    title: 'Hot Picks swipe',
    desc: 'Triage jobs fast — swipe to save or skip, one at a time. Clear your inbox in minutes.',
    color: 'bg-orange-50',
    iconColor: 'text-orange-500',
  },
  {
    icon: '🎯',
    title: 'Interview prep',
    desc: 'Practice with AI-generated questions tailored to your target role. Walk in confident.',
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: '📊',
    title: 'Analytics',
    desc: 'See your application pipeline at a glance. Track progress, spot trends, stay motivated.',
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    icon: '🔔',
    title: 'Smart reminders',
    desc: 'Set follow-up reminders so you never miss a deadline or forget to check in.',
    color: 'bg-rose-50',
    iconColor: 'text-rose-500',
  },
];

const FAQS = [
  { q: 'Is afavers free?', a: 'Yes, completely free. No credit card required, no hidden fees.' },
  { q: 'Where do the jobs come from?', a: 'We fetch directly from Bundesagentur für Arbeit — Germany\'s official job agency — every 2 hours.' },
  { q: 'Can I filter by location or field?', a: 'Yes. During setup you pick your target cities and job fields. We only show you relevant listings.' },
  { q: 'What is the Kanban board?', a: 'It\'s a visual board to track every application — from Saved through Applied, Interview, and Offer stages.' },
  { q: 'Is there an English version?', a: 'Yes! Toggle "English jobs only" in settings to see only English-language listings.' },
];

export const LandingPage = () => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [selectedJob, setSelectedJob] = useState<PublicJob | null>(null);
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "'Figtree', 'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap');`}</style>

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/logo.png" alt="afavers" className="h-20 w-auto"
            onError={e => {
              const t = e.target as HTMLImageElement; t.style.display = 'none';
              (t.parentElement as HTMLElement).insertAdjacentHTML('afterbegin', '<span style="font-size:1.25rem;font-weight:900;color:#0a1a25">afavers</span>');
            }} />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition font-medium">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition font-medium">How it works</a>
            <a href="#faq" className="text-sm text-gray-500 hover:text-gray-900 transition font-medium">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="px-5 py-2.5 bg-[#16a34a] hover:bg-green-700 text-white text-sm font-semibold rounded-full transition">Dashboard →</Link>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">Log in</Link>
                <Link to="/register" className="px-5 py-2.5 bg-[#16a34a] hover:bg-green-700 text-white text-sm font-bold rounded-full transition shadow-sm">Get started free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-b from-green-50/80 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Jobs refreshed every 2 hours · Germany
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-[#0a1a25] leading-[1.0] tracking-tight mb-6">
            Stop searching.<br />
            <span className="text-[#16a34a]">Start applying.</span>
          </h1>

          <p className="text-gray-500 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            afavers automatically fetches, filters, and tracks green jobs from Germany's official job agency — so you wake up to fresh listings every morning.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12">
            <Link to="/register" className="px-8 py-4 bg-[#16a34a] hover:bg-green-700 text-white font-bold rounded-2xl transition text-base shadow-[0_4px_20px_rgba(22,163,74,0.35)] active:scale-[0.97] flex items-center gap-2">
              Start for free
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link to="/demo" className="px-8 py-4 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition text-base">
              Browse live jobs
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-3 text-sm text-gray-400 mb-16">
            <div className="flex -space-x-2">
              {['#16a34a','#3b82f6','#8b5cf6','#f59e0b','#ef4444'].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-black text-white" style={{ background: c }}>
                  {['M','A','J','T','S'][i]}
                </div>
              ))}
            </div>
            <span>200+ job seekers in Germany</span>
            <span className="hidden sm:inline text-gray-200">·</span>
            <span className="hidden sm:inline text-[#16a34a] font-semibold">Free forever</span>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative max-w-5xl mx-auto px-6 pb-0">
          <div className="rounded-2xl border border-gray-200 shadow-2xl overflow-hidden bg-[#f4f6fa]">
            {/* Browser bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-400 text-center">afavers.online/dashboard</div>
            </div>
            {/* Mock dashboard */}
            <div className="p-5 grid grid-cols-4 gap-3">
              {/* Stat cards */}
              {[
                { label: 'Total Jobs', value: '2,418', color: 'text-[#16a34a]' },
                { label: 'Saved', value: '12', color: 'text-blue-600' },
                { label: 'Applied', value: '7', color: 'text-violet-600' },
                { label: 'Interviews', value: '2', color: 'text-orange-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                </div>
              ))}
              {/* Job list preview */}
              <div className="col-span-3 bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Latest Jobs</p>
                <div className="space-y-2.5">
                  {SAMPLE_JOBS.slice(0, 3).map((j, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${CARD_COLORS[i]} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                        {j.company[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{j.title}</p>
                        <p className="text-xs text-gray-400">{j.company} · {j.location}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded-full border border-green-100">New</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Kanban preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Pipeline</p>
                <div className="space-y-2">
                  {[['Saved','bg-blue-100 text-blue-700','12'],['Applied','bg-violet-100 text-violet-700','7'],['Interview','bg-orange-100 text-orange-700','2']].map(([l,c,n]) => (
                    <div key={l} className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{l}</span>
                      <span className="text-xs font-black text-gray-700">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-6 text-center">
          {[
            { value: '2,400+', label: 'Active jobs tracked', sub: 'Updated every 2 hours' },
            { value: '50+', label: 'Cities covered', sub: 'Across Germany' },
            { value: '< 60s', label: 'Setup time', sub: 'Really, we promise' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-4xl sm:text-5xl font-black text-[#0a1a25] mb-1">{s.value}</div>
              <div className="text-sm font-semibold text-gray-700">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#f4f6fa] border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#16a34a] text-xs font-bold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-4xl sm:text-5xl font-black text-[#0a1a25]">From setup to offer<br />in three steps.</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { num: '01', icon: '🎯', title: 'Set your preferences', desc: 'Choose your field and target cities. Done in under 60 seconds.' },
              { num: '02', icon: '⚡', title: 'Jobs come to you', desc: 'We fetch fresh listings every 2 hours from Bundesagentur für Arbeit, filtered just for you.' },
              { num: '03', icon: '🚀', title: 'Apply & track', desc: 'Save jobs, apply, track progress on your Kanban board. Interview prep included.' },
            ].map((step, i) => (
              <div key={step.num} className="relative bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md hover:border-green-200 transition-all">
                <div className="text-6xl font-black text-gray-100 leading-none mb-4">{step.num}</div>
                <div className="text-3xl mb-4">{step.icon}</div>
                <h3 className="text-gray-900 font-bold text-base mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                {i < 2 && (
                  <div className="hidden sm:flex absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-green-100 border-2 border-white items-center justify-center z-10">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#16a34a] text-xs font-bold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl sm:text-5xl font-black text-[#0a1a25]">Everything to land<br />your dream job.</h2>
            <p className="text-gray-500 text-base mt-4 max-w-xl mx-auto">Built specifically for job seekers in Germany — from first search to signed contract.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center text-2xl mb-5`}>
                  {f.icon}
                </div>
                <h3 className="text-[#0a1a25] font-bold text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Jobs ── */}
      <section id="jobs" className="py-24 bg-[#f4f6fa] border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 mb-8 flex items-end justify-between">
          <div>
            <p className="text-[#16a34a] text-xs font-bold uppercase tracking-widest mb-2">Live right now</p>
            <h2 className="text-3xl font-black text-[#0a1a25]">Jobs available today</h2>
            <p className="text-gray-400 text-sm mt-1">{jobs.length > 0 ? `${jobs.length} listings · refreshed every 2h` : 'Loading…'}</p>
          </div>
          <Link to={isAuthenticated ? '/jobs' : '/demo'} className="text-[#16a34a] text-sm font-semibold hover:text-green-700 transition flex items-center gap-1 shrink-0">
            See all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide snap-x snap-mandatory">
          {jobs.map((job, i) => (
            <button key={job.id ?? i} onClick={() => setSelectedJob(job)}
              className="snap-start shrink-0 bg-white border border-gray-200 hover:border-green-300 hover:shadow-lg rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 flex flex-col text-left group"
              style={{ width: '272px' }}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${job.color} flex items-center justify-center text-white font-black text-base shrink-0`}>
                  {job.company[0].toUpperCase()}
                </div>
                <svg className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="text-gray-900 font-bold text-sm leading-snug mb-1 group-hover:text-[#16a34a] transition line-clamp-2">{job.title}</p>
              <p className="text-gray-400 text-xs mb-4">{job.company} · {job.location}</p>
              <div className="mt-auto">
                {job.salary
                  ? <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">{job.salary}</span>
                  : <span className="inline-block px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-lg border border-green-100">View job →</span>}
              </div>
            </button>
          ))}
          <div className="snap-start shrink-0 w-64 border-2 border-dashed border-gray-200 hover:border-green-300 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-4 transition-colors">
            <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm mb-1">See all jobs</p>
              <p className="text-gray-400 text-xs">Track & apply in one place</p>
            </div>
            <Link to="/register" className="w-full text-center px-4 py-2.5 bg-[#16a34a] hover:bg-green-700 text-white text-sm font-bold rounded-xl transition">
              Sign up free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-[#16a34a] text-xs font-bold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-4xl font-black text-[#0a1a25]">Common questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-semibold text-[#0a1a25] text-sm">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-[#f4f6fa]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black text-[#0a1a25] mb-4 leading-tight">
            Your next job is<br />waiting.
          </h2>
          <p className="text-gray-500 text-lg mb-10">Free forever · No credit card · Set up in 60 seconds.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="px-10 py-4 bg-[#16a34a] hover:bg-green-700 text-white font-bold rounded-2xl transition text-base shadow-[0_4px_20px_rgba(22,163,74,0.3)] active:scale-[0.97]">
              Start for free →
            </Link>
            <Link to="/login" className="px-10 py-4 border border-gray-200 hover:border-gray-300 hover:bg-white text-gray-700 font-semibold rounded-2xl transition text-base">
              Already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
          <img src="/logo.png" alt="afavers" className="h-14 w-auto"
            onError={e => {
              const t = e.target as HTMLImageElement; t.style.display = 'none';
              (t.parentElement as HTMLElement).insertAdjacentHTML('afterbegin', '<span style="font-size:1.1rem;font-weight:900;color:#0a1a25">afavers</span>');
            }} />
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} afavers · Job tracker for Germany</p>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            {!isAuthenticated && <Link to="/login" className="hover:text-gray-900 transition">Log in</Link>}
            {!isAuthenticated && <Link to="/register" className="hover:text-gray-900 transition">Sign up</Link>}
            <Link to="/disclaimer" className="hover:text-gray-900 transition">Privacy</Link>
          </div>
        </div>
      </footer>

      {/* ── Job modal ── */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedJob(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedJob(null)} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 rounded-2xl ${selectedJob.color} flex items-center justify-center text-white font-black text-xl shrink-0`}>
                {selectedJob.company[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedJob.company}</p>
                <p className="text-gray-500 text-sm">{selectedJob.location}</p>
              </div>
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-4 leading-snug">{selectedJob.title}</h2>
            {selectedJob.salary && (
              <span className="inline-block px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl mb-6">{selectedJob.salary}</span>
            )}
            <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-3.5 bg-[#16a34a] hover:bg-green-700 text-white font-bold text-sm rounded-2xl transition mb-3">
              Go to job posting ↗
            </a>
            <Link to="/register" className="block w-full text-center py-3 border border-gray-200 hover:border-green-400 hover:text-green-700 text-gray-600 font-semibold text-sm rounded-2xl transition">
              Sign up to track this application
            </Link>
            <p className="text-center text-xs text-gray-400 mt-3">Free · No credit card required</p>
          </div>
        </div>
      )}
    </div>
  );
};
