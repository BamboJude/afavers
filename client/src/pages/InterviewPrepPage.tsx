import { useState } from 'react';
import { useLanguage } from '../store/languageStore';

interface Video {
  id: string;
  title: string;
  channel: string;
  category: 'germany' | 'german';
}

const VIDEOS: Video[] = [
  // Germany — English videos about German work culture & interviews
  { id: 'GlPdGVhGNCE', title: 'How to Prepare for a Job Interview in Germany', channel: 'HalloGermany', category: 'germany' },
  { id: 'dJTztoXp7KM', title: '10 Interview Tips in Germany to Get the Job 🇩🇪', channel: 'YouTube', category: 'germany' },
  { id: 'mNnqFp4Ufa4', title: 'Avoid These 8 Interview Mistakes in Germany 🇩🇪', channel: 'YouTube', category: 'germany' },
  { id: '4C_cfg3Iemg', title: 'Job Interview Questions in Germany', channel: 'YouTube', category: 'germany' },
  { id: 'A006dXZ-5Tg', title: 'How to Negotiate a Salary Offer in Germany', channel: 'HalloGermany', category: 'germany' },
  { id: 'tYFz_Etplnc', title: 'Job Offer in Germany: 5 Things to Negotiate Besides Salary', channel: 'HalloGermany', category: 'germany' },
  // Auf Deutsch — German-language interview prep
  { id: '8OOvvJ0hd3M', title: 'Das Vorstellungsgespräch (Beispiel-Dialog in voller Länge)', channel: 'StepUp! Coaching', category: 'german' },
  { id: '__Uh1kUKKW4', title: 'Das Vorstellungsgespräch für Berufseinsteiger', channel: 'StepUp! Coaching', category: 'german' },
  { id: 'tivaK_Hbx1w', title: 'Vorstellungsgespräch: Schwächen nennen (5 Beispiele)', channel: 'StepUp! Coaching', category: 'german' },
  { id: '3JXC5FPcSLU', title: 'Die Gehaltsverhandlung (Beispiel-Dialog in voller Länge)', channel: 'StepUp! Coaching', category: 'german' },
  { id: 'uarNpr8eQPM', title: 'Die häufigsten Fragen beim Bewerben (+ Antworten)', channel: 'StepUp! Coaching', category: 'german' },
];

const CATEGORIES = [
  { key: 'all',     labelKey: 'allVideos',      emoji: '🎬' },
  { key: 'germany', labelKey: 'germanySpecific', emoji: '🇩🇪' },
  { key: 'german',  labelKey: 'aufDeutsch',      emoji: '🎧' },
];

export const InterviewPrepPage = () => {
  const { t } = useLanguage();
  const [category, setCategory] = useState<string>('all');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  const filtered = category === 'all' ? VIDEOS : VIDEOS.filter(v => v.category === category);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <h1 className="text-2xl font-bold text-gray-900">🎤 {t('interviewPrep')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('interviewPrepSubtitle')}</p>
      </div>

      {/* Category filter pills */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 sticky top-0 z-10">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                category === cat.key
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
              }`}
            >
              {cat.emoji} {t(cat.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Video grid */}
      <main className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(video => (
            <button
              key={video.id}
              onClick={() => setActiveVideo(video)}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-green-300 hover:shadow-md transition text-left"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-200">
                <img
                  src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/45 transition flex items-center justify-center">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Video info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-green-700 transition">
                  {video.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1.5">{video.channel}</p>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Video modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="w-full max-w-3xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="min-w-0 flex-1 mr-4">
                <h3 className="text-white text-sm font-semibold truncate">{activeVideo.title}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{activeVideo.channel}</p>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="text-gray-400 hover:text-white transition shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* YouTube embed */}
            <div className="aspect-video">
              <iframe
                key={activeVideo.id}
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
