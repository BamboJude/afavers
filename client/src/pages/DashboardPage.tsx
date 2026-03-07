import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { jobsService } from '../services/jobs.service';
import type { DashboardStats, FollowUpAlert, Job } from '../types';
import { useLanguage } from '../store/languageStore';
import { useGoalStore, type GoalType } from '../store/goalStore';
import { GermanyJobMap } from '../components/common/GermanyJobMap';
import { useCalendarStore, type CalendarEventType } from '../store/calendarStore';

// ── Stress check-up ──────────────────────────────────────────────────────────

const STRESS_LEVELS = [
  { level: 1 as const, emoji: '😰', labelKey: 'stressOverwhelmed', card: 'bg-red-50 border-red-200 text-red-700',    tipKey: 'stressTip1' },
  { level: 2 as const, emoji: '😟', labelKey: 'stressStruggling',  card: 'bg-orange-50 border-orange-200 text-orange-700', tipKey: 'stressTip2' },
  { level: 3 as const, emoji: '😐', labelKey: 'stressOkay',        card: 'bg-gray-100 border-gray-200 text-gray-700',  tipKey: 'stressTip3' },
  { level: 4 as const, emoji: '🙂', labelKey: 'stressGood',        card: 'bg-blue-50 border-blue-200 text-blue-700',   tipKey: 'stressTip4' },
  { level: 5 as const, emoji: '😊', labelKey: 'stressThriving',    card: 'bg-green-50 border-green-200 text-green-700', tipKey: 'stressTip5' },
];

