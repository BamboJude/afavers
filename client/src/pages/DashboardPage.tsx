import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { jobsService } from '../services/jobs.service';
import type { DashboardStats, FollowUpAlert, Job } from '../types';
import { useLanguage } from '../store/languageStore';
import { useGoalStore, type GoalType } from '../store/goalStore';
import { useCalendarStore, type CalendarEventType } from '../store/calendarStore';
import { useReminderStore } from '../store/reminderStore';
import { scheduleReminder } from '../services/notification.service';
import { usePreferencesStore, jobMatchesFilter } from '../store/preferencesStore';
import { NewsCarousel } from '../components/common/NewsCarousel';

// ── Stress check-up ──────────────────────────────────────────────────────────

const StressFace = ({ level, size = 28 }: { level: 1|2|3|4|5; size?: number }) => {
  type Cfg = { bg: string; stroke: string; mouth: string; brows?: boolean };
  const configs: Record<number, Cfg> = {
    1: { bg: '#fee2e2', stroke: '#ef4444', mouth: 'M9 15.5 Q12 13 15 15.5', brows: true },
    2: { bg: '#ffedd5', stroke: '#f97316', mouth: 'M9.5 14.5 Q12 13 14.5 14.5', brows: false },
    3: { bg: '#f3f4f6', stroke: '#6b7280', mouth: 'M9.5 14 H14.5', brows: false },
    4: { bg: '#dbeafe', stroke: '#3b82f6', mouth: 'M9.5 13.5 Q12 15.5 14.5 13.5', brows: false },
    5: { bg: '#dcfce7', stroke: '#16a34a', mouth: 'M8.5 13 Q12 16.5 15.5 13', brows: false },
  };
  const c = configs[level];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill={c.bg} stroke={c.stroke} strokeWidth="1.5"/>
      <circle cx="9" cy="10" r="1.1" fill={c.stroke}/>
      <circle cx="15" cy="10" r="1.1" fill={c.stroke}/>
      {c.brows && <path d="M7 7.5 L9.5 8.5 M17 7.5 L14.5 8.5" stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round"/>}
      <path d={c.mouth} stroke={c.stroke} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
};

const IconTarget = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="6" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
  </svg>
);

const IconClock = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
    <path d="M12 7v5l3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const STRESS_LEVELS = [
  { level: 1 as const, labelKey: 'stressOverwhelmed', card: 'bg-red-50 border-red-200 text-red-700',    tipKey: 'stressTip1' },
  { level: 2 as const, labelKey: 'stressStruggling',  card: 'bg-orange-50 border-orange-200 text-orange-700', tipKey: 'stressTip2' },
  { level: 3 as const, labelKey: 'stressOkay',        card: 'bg-gray-100 border-gray-200 text-gray-700',  tipKey: 'stressTip3' },
  { level: 4 as const, labelKey: 'stressGood',        card: 'bg-blue-50 border-blue-200 text-blue-700',   tipKey: 'stressTip4' },
  { level: 5 as const, labelKey: 'stressThriving',    card: 'bg-green-50 border-green-200 text-green-700', tipKey: 'stressTip5' },
];