const StressCheckup = () => {
  const { logStress, todayStress } = useGoalStore();
  const { t } = useLanguage();
  const today = todayStress();
  const [dismissed, setDismissed] = useState(false);

  const info = STRESS_LEVELS.find(s => s.level === today?.level);

  // Checked in today — show compact result badge
  if (today && info) {
    return (
      <div className={`mb-5 rounded-xl border px-4 py-2.5 flex items-center gap-3 animate-fade-in ${info.card}`}>
        <span className="text-xl">{info.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold">{t(info.labelKey)} today · </span>
          <span className="text-xs opacity-75 line-clamp-1">{t(info.tipKey)}</span>
        </div>
        <button
          onClick={() => logStress(today.level)}
          className="text-xs opacity-40 hover:opacity-80 transition shrink-0 ml-1"
          title="Change"
        >
          ✎
        </button>
      </div>
    );
  }

  // Dismissed for now
  if (dismissed) return null;

  return (
    <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">{t('howAreYouHoldingUp')}</p>
        <button onClick={() => setDismissed(true)} className="text-gray-300 hover:text-gray-500 transition text-sm">✕</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {STRESS_LEVELS.map(s => (
          <button
            key={s.level}
            onClick={() => logStress(s.level)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition"
          >
            <span className="text-2xl">{s.emoji}</span>
            <span className="text-xs text-gray-500 font-medium">{t(s.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Goal widget ───────────────────────────────────────────────────────────────

const GOAL_PRESETS: Record<GoalType, number[]> = {
  applications: [5, 10, 20],
  interviews:   [2, 5, 10],
};

const CONFETTI_COLORS = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#F7DC6F','#BB8FCE','#F1948A','#98D8C8'];
const CONFETTI_PIECES = Array.from({ length: 30 }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: `${3 + (i / 30) * 94}%`,
  size: 6 + (i % 3) * 4,
  round: i % 3 !== 0,
  delay: `${(i * 0.07).toFixed(2)}s`,
  duration: `${1.4 + (i % 5) * 0.2}s`,
}));

const GoalWidget = ({ stats }: { stats: DashboardStats }) => {
  const { goal, setGoal, clearGoal } = useGoalStore();
  const { t } = useLanguage();
  const [setting, setSetting] = useState(false);
  const [type, setType]       = useState<GoalType>('applications');
  const [target, setTarget]   = useState(10);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiFired = useRef(false);

  const current = goal?.type === 'applications' ? stats.applied : stats.interviewing;
  const pct     = goal ? Math.min(Math.round((current / goal.target) * 100), 100) : 0;
  const done    = goal ? current >= goal.target : false;

  useEffect(() => {
    if (done && !confettiFired.current) {
      confettiFired.current = true;
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2800);
    }
    if (!done) confettiFired.current = false;
  }, [done]);

  // ── No goal, not setting ──
  if (!goal && !setting) {
    return (
      <div className="mb-6 bg-white border border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 hover:border-gray-400 transition-colors animate-fade-in cursor-pointer group" onClick={() => setSetting(true)}>
        <div className="text-2xl">🎯</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{t('setAGoal')}</p>
          <p className="text-xs text-gray-400">{t('stayMotivated')}</p>
        </div>
        <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-700 transition-colors">{t('setArrow')}</span>
      </div>
    );
  }

  // ── Goal setup form ──
  if (setting) {
    return (
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 animate-scale-in">
        <p className="text-sm font-semibold text-gray-700 mb-3">{t('whatsYourGoal')}</p>
        {/* Type */}
        <div className="flex gap-2 mb-3">
          {(['applications', 'interviews'] as const).map(tp => (
            <button
              key={tp}
              onClick={() => { setType(tp); setTarget(GOAL_PRESETS[tp][1]); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition active:scale-95 ${
                type === tp ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tp === 'applications' ? t('applicationsSentGoal') : t('interviewsReachedGoal')}
            </button>
          ))}
        </div>
        {/* Presets + custom */}
        <div className="flex gap-2 mb-4 items-center">
          {GOAL_PRESETS[type].map(n => (
            <button
              key={n}
              onClick={() => setTarget(n)}
              className={`px-4 py-2 text-sm font-bold rounded-lg border transition active:scale-95 ${
                target === n ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={target}
            onChange={e => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-2 py-2 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setGoal({ type, target }); setSetting(false); }}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition active:scale-95"
          >
            {t('saveGoal')}
          </button>
          <button
            onClick={() => setSetting(false)}
            className="px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  // ── Active goal ──
  const barColor  = done ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-orange-400';
  const messageKey = done ? 'goalReached' : pct >= 60 ? 'almostThere' : 'everyApplicationCounts';

  return (
    <>
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
          {CONFETTI_PIECES.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.left,
                top: '8%',
                width: p.size,
                height: p.size,
                borderRadius: p.round ? '50%' : '3px',
                backgroundColor: p.color,
                animation: `confetti-fall ${p.duration} ease-in forwards`,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}
    <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-semibold text-gray-700">
            {goal!.type === 'applications' ? t('applicationsGoal') : t('interviewsGoal')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900 tabular-nums">{current} / {goal!.target}</span>
          <button
            onClick={() => clearGoal()}
            className="text-xs text-gray-300 hover:text-gray-500 transition"
            title={t('clearGoal')}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{t(messageKey)}</p>
        <button
          onClick={() => { setSetting(true); setType(goal!.type); setTarget(goal!.target); }}
          className="text-xs text-gray-300 hover:text-gray-500 transition ml-3 shrink-0"
        >
          {t('edit')}
        </button>
      </div>
    </div>
    </>
  );
};

// ── Mini calendar ─────────────────────────────────────────────────────────────

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const EVENT_TYPE_META: Record<CalendarEventType, { label: string; dot: string; dotSel: string }> = {
  interview: { label: 'Interview',  dot: 'bg-purple-500', dotSel: 'bg-purple-300' },
  followup:  { label: 'Follow-up',  dot: 'bg-amber-500',  dotSel: 'bg-amber-300'  },
  deadline:  { label: 'Deadline',   dot: 'bg-red-500',    dotSel: 'bg-red-300'    },
  note:      { label: 'Note',       dot: 'bg-blue-400',   dotSel: 'bg-blue-200'   },
};

const MiniCalendar = ({ upcomingInterviews, followUps }: { upcomingInterviews: Job[]; followUps: FollowUpAlert[] }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { events: customEvents, addEvent, removeEvent } = useCalendarStore();
  const today = new Date();
  const [viewDate, setViewDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType]   = useState<CalendarEventType>('interview');
  const [formTime, setFormTime]   = useState('');

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const toKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Build event maps keyed by YYYY-MM-DD
  const interviewMap = new Map<string, Job[]>();
  upcomingInterviews.forEach(j => {
    const k = j.interview_date!.slice(0, 10);
    interviewMap.set(k, [...(interviewMap.get(k) || []), j]);
  });
  const followUpMap = new Map<string, FollowUpAlert[]>();
  followUps.forEach(f => {
    const k = f.follow_up_date.slice(0, 10);
    followUpMap.set(k, [...(followUpMap.get(k) || []), f]);
  });
  const customMap = new Map<string, typeof customEvents>();
  customEvents.forEach(e => {
    customMap.set(e.date, [...(customMap.get(e.date) || []), e]);
  });

  // Build day grid (Mon-first)
  const firstDow  = new Date(year, month, 1).getDay();
  const blanks    = firstDow === 0 ? 6 : firstDow - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(blanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const selInterviews = selectedDay ? (interviewMap.get(selectedDay) || []) : [];
  const selFollowUps  = selectedDay ? (followUpMap.get(selectedDay) || []) : [];
  const selCustom     = selectedDay ? (customMap.get(selectedDay) || []) : [];

  const handleSelectDay = (key: string) => {
    if (key === selectedDay) {
      setSelectedDay(null);
      setShowForm(false);
    } else {
      setSelectedDay(key);
      setShowForm(false);
    }
  };

  const handleAddEvent = () => {
    if (!formTitle.trim() || !selectedDay) return;
    addEvent({ date: selectedDay, title: formTitle.trim(), type: formType, time: formTime || undefined });
    setFormTitle('');
    setFormTime('');
    setShowForm(false);
  };

  const formatSelectedDay = (key: string) =>
    new Date(key + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-fade-in" style={{ animationDelay: '500ms' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('calendar')}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition text-base leading-none"
          >‹</button>
          <span className="text-sm font-semibold text-gray-700 px-2 min-w-[150px] text-center capitalize">{monthLabel}</span>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition text-base leading-none"
          >›</button>
        </div>
      </div>

      {/* Weekday row */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} />;
          const key          = toKey(year, month, day);
          const isToday      = key === todayKey;
          const isSelected   = key === selectedDay;
          const hasInterview = interviewMap.has(key);
          const hasFollowUp  = followUpMap.has(key);
          const hasCustom    = customMap.has(key);

          return (
            <button
              key={idx}
              onClick={() => handleSelectDay(key)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-all active:scale-95 ${
                isSelected
                  ? 'bg-gray-900 text-white'
                  : isToday
                  ? 'bg-green-50 text-green-700 font-bold ring-2 ring-green-400'
                  : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="text-xs font-medium leading-none mb-0.5">{day}</span>
              {(hasInterview || hasFollowUp || hasCustom) && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center max-w-[24px]">
                  {hasInterview && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-purple-300' : 'bg-purple-500'}`} />}
                  {hasFollowUp  && <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-amber-300'  : 'bg-amber-500'}`} />}
                  {hasCustom && customMap.get(key)!.slice(0, 2).map(e => (
                    <span key={e.id} className={`w-1 h-1 rounded-full ${isSelected ? EVENT_TYPE_META[e.type].dotSel : EVENT_TYPE_META[e.type].dot}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
          <span className="text-xs text-gray-400">{t('calendarInterview')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span className="text-xs text-gray-400">{t('calendarFollowUp')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
          <span className="text-xs text-gray-400">Custom</span>
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in">
          {/* Day header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">{formatSelectedDay(selectedDay)}</p>
            <button
              onClick={() => { setShowForm(f => !f); setFormTitle(''); setFormTime(''); }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition active:scale-95"
            >
              + Add event
            </button>
          </div>

          {/* Add event form */}
          {showForm && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 animate-fade-in">
              <input
                type="text"
                placeholder="Event title..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              />
              <div className="flex gap-2">
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as CalendarEventType)}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-700"
                >
                  {(Object.entries(EVENT_TYPE_META) as [CalendarEventType, { label: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-700"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddEvent}
                  disabled={!formTitle.trim()}
                  className="flex-1 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg transition"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Job-derived events */}
          <div className="space-y-1.5">
            {selInterviews.map(j => (
              <div key={j.id} onClick={() => navigate(`/jobs/${j.id}`)} className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-70 transition group">
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <span className="text-gray-700 font-medium truncate flex-1">{j.title} · {j.company}</span>
                <span className="text-gray-400 text-[10px] shrink-0">Interview</span>
              </div>
            ))}
            {selFollowUps.map(f => (
              <div key={f.id} onClick={() => navigate(`/jobs/${f.id}`)} className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-70 transition">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-gray-700 font-medium truncate flex-1">{f.title} · {f.company}</span>
                <span className="text-gray-400 text-[10px] shrink-0">Follow-up</span>
              </div>
            ))}
            {/* Custom events */}
            {selCustom.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs group">
                <span className={`w-2 h-2 rounded-full shrink-0 ${EVENT_TYPE_META[e.type].dot}`} />
                <span className="text-gray-700 font-medium truncate flex-1">
                  {e.time && <span className="text-gray-400 mr-1">{e.time}</span>}
                  {e.title}
                </span>
                <span className="text-gray-400 text-[10px] shrink-0">{EVENT_TYPE_META[e.type].label}</span>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="ml-1 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 text-base leading-none shrink-0"
                  title="Delete event"
                >×</button>
              </div>
            ))}
            {selInterviews.length === 0 && selFollowUps.length === 0 && selCustom.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-1">{t('noEventsDay')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Animated number counter ───────────────────────────────────────────────────

// Counts up from 0 to target with an ease-out curve
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) { setDisplay(0); return; }
    let frame = 0;
    const frames = 40;
    const id = setInterval(() => {
      frame++;
      const p = 1 - Math.pow(1 - frame / frames, 3);
      setDisplay(Math.round(p * value));
      if (frame >= frames) { setDisplay(value); clearInterval(id); }
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <>{display.toLocaleString()}</>;
};

const DashboardSkeleton = () => (
  <div className="px-6 py-8 max-w-6xl mx-auto">
    <div className="mb-8">
      <div className="h-7 w-32 bg-gray-200 rounded-full animate-pulse mb-2" />
      <div className="h-4 w-48 bg-gray-100 rounded-full animate-pulse" />
    </div>
    <div className="h-28 bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl animate-pulse mb-6" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
          <div className="h-3 bg-gray-200 rounded-full w-1/2 mb-3" />
          <div className="h-8 bg-gray-200 rounded-full w-1/3" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl border-2 border-gray-100 bg-white p-5 animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
          <div className="h-3 bg-gray-200 rounded-full w-3/4 mb-2" />
          <div className="h-2.5 bg-gray-100 rounded-full w-full" />
        </div>
      ))}
    </div>
  </div>
);

function useGreeting(email: string | undefined) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const raw = email?.split('@')[0] ?? '';
  const displayName = raw.charAt(0).toUpperCase() + raw.slice(1);
  const todayFormatted = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return { greeting, displayName, todayFormatted };
}

export const DashboardPage = () => {
  const { isDemo, user } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { greeting, displayName, todayFormatted } = useGreeting(user?.email);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpAlert[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Job[]>([]);
  const [locationData, setLocationData] = useState<{ location: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');

  useEffect(() => {
    loadStats();
    jobsService.getFollowUps().then(setFollowUps).catch(() => {});
    jobsService.getAnalytics().then(d => setLocationData(d.byLocation ?? [])).catch(() => {});
    jobsService.getJobs({ status: 'interviewing', limit: 20 })
      .then(r => {
        const withDate = r.jobs
          .filter(j => j.interview_date)
          .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime());
        setUpcomingInterviews(withDate);
      })
      .catch(() => {});
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await jobsService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchJobs = async () => {
    setFetching(true);
    setFetchMsg('');
    try {
      const result = await jobsService.fetchJobs();
      setFetchMsg(`${result.inserted ?? 0} ${t('fetchComplete')}`);
      loadStats();
    } catch {
      setFetchMsg(t('fetchFailed'));
    } finally {
      setFetching(false);
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Page title */}
      <div className="mb-5 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {displayName} 👋</h1>
        <p className="text-sm text-gray-500 mt-1">{todayFormatted}</p>
      </div>

      {/* Daily stress check-up */}
      <StressCheckup />

      {/* New jobs hero banner */}
      {stats && stats.new > 0 && (
        <div
          onClick={() => navigate('/jobs')}
          className="mb-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl p-6 text-white cursor-pointer hover:from-green-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-green-100 hover:shadow-xl hover:shadow-green-200 hover:-translate-y-0.5 active:scale-[0.99] animate-scale-in"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">{t('unreviewedJobs')}</p>
              <p className="text-5xl font-bold tracking-tight"><AnimatedNumber value={stats.new} /></p>
              {stats.new_today > 0 && (
                <p className="text-green-100 text-sm mt-2">+{stats.new_today} {t('addedToday')}</p>
              )}
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-semibold transition border border-white/30">
                {t('reviewNow')} →
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up reminders */}
      {followUps.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in" style={{ animationDelay: '60ms' }}>
          <p className="text-sm font-semibold text-amber-800 mb-2.5">⏰ {t('followUpsDue')} ({followUps.length})</p>
          <div className="space-y-1">
            {followUps.map(f => (
              <div
                key={f.id}
                onClick={() => navigate(`/jobs/${f.id}`)}
                className="flex justify-between items-center text-sm cursor-pointer hover:bg-amber-100 rounded-lg px-3 py-1.5 transition active:scale-[0.99]"
              >
                <span className="text-amber-900 font-medium truncate">{f.title} · {f.company}</span>
                <span className="text-amber-600 shrink-0 ml-3">{new Date(f.follow_up_date).toLocaleDateString('de-DE')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming interviews */}
      {upcomingInterviews.length > 0 && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
          <p className="text-sm font-semibold text-purple-800 mb-2.5">📞 {t('upcomingInterviews')} ({upcomingInterviews.length})</p>
          <div className="space-y-1">
            {upcomingInterviews.map(j => (
              <div
                key={j.id}
                onClick={() => navigate(`/jobs/${j.id}`)}
                className="flex justify-between items-center text-sm cursor-pointer hover:bg-purple-100 rounded-lg px-3 py-1.5 transition active:scale-[0.99]"
              >
                <span className="text-purple-900 font-medium truncate">{j.title} · {j.company}</span>
                <span className="text-purple-600 shrink-0 ml-3">{new Date(j.interview_date!).toLocaleDateString('de-DE')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal widget */}
      {stats && <GoalWidget stats={stats} />}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: t('totalJobs'),
            value: stats?.total || 0,
            icon: '📋',
            bg: 'bg-white',
            border: 'border-gray-200',
            valueColor: 'text-gray-900',
            labelColor: 'text-gray-500',
          },
          {
            label: t('saved'),
            value: stats?.saved || 0,
            icon: '⭐',
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            valueColor: 'text-yellow-900',
            labelColor: 'text-yellow-700',
            onClick: () => navigate('/jobs?tab=saved'),
          },
          {
            label: t('applied'),
            value: stats?.applied || 0,
            icon: '✅',
            bg: 'bg-green-50',
            border: 'border-green-200',
            valueColor: 'text-green-900',
            labelColor: 'text-green-700',
            sub: stats?.applied_today ? `+${stats.applied_today} today` : undefined,
            onClick: () => navigate('/kanban'),
          },
          {
            label: t('interviewing'),
            value: stats?.interviewing || 0,
            icon: '📞',
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            valueColor: 'text-purple-900',
            labelColor: 'text-purple-700',
            onClick: () => navigate('/kanban'),
          },
        ].map((stat, i) => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className={`rounded-xl border ${stat.bg} ${stat.border} p-5 animate-fade-in ${
              stat.onClick
                ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98]'
                : ''
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${stat.labelColor}`}>{stat.label}</p>
                <p className={`text-3xl font-bold mt-1.5 tabular-nums ${stat.valueColor}`}>
                  <AnimatedNumber value={stat.value} />
                </p>
                {'sub' in stat && stat.sub && (
                  <p className="text-xs text-green-600 font-medium mt-1">{stat.sub}</p>
                )}
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* At a glance strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          {[
            {
              label: 'Total tracked',
              value: stats.total,
              color: 'text-gray-800',
              bg: 'bg-white',
            },
            {
              label: 'Added today',
              value: stats.new_today,
              prefix: stats.new_today > 0 ? '+' : '',
              color: stats.new_today > 0 ? 'text-blue-600' : 'text-gray-400',
              bg: 'bg-white',
            },
            {
              label: 'Applied today',
              value: stats.applied_today,
              prefix: stats.applied_today > 0 ? '+' : '',
              color: stats.applied_today > 0 ? 'text-green-600' : 'text-gray-400',
              bg: 'bg-white',
            },
            {
              label: 'Response rate',
              value: stats.applied > 0 ? Math.round(((stats.interviewing + (stats.offered || 0)) / stats.applied) * 100) : 0,
              suffix: '%',
              color: 'text-purple-600',
              bg: 'bg-white',
            },
          ].map(item => (
            <div key={item.label} className={`${item.bg} rounded-xl border border-gray-100 px-4 py-3`}>
              <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
              <p className={`text-xl font-bold tabular-nums ${item.color}`}>
                {item.prefix ?? ''}{item.value}{item.suffix ?? ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Germany job map (compact) */}
      {locationData.length > 0 && (
        <div className="mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden animate-fade-in" style={{ animationDelay: '350ms' }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Jobs by Region</h3>
            <button onClick={() => navigate('/analytics')} className="text-xs text-green-600 hover:text-green-800 font-medium transition">
              View all →
            </button>
          </div>
          <div className="flex flex-col sm:flex-row">
            {/* Map */}
            <div className="flex-1 min-w-0">
              <GermanyJobMap
                byLocation={locationData}
                compact
                onCityClick={loc => navigate(`/jobs?search=${encodeURIComponent(loc.split(/[,/(]/)[0].trim())}`)}
              />
            </div>
            {/* City list */}
            <div className="sm:w-44 shrink-0 px-4 py-3 sm:py-4 border-t sm:border-t-0 sm:border-l border-gray-100 space-y-2.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top cities</p>
              {locationData.slice(0, 6).map((loc, i) => {
                const max = locationData[0]?.count || 1;
                return (
                  <div key={loc.location}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-600 font-medium truncate max-w-[90px]">
                        {i + 1}. {loc.location.split(/[,/(]/)[0].trim()}
                      </span>
                      <span className="text-xs font-bold text-green-700 ml-1">{loc.count}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${Math.round((loc.count / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick-action grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {[
          {
            icon: '🔍',
            label: t('browseJobs'),
            desc: `${stats?.new || 0} ${t('browseJobsDesc')}`,
            color: 'hover:border-blue-300 hover:bg-blue-50/40',
            iconBg: 'bg-blue-50',
            onClick: () => navigate('/jobs'),
          },
          {
            icon: '🇬🇧',
            label: t('englishJobs'),
            desc: t('englishJobsDesc'),
            color: 'hover:border-indigo-300 hover:bg-indigo-50/40',
            iconBg: 'bg-indigo-50',
            onClick: () => navigate('/english-jobs'),
          },
          {
            icon: '🗂️',
            label: t('applicationsBoard'),
            desc: `${(stats?.saved || 0) + (stats?.applied || 0) + (stats?.interviewing || 0)} ${t('applicationsBoardDesc')}`,
            color: 'hover:border-purple-300 hover:bg-purple-50/40',
            iconBg: 'bg-purple-50',
            onClick: () => navigate('/kanban'),
          },
          {
            icon: '📊',
            label: t('analytics'),
            desc: t('analyticsDesc'),
            color: 'hover:border-pink-300 hover:bg-pink-50/40',
            iconBg: 'bg-pink-50',
            onClick: () => navigate('/analytics'),
          },
        ].map((card, i) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className={`bg-white rounded-xl border-2 border-gray-200 ${card.color} p-5 text-left transition-all duration-200 group hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] animate-fade-in`}
            style={{ animationDelay: `${(i + 4) * 50}ms` }}
          >
            <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center text-xl mb-3`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 mb-0.5 transition-colors">{card.label}</h3>
            <p className="text-xs text-gray-400 leading-snug">{card.desc}</p>
          </button>
        ))}

        {/* Fetch jobs card */}
        <div
          className="bg-white rounded-xl border-2 border-gray-200 p-5 animate-fade-in"
          style={{ animationDelay: '400ms' }}
        >
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-xl mb-3">🔄</div>
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{t('fetchJobs')}</h3>
          <p className="text-xs text-gray-400 leading-snug mb-3">{t('autoFetchNote')}</p>
          <button
            onClick={handleFetchJobs}
            disabled={fetching || isDemo}
            title={isDemo ? t('notAvailableDemo') : undefined}
            className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition active:scale-95"
          >
            {fetching ? t('fetching') : t('fetchNow')}
          </button>
          {fetchMsg && (
            <p className={`text-xs mt-1.5 text-center animate-fade-in ${fetchMsg.includes('failed') || fetchMsg.includes('fehlgeschlagen') ? 'text-red-500' : 'text-green-600'}`}>
              {fetchMsg}
            </p>
          )}
        </div>
      </div>

      {/* Pipeline — visual funnel */}
      {stats && ((stats.applied || 0) + (stats.interviewing || 0) + (stats.offered || 0) + (stats.rejected || 0)) > 0 && (() => {
        const stages = [
          { label: t('saved'),        value: stats.saved || 0,        bar: 'bg-yellow-400', text: 'text-yellow-700' },
          { label: t('applied'),      value: stats.applied || 0,      bar: 'bg-green-500',  text: 'text-green-700' },
          { label: t('interviewing'), value: stats.interviewing || 0, bar: 'bg-purple-500', text: 'text-purple-700' },
          { label: t('offered'),      value: stats.offered || 0,      bar: 'bg-emerald-500',text: 'text-emerald-700' },
          { label: t('rejected'),     value: stats.rejected || 0,     bar: 'bg-red-400',    text: 'text-red-600' },
        ];
        const maxVal = Math.max(...stages.map(s => s.value), 1);
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-5 animate-fade-in" style={{ animationDelay: '450ms' }}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{t('applicationPipeline')}</h3>
            <div className="space-y-3">
              {stages.map((s, i) => {
                const prev = i > 0 ? stages[i - 1].value : null;
                const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{s.label}</span>
                      <div className="flex items-center gap-3">
                        {conv !== null && (
                          <span className="text-xs text-gray-400">{conv}% of prev</span>
                        )}
                        <span className={`text-xs font-bold tabular-nums ${s.text}`}>{s.value}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.bar} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.round((s.value / maxVal) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Calendar */}
      <div className="mt-6">
        <MiniCalendar upcomingInterviews={upcomingInterviews} followUps={followUps} />
      </div>
    </div>
  );
};