const StressCheckup = () => {
  const { logStress, todayStress } = useGoalStore();
  const { t } = useLanguage();
  const today = todayStress();
  const [dismissed, setDismissed] = useState(false);

  const info = STRESS_LEVELS.find(s => s.level === today?.level);

  if (today && info) {
    return (
      <div className={`mb-5 rounded-xl border px-4 py-2.5 flex items-center gap-3 animate-fade-in ${info.card}`}>
        <StressFace level={info.level} size={24} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">{t(info.labelKey)} today · </span>
          <span className="text-sm opacity-75 line-clamp-1">{t(info.tipKey)}</span>
        </div>
        <button onClick={() => logStress(today.level)} className="text-xs opacity-40 hover:opacity-80 transition shrink-0 ml-1" title="Change">✎</button>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="mb-5 bg-white border border-gray-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-semibold text-gray-700">{t('howAreYouHoldingUp')}</p>
        <button onClick={() => setDismissed(true)} className="text-gray-300 hover:text-gray-500 transition text-sm">✕</button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {STRESS_LEVELS.map(s => (
          <button
            key={s.level}
            onClick={() => logStress(s.level)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:scale-95 transition"
          >
            <StressFace level={s.level} size={32} />
            <span className="text-sm text-gray-500 font-medium">{t(s.labelKey)}</span>
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

  if (!goal && !setting) {
    return (
      <div className="mb-6 bg-white border border-dashed border-gray-300 rounded-xl p-4 flex items-center gap-4 hover:border-gray-400 transition-colors animate-fade-in cursor-pointer group" onClick={() => setSetting(true)}>
        <IconTarget className="w-6 h-6 text-gray-400" />
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-700 group-hover:text-gray-900">{t('setAGoal')}</p>
          <p className="text-sm text-gray-400">{t('stayMotivated')}</p>
        </div>
        <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-700 transition-colors">{t('setArrow')}</span>
      </div>
    );
  }

  if (setting) {
    return (
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 animate-scale-in">
        <p className="text-base font-semibold text-gray-700 mb-3">{t('whatsYourGoal')}</p>
        <div className="flex gap-2 mb-3">
          {(['applications', 'interviews'] as const).map(tp => (
            <button key={tp} onClick={() => { setType(tp); setTarget(GOAL_PRESETS[tp][1]); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition active:scale-95 ${
                type === tp ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tp === 'applications' ? t('applicationsSentGoal') : t('interviewsReachedGoal')}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-4 items-center">
          {GOAL_PRESETS[type].map(n => (
            <button key={n} onClick={() => setTarget(n)}
              className={`px-4 py-2 text-sm font-bold rounded-lg border transition active:scale-95 ${
                target === n ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
          <input type="number" min={1} value={target}
            onChange={e => setTarget(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-2 py-2 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setGoal({ type, target }); setSetting(false); }}
            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition active:scale-95"
          >
            {t('saveGoal')}
          </button>
          <button onClick={() => setSetting(false)}
            className="px-4 py-2 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 transition"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  const barColor  = done ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : 'bg-orange-400';
  const messageKey = done ? 'goalReached' : pct >= 60 ? 'almostThere' : 'everyApplicationCounts';

  return (
    <>
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
          {CONFETTI_PIECES.map((p, i) => (
            <div key={i} style={{
              position: 'absolute', left: p.left, top: '8%',
              width: p.size, height: p.size,
              borderRadius: p.round ? '50%' : '3px',
              backgroundColor: p.color,
              animation: `confetti-fall ${p.duration} ease-in forwards`,
              animationDelay: p.delay,
            }} />
          ))}
        </div>
      )}
      <div className="mb-6 bg-white border border-gray-200 rounded-xl p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <IconTarget className="w-4 h-4" />
            <span className="text-base font-semibold text-gray-700">
              {goal!.type === 'applications' ? t('applicationsGoal') : t('interviewsGoal')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-gray-900 tabular-nums">{current} / {goal!.target}</span>
            <button onClick={() => clearGoal()} className="text-xs text-gray-300 hover:text-gray-500 transition" title={t('clearGoal')}>✕</button>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">{t(messageKey)}</p>
          <button onClick={() => { setSetting(true); setType(goal!.type); setTarget(goal!.target); }}
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
  const { addReminder } = useReminderStore();
  const today = new Date();
  const [viewDate, setViewDate]   = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType]   = useState<CalendarEventType>('interview');
  const [formTime, setFormTime]   = useState('');
  const [formRemind, setFormRemind] = useState(true);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const toKey = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());

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
    setSelectedDay(key === selectedDay ? null : key);
    setShowForm(false);
  };

  const handleAddEvent = () => {
    if (!formTitle.trim() || !selectedDay) return;
    addEvent({ date: selectedDay, title: formTitle.trim(), type: formType, time: formTime || undefined });
    if (formRemind && formTime) {
      const rid = addReminder({
        title: formTitle.trim(),
        date: selectedDay,
        time: formTime,
        type: formType === 'followup' ? 'followup' : formType === 'deadline' ? 'deadline' : formType === 'note' ? 'custom' : 'interview',
      });
      scheduleReminder({ id: rid, title: formTitle.trim(), date: selectedDay, time: formTime, type: formType === 'followup' ? 'followup' : formType === 'deadline' ? 'deadline' : formType === 'note' ? 'custom' : 'interview', completed: false }).catch(() => {});
    }
    setFormTitle('');
    setFormTime('');
    setFormRemind(true);
    setShowForm(false);
  };

  const formatSelectedDay = (key: string) =>
    new Date(key + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-fade-in" style={{ animationDelay: '500ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t('calendar')}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition text-base leading-none"
          >‹</button>
          <span className="text-sm font-semibold text-gray-700 px-2 min-w-[150px] text-center capitalize">{monthLabel}</span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition text-base leading-none"
          >›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

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
            <button key={idx} onClick={() => handleSelectDay(key)}
              className={`relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-all active:scale-95 ${
                isSelected ? 'bg-gray-900 text-white'
                  : isToday ? 'bg-green-50 text-green-700 font-bold ring-2 ring-green-400'
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

      {selectedDay && (
        <div className="mt-3 pt-3 border-t border-gray-100 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700">{formatSelectedDay(selectedDay)}</p>
            <button
              onClick={() => { setShowForm(f => !f); setFormTitle(''); setFormTime(''); }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition active:scale-95"
            >
              + Add event
            </button>
          </div>

          {showForm && (
            <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 animate-fade-in">
              <input type="text" placeholder="Event title..." value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
              />
              <div className="flex gap-2">
                <select value={formType} onChange={e => setFormType(e.target.value as CalendarEventType)}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-700"
                >
                  {(Object.entries(EVENT_TYPE_META) as [CalendarEventType, { label: string }][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-700"
                />
              </div>
              {/* Remind me toggle */}
              {formTime && (
                <button
                  type="button"
                  onClick={() => setFormRemind(v => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition text-xs font-medium ${
                    formRemind ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Remind me at this time
                  </span>
                  <div className={`w-8 h-4 rounded-full transition-colors ${formRemind ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${formRemind ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={handleAddEvent} disabled={!formTitle.trim()}
                  className="flex-1 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-lg transition"
                >
                  Save
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

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
            {selCustom.map(e => (
              <div key={e.id} className="flex items-center gap-2 text-xs group">
                <span className={`w-2 h-2 rounded-full shrink-0 ${EVENT_TYPE_META[e.type].dot}`} />
                <span className="text-gray-700 font-medium truncate flex-1">
                  {e.time && <span className="text-gray-400 mr-1">{e.time}</span>}
                  {e.title}
                </span>
                <span className="text-gray-400 text-[10px] shrink-0">{EVENT_TYPE_META[e.type].label}</span>
                <button onClick={() => removeEvent(e.id)}
                  className="ml-1 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 text-base leading-none shrink-0"
                  title="Delete event"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
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

// ── Application board (IG-style hero) ────────────────────────────────────────

// ── Job Stories (IG-style horizontal scroll) ─────────────────────────────────

const STORY_COLORS = [
  'from-green-400 to-emerald-600',
  'from-blue-400 to-indigo-600',
  'from-orange-400 to-red-500',
  'from-purple-400 to-pink-600',
  'from-teal-400 to-cyan-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-600',
  'from-violet-400 to-purple-600',
];

const JobStories = ({ jobs, onJobClick }: { jobs: Job[]; onJobClick: (id: number) => void }) => {
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set());

  if (jobs.length === 0) return null;

  const handleClick = (id: number) => {
    setSeenIds(prev => new Set([...prev, id]));
    onJobClick(id);
  };

  return (
    <div className="mb-6 animate-fade-in" style={{ animationDelay: '50ms' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">New Jobs</p>
        <span className="text-xs text-gray-400">{jobs.length} unreviewed</span>
      </div>
      <div className="flex gap-3.5 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {jobs.map((job, i) => {
          const seen = seenIds.has(job.id);
          const gradient = STORY_COLORS[i % STORY_COLORS.length];
          const initials = (job.company || '?')
            .split(' ')
            .slice(0, 2)
            .map(w => w[0]?.toUpperCase() || '')
            .join('');

          return (
            <button
              key={job.id}
              onClick={() => handleClick(job.id)}
              className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition group"
            >
              {/* Story ring */}
              <div className={`p-[2.5px] rounded-full ${seen ? 'bg-gray-200' : `bg-gradient-to-br ${gradient}`}`}>
                <div className="w-14 h-14 rounded-full bg-white p-[2px]">
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <span className="text-white font-bold text-sm leading-none">{initials}</span>
                  </div>
                </div>
              </div>
              {/* Label */}
              <span className={`text-[10px] font-medium text-center leading-tight max-w-[64px] line-clamp-2 ${seen ? 'text-gray-400' : 'text-gray-700'}`}>
                {job.company}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Application board ─────────────────────────────────────────────────────────

type BoardStatus = 'saved' | 'applied' | 'interviewing' | 'offered';

const StatusIconSaved = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);
const StatusIconApplied = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const StatusIconInterviewing = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
);
const StatusIconOffered = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const STATUS_CONFIG: Record<BoardStatus, {
  label: string;
  icon: React.ReactNode;
  gradient: string;
  ring: string;
  bg: string;
  text: string;
  cardAccent: string;
  dot: string;
}> = {
  saved:        { label: 'Saved',        icon: <StatusIconSaved />,        gradient: 'from-amber-400 to-yellow-300',    ring: 'ring-amber-400',  bg: 'bg-amber-50',   text: 'text-amber-800',  cardAccent: 'border-l-amber-400',  dot: 'bg-amber-400' },
  applied:      { label: 'Applied',      icon: <StatusIconApplied />,      gradient: 'from-green-500 to-emerald-400',   ring: 'ring-green-500',  bg: 'bg-green-50',   text: 'text-green-800',  cardAccent: 'border-l-green-500',  dot: 'bg-green-500' },
  interviewing: { label: 'Interviewing', icon: <StatusIconInterviewing />, gradient: 'from-purple-500 to-violet-400',   ring: 'ring-purple-500', bg: 'bg-purple-50',  text: 'text-purple-800', cardAccent: 'border-l-purple-500', dot: 'bg-purple-500' },
  offered:      { label: 'Offered',      icon: <StatusIconOffered />,      gradient: 'from-emerald-500 to-teal-400',    ring: 'ring-emerald-500',bg: 'bg-emerald-50', text: 'text-emerald-800',cardAccent: 'border-l-emerald-500',dot: 'bg-emerald-500' },
};

const JobCard = ({ job, status, onClick }: { job: Job; status: BoardStatus; onClick: () => void }) => {
  const cfg = STATUS_CONFIG[status];
  const dateStr = job.applied_date
    ? new Date(job.applied_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    : new Date(job.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 border-l-4 ${cfg.cardAccent} p-3.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] w-48 shrink-0`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 flex-1">{job.title}</p>
      </div>
      <p className="text-sm text-gray-500 font-medium truncate mb-2.5">{job.company}</p>
      {job.location && (
        <p className="text-[10px] text-gray-400 truncate mb-2">{job.location}</p>
      )}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
          {dateStr}
        </span>
        <span className="text-[10px] text-gray-400">→</span>
      </div>
    </div>
  );
};

const ApplicationBoard = ({
  stats,
  boardJobs,
  onStatusClick,
  onJobClick,
}: {
  stats: DashboardStats;
  boardJobs: Record<BoardStatus, Job[]>;
  onStatusClick: (_status: BoardStatus) => void;
  onJobClick: (id: number) => void;
}) => {
  const statuses: BoardStatus[] = ['saved', 'applied', 'interviewing', 'offered'];
  const counts: Record<BoardStatus, number> = {
    saved:        stats.saved || 0,
    applied:      stats.applied || 0,
    interviewing: stats.interviewing || 0,
    offered:      stats.offered || 0,
  };

  const total = statuses.reduce((s, k) => s + counts[k], 0);

  return (
    <div className="mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Applications</h2>
          <p className="text-sm text-gray-400 mt-0.5">{total} total tracked</p>
        </div>
        <button
          onClick={() => onStatusClick('applied')}
          className="text-xs font-semibold text-green-600 hover:text-green-700 transition"
        >
          Full board →
        </button>
      </div>

      {/* IG-style story bubbles */}
      <div className="flex gap-4 mb-5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {statuses.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = counts[status];
          const hasItems = count > 0;

          return (
            <button
              key={status}
              onClick={() => onStatusClick(status)}
              className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition"
            >
              {/* Story ring + circle */}
              <div className={`p-[3px] rounded-full ${hasItems ? `bg-gradient-to-br ${cfg.gradient}` : 'bg-gray-200'}`}>
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center flex-col gap-0.5">
                  <div className={hasItems ? 'text-gray-700' : 'text-gray-400'}>{cfg.icon}</div>
                  {hasItems && (
                    <span className="text-[10px] font-bold text-gray-800 leading-none tabular-nums">{count}</span>
                  )}
                  {!hasItems && (
                    <span className="text-[10px] text-gray-400 leading-none">0</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight max-w-[64px]">
                {cfg.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban lanes — horizontal scroll */}
      {total > 0 && (
        <div className="overflow-x-auto -mx-6 px-6 scrollbar-hide">
          <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
            {statuses.map((status) => {
              const cfg = STATUS_CONFIG[status];
              const jobs = boardJobs[status] || [];
              const count = counts[status];
              if (count === 0) return null;

              return (
                <div key={status} className="flex flex-col gap-2">
                  {/* Lane header */}
                  <div className="flex items-center gap-1.5 px-0.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-semibold text-gray-600">{cfg.label}</span>
                    <span className="text-sm text-gray-400 ml-1 tabular-nums">({count})</span>
                  </div>

                  {/* Job cards */}
                  {jobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      status={status}
                      onClick={() => onJobClick(job.id)}
                    />
                  ))}

                  {/* Show more */}
                  {count > jobs.length && (
                    <button
                      onClick={() => onStatusClick(status)}
                      className="w-48 py-2.5 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition text-center"
                    >
                      +{count - jobs.length} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="text-base font-semibold text-gray-600 mb-1">No applications yet</p>
          <p className="text-sm text-gray-400">Save or apply to jobs to see them here</p>
        </div>
      )}
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const DashboardSkeleton = () => (
  <div className="px-6 py-8 max-w-3xl mx-auto">
    <div className="mb-6">
      <div className="h-6 w-36 bg-gray-200 rounded-full animate-pulse mb-1.5" />
      <div className="h-3.5 w-28 bg-gray-100 rounded-full animate-pulse" />
    </div>
    <div className="mb-6">
      <div className="h-4 w-24 bg-gray-200 rounded-full animate-pulse mb-3" />
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-16 h-16 rounded-full bg-gray-200 animate-pulse shrink-0" />
        ))}
      </div>
    </div>
    <div className="flex gap-3 overflow-hidden mb-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="w-48 h-28 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      ))}
    </div>
    <div className="h-28 bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl animate-pulse" />
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
  const [boardJobs, setBoardJobs] = useState<Record<BoardStatus, Job[]>>({ saved: [], applied: [], interviewing: [], offered: [] });
  const [storyJobs, setStoryJobs] = useState<Job[]>([]);
  const { filterKeywords, filterEnabled, newsOnDashboard } = usePreferencesStore();
  const filteredStoryJobs = storyJobs.filter(j => jobMatchesFilter(j, filterKeywords, filterEnabled));
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');

  useEffect(() => {
    loadStats();
    jobsService.getFollowUps().then(setFollowUps).catch(() => {});
    jobsService.getJobs({ status: 'interviewing', limit: 20 })
      .then(r => {
        const withDate = r.jobs
          .filter(j => j.interview_date)
          .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime());
        setUpcomingInterviews(withDate);
      })
      .catch(() => {});

    // Fetch story jobs (latest new/unreviewed)
    jobsService.getJobs({ status: 'new', limit: 10, sortBy: 'created_at', sortOrder: 'DESC' })
      .then(r => setStoryJobs(r.jobs))
      .catch(() => {});

    // Fetch board jobs for each status
    const statuses: BoardStatus[] = ['saved', 'applied', 'interviewing', 'offered'];
    Promise.all(
      statuses.map(status => jobsService.getJobs({ status, limit: 4 }).then(r => ({ status, jobs: r.jobs })))
    ).then(results => {
      const map = {} as Record<BoardStatus, Job[]>;
      results.forEach(r => { map[r.status] = r.jobs; });
      setBoardJobs(map);
    }).catch(() => {});
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
    <div className="px-6 py-6 max-w-5xl mx-auto w-full">

      {/* Greeting */}
      <div className="mb-5 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {displayName} 👋</h1>
        <p className="text-sm text-gray-400 mt-0.5">{todayFormatted}</p>
      </div>

      {/* News carousel */}
      {newsOnDashboard && <NewsCarousel />}

      {/* Job stories — latest unreviewed */}
      <JobStories jobs={filteredStoryJobs} onJobClick={(id) => navigate(`/jobs/${id}`)} />

      {/* New jobs hero banner */}
      {stats && stats.new > 0 && (
        <div
          onClick={() => navigate('/jobs')}
          className="mb-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl p-5 text-white cursor-pointer hover:from-green-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-green-100 hover:shadow-xl hover:shadow-green-200 hover:-translate-y-0.5 active:scale-[0.99] animate-scale-in"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">{t('unreviewedJobs')}</p>
              <p className="text-4xl font-bold tracking-tight"><AnimatedNumber value={stats.new} /></p>
              {stats.new_today > 0 && (
                <p className="text-green-100 text-sm mt-1.5">+{stats.new_today} {t('addedToday')}</p>
              )}
            </div>
            <div className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-semibold transition border border-white/30">
              {t('reviewNow')} →
            </div>
          </div>
        </div>
      )}

      {/* Follow-up reminders */}
      {followUps.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
          <p className="text-base font-semibold text-amber-800 mb-2.5 flex items-center gap-1.5"><IconClock className="w-4 h-4" /> {t('followUpsDue')} ({followUps.length})</p>
          <div className="space-y-1">
            {followUps.map(f => (
              <div key={f.id} onClick={() => navigate(`/jobs/${f.id}`)}
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
        <div className="mb-5 bg-purple-50 border border-purple-200 rounded-xl p-4 animate-fade-in">
          <p className="text-base font-semibold text-purple-800 mb-2.5 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
            {t('upcomingInterviews')} ({upcomingInterviews.length})
          </p>
          <div className="space-y-1">
            {upcomingInterviews.map(j => (
              <div key={j.id} onClick={() => navigate(`/jobs/${j.id}`)}
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

      {/* Quick actions — 2×2 mobile, 4-col desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {([
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            ),
            iconBg: 'bg-blue-50 text-blue-600',
            label: t('browseJobs'), sub: `${stats?.new || 0} new`, color: 'hover:border-blue-300', onClick: () => navigate('/jobs'),
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            iconBg: 'bg-indigo-50 text-indigo-600',
            label: t('englishJobs'), sub: t('englishJobsDesc'), color: 'hover:border-indigo-300', onClick: () => navigate('/english-jobs'),
          },
          {
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            ),
            iconBg: 'bg-pink-50 text-pink-600',
            label: t('analytics'), sub: t('analyticsDesc'), color: 'hover:border-pink-300', onClick: () => navigate('/analytics'),
          },
          {
            icon: fetching ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ),
            iconBg: 'bg-green-50 text-green-600',
            label: t('fetchJobs'), sub: fetching ? t('fetching') : t('autoFetchNote'), color: 'hover:border-green-300', onClick: isDemo ? undefined : handleFetchJobs, disabled: fetching || isDemo,
          },
        ] as const).map((card, i) => (
          <button
            key={card.label}
            onClick={card.onClick}
            disabled={'disabled' in card && card.disabled}
            className={`bg-white rounded-xl border-2 border-gray-100 ${card.color} p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.97] disabled:opacity-50 animate-fade-in`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.iconBg}`}>
              {card.icon}
            </div>
            <p className="text-sm font-semibold text-gray-800">{card.label}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-1">{card.sub}</p>
          </button>
        ))}
      </div>
      {fetchMsg && (
        <p className={`text-xs mb-4 text-center animate-fade-in ${fetchMsg.includes('failed') || fetchMsg.includes('fehlgeschlagen') ? 'text-red-500' : 'text-green-600'}`}>
          {fetchMsg}
        </p>
      )}

      {/* ★ APPLICATION BOARD ★ */}
      {stats && (
        <ApplicationBoard
          stats={stats}
          boardJobs={boardJobs}
          onStatusClick={() => navigate('/kanban')}
          onJobClick={(id) => navigate(`/jobs/${id}`)}
        />
      )}

      {/* Calendar */}
      <MiniCalendar upcomingInterviews={upcomingInterviews} followUps={followUps} />
    </div>
  );
};

export { StressCheckup };
