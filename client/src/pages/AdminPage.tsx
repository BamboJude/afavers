import { useEffect, useState } from 'react';
import { api } from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface PlatformStats {
  totalUsers: number;
  adminCount: number;
  totalJobs: number;
  statusBreakdown: { status: string; count: number }[];
  recentUsers: { id: number; email: string; created_at: string }[];
  dailySignups: { day: string; count: number }[];
}

interface AdminUser {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  jobCount: number;
  appliedCount: number;
}

interface JobStats {
  totalJobs: number;
  bySource: { source: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recentFetches: { day: string; count: number }[];
}

interface InboxEmail {
  uid: number;
  from: string;
  fromName: string;
  subject: string;
  date: string;
  body: string;
  seen: boolean;
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

type Tab = 'overview' | 'users' | 'jobs' | 'messages' | 'inbox';

// ── Helpers ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  new:          'bg-gray-100 text-gray-600',
  saved:        'bg-blue-100 text-blue-700',
  preparing:    'bg-cyan-100 text-cyan-700',
  applied:      'bg-indigo-100 text-indigo-700',
  followup:     'bg-orange-100 text-orange-700',
  interviewing: 'bg-yellow-100 text-yellow-700',
  offered:      'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
  archived:     'bg-gray-100 text-gray-700',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export const AdminPage = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [actionMsg, setActionMsg] = useState('');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replying, setReplying] = useState<number | null>(null);
  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [inboxError, setInboxError] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<number | null>(null);
  const [inboxReply, setInboxReply] = useState<Record<number, string>>({});
  const [sendingReply, setSendingReply] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);

  // ── Load data by tab ──────────────────────────────────────────────────
  useEffect(() => {
    if (tab === 'overview') loadStats();
    if (tab === 'users')    loadUsers(userPage, userSearch);
    if (tab === 'jobs')     loadJobStats();
    if (tab === 'messages') loadMessages();
    if (tab === 'inbox')    loadInbox();
  }, [tab]);

  const loadStats = async () => {
    setLoading(true); setError('');
    try { setStats((await api.get<PlatformStats>('/admin/stats')).data); }
    catch { setError('Failed to load stats'); }
    finally { setLoading(false); }
  };

  const loadUsers = async (page = 1, search = '') => {
    setLoading(true); setError('');
    try {
      const res = await api.get<{ users: AdminUser[]; total: number; page: number; totalPages: number }>(
        `/admin/users?page=${page}&search=${encodeURIComponent(search)}`
      );
      setUsers(res.data.users);
      setUserTotal(res.data.total);
      setUserTotalPages(res.data.totalPages);
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  };

  const loadJobStats = async () => {
    setLoading(true); setError('');
    try { setJobStats((await api.get<JobStats>('/admin/jobs/stats')).data); }
    catch { setError('Failed to load job stats'); }
    finally { setLoading(false); }
  };

  const loadInbox = async () => {
    setLoading(true); setInboxError('');
    try {
      const res = await api.get<{ emails: InboxEmail[] }>('/admin/inbox');
      setInbox(res.data.emails);
    } catch (e: any) {
      setInboxError(e?.response?.data?.error || 'Failed to load inbox');
    } finally { setLoading(false); }
  };

  const handleInboxReply = async (email: InboxEmail) => {
    const body = inboxReply[email.uid]?.trim();
    if (!body) return;
    setSendingReply(email.uid);
    try {
      await api.post('/admin/inbox/send', {
        to: `${email.fromName} <${email.from}>`,
        subject: `Re: ${email.subject}`,
        body,
      });
      await api.patch(`/admin/inbox/${email.uid}/seen`, {});
      setInbox(prev => prev.map(e => e.uid === email.uid ? { ...e, seen: true } : e));
      setInboxReply(prev => ({ ...prev, [email.uid]: '' }));
      flash('Reply sent ✓');
    } catch (e: any) { flash(e?.response?.data?.error || 'Failed to send', true); }
    finally { setSendingReply(null); }
  };

  const handleDeleteInbox = async (uid: number) => {
    try {
      await api.delete(`/admin/inbox/${uid}`);
      setInbox(prev => prev.filter(e => e.uid !== uid));
    } catch { flash('Delete failed', true); }
  };

  const handleComposeSend = async () => {
    if (!compose.to || !compose.subject || !compose.body) return;
    setSending(true);
    try {
      await api.post('/admin/inbox/send', compose);
      setCompose({ to: '', subject: '', body: '' });
      setComposing(false);
      flash('Email sent ✓');
    } catch (e: any) { flash(e?.response?.data?.error || 'Send failed', true); }
    finally { setSending(false); }
  };

  const loadMessages = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get<{ messages: ContactMessage[]; unreadCount: number }>('/admin/messages');
      setMessages(res.data.messages);
      setUnreadCount(res.data.unreadCount);
    } catch { setError('Failed to load messages'); }
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/admin/messages/${id}/read`, {});
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch { flash('Failed to mark as read', true); }
  };

  const handleReply = async (id: number) => {
    const body = replyText[id]?.trim();
    if (!body) return;
    setReplying(id);
    try {
      await api.post(`/admin/messages/${id}/reply`, { body });
      setReplyText(prev => ({ ...prev, [id]: '' }));
      setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
      setUnreadCount(c => Math.max(0, c - 1));
      flash('Reply sent ✓');
    } catch (e: any) { flash(e?.response?.data?.error || 'Failed to send reply', true); }
    finally { setReplying(null); }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      await api.delete(`/admin/messages/${id}`);
      const msg = messages.find(m => m.id === id);
      if (msg && !msg.is_read) setUnreadCount(c => Math.max(0, c - 1));
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch { flash('Failed to delete', true); }
  };

  const handleToggleAdmin = async (user: AdminUser) => {
    try {
      await api.patch(`/admin/users/${user.id}/toggle-admin`, {});
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u));
      flash(user.isAdmin ? `${user.email} demoted` : `${user.email} promoted to admin`);
    } catch { flash('Action failed', true); }
  };

  const handleDelete = async (user: AdminUser) => {
    try {
      await api.delete(`/admin/users/${user.id}`);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setUserTotal(t => t - 1);
      flash(`${user.email} deleted`);
    } catch { flash('Delete failed', true); }
    finally { setConfirmDelete(null); }
  };

  const flash = (msg: string, isErr = false) => {
    setActionMsg(isErr ? `❌ ${msg}` : `✓ ${msg}`);
    setTimeout(() => setActionMsg(''), 3000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserPage(1);
    loadUsers(1, userSearch);
  };

  const inboxUnread = inbox.filter(e => !e.seen).length;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'users',     label: `Users${userTotal ? ` (${userTotal})` : ''}` },
    { key: 'jobs',      label: 'Jobs' },
    { key: 'messages',  label: `Forms${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { key: 'inbox',     label: `Inbox${inboxUnread > 0 ? ` (${inboxUnread})` : ''}` },
  ];

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-sm text-gray-400">Platform management · afavers.online</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toast */}
      {actionMsg && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium w-fit">{actionMsg}</div>
      )}

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        loading ? <SkeletonCards /> : stats && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats.totalUsers} sub={`${stats.adminCount} admin${stats.adminCount !== 1 ? 's' : ''}`} />
              <StatCard label="Total Jobs" value={stats.totalJobs.toLocaleString()} sub="in database" />
              <StatCard label="Avg Jobs/User" value={stats.totalUsers ? Math.round(stats.totalJobs / stats.totalUsers) : 0} />
              <StatCard
                label="Signups (30d)"
                value={stats.dailySignups.reduce((s, d) => s + d.count, 0)}
                sub="last 30 days"
              />
            </div>

            {/* Status breakdown */}
            {stats.statusBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Job Status Breakdown</h2>
                <div className="space-y-2">
                  {stats.statusBreakdown.map(s => {
                    const max = Math.max(...stats.statusBreakdown.map(x => x.count));
                    return (
                      <div key={s.status} className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-24 text-center ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                          {s.status}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${(s.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-500 w-10 text-right">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent signups */}
            {stats.recentUsers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Signups</h2>
                <div className="space-y-2">
                  {stats.recentUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-700">{u.email}</span>
                      <span className="text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 30-day signup sparkline */}
            {stats.dailySignups.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Signups — Last 30 Days</h2>
                <div className="flex items-end gap-1 h-16">
                  {stats.dailySignups.map(d => {
                    const max = Math.max(...stats.dailySignups.map(x => x.count), 1);
                    return (
                      <div
                        key={d.day}
                        title={`${d.day}: ${d.count}`}
                        className="flex-1 bg-green-400 rounded-sm opacity-80 hover:opacity-100 transition-all"
                        style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '1px' }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div className="space-y-4">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by email…"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            />
            <button type="submit" className="px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition">
              Search
            </button>
          </form>

          {loading ? <SkeletonTable /> : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Joined</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Jobs</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.jobCount} <span className="text-gray-300">/ {u.appliedCount} applied</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isAdmin
                          ? <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Admin</span>
                          : <span className="text-xs text-gray-400">User</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleToggleAdmin(u)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition"
                          >
                            {u.isAdmin ? 'Demote' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">No users found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {userTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{userTotal} users total</p>
              <div className="flex gap-1">
                {Array.from({ length: userTotalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => { setUserPage(p); loadUsers(p, userSearch); }}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition ${
                      p === userPage ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── JOBS TAB ── */}
      {tab === 'jobs' && (
        loading ? <SkeletonCards /> : jobStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Total Jobs" value={jobStats.totalJobs.toLocaleString()} sub="in database" />
              <StatCard label="Sources" value={jobStats.bySource.length} />
              <StatCard label="Status Types" value={jobStats.byStatus.length} />
            </div>

            {/* By status */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">User Actions by Status</h2>
              <div className="space-y-2">
                {jobStats.byStatus.map(s => {
                  const max = Math.max(...jobStats.byStatus.map(x => x.count), 1);
                  return (
                    <div key={s.status} className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-24 text-center ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>
                        {s.status}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(s.count / max) * 100}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500 w-10 text-right">{s.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By source */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Jobs by Source</h2>
              <div className="space-y-1.5">
                {jobStats.bySource.map(s => (
                  <div key={s.source} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{s.source || 'unknown'}</span>
                    <span className="font-semibold text-gray-900">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent fetches bar chart */}
            {jobStats.recentFetches.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Jobs Added — Last 14 Days</h2>
                <div className="flex items-end gap-1 h-16">
                  {[...jobStats.recentFetches].reverse().map(d => {
                    const max = Math.max(...jobStats.recentFetches.map(x => x.count), 1);
                    return (
                      <div
                        key={d.day}
                        title={`${d.day}: ${d.count}`}
                        className="flex-1 bg-green-400 rounded-sm opacity-80 hover:opacity-100 transition-all"
                        style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '1px' }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Messages tab ── */}
      {tab === 'messages' && (
        loading ? <SkeletonTable /> : (
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-12">No messages yet.</p>
            )}
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`bg-white rounded-2xl border p-4 ${msg.is_read ? 'border-gray-200' : 'border-green-400 bg-green-50/30'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {!msg.is_read && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">New</span>}
                      <span className="text-sm font-semibold text-gray-900 truncate">{msg.subject}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {msg.name} · <a href={`mailto:${msg.email}`} className="text-green-600 hover:underline">{msg.email}</a>
                      {' · '}{new Date(msg.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!msg.is_read && (
                      <button onClick={() => handleMarkRead(msg.id)} className="text-xs text-gray-500 hover:text-green-600 transition">Mark read</button>
                    )}
                    <button onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)} className="text-xs text-gray-500 hover:text-gray-900 transition">
                      {expandedMsg === msg.id ? 'Hide' : 'View'}
                    </button>
                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-xs text-red-400 hover:text-red-600 transition">Delete</button>
                  </div>
                </div>
                {expandedMsg === msg.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Reply to {msg.name} · <span className="text-green-600">{msg.email}</span>
                      </p>
                      <textarea
                        rows={4}
                        value={replyText[msg.id] || ''}
                        onChange={e => setReplyText(prev => ({ ...prev, [msg.id]: e.target.value }))}
                        placeholder="Write your reply…"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReply(msg.id)}
                          disabled={replying === msg.id || !replyText[msg.id]?.trim()}
                          className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                        >
                          {replying === msg.id ? 'Sending…' : 'Send Reply'}
                        </button>
                        <span className="text-xs text-gray-400">Sends from contact@afavers.online</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── INBOX TAB ── */}
      {tab === 'inbox' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{inbox.length} emails · contact@afavers.online</p>
            <div className="flex gap-2">
              <button onClick={loadInbox} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Refresh</button>
              <button onClick={() => setComposing(true)} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition">+ Compose</button>
            </div>
          </div>

          {inboxError && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{inboxError} — make sure SMTP_HOST, SMTP_USER, SMTP_PASS are set in your backend environment.</p>}

          {loading ? <SkeletonTable /> : inbox.length === 0 && !inboxError ? (
            <p className="text-sm text-gray-400 text-center py-12">Inbox is empty.</p>
          ) : inbox.map(email => (
            <div key={email.uid} className={`bg-white rounded-2xl border p-4 ${email.seen ? 'border-gray-200' : 'border-green-400 bg-green-50/20'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedEmail(expandedEmail === email.uid ? null : email.uid)}>
                  <div className="flex items-center gap-2">
                    {!email.seen && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full shrink-0">New</span>}
                    <span className="text-sm font-semibold text-gray-900 truncate">{email.subject}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-medium">{email.fromName || email.from}</span>
                    {email.fromName && email.fromName !== email.from && ` · ${email.from}`}
                    {' · '}{new Date(email.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button onClick={() => handleDeleteInbox(email.uid)} className="text-xs text-red-400 hover:text-red-600 transition shrink-0">Delete</button>
              </div>

              {expandedEmail === email.uid && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{email.body}</pre>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reply to <span className="text-green-600">{email.from}</span></p>
                    <textarea
                      rows={4}
                      value={inboxReply[email.uid] || ''}
                      onChange={e => setInboxReply(prev => ({ ...prev, [email.uid]: e.target.value }))}
                      placeholder="Write your reply…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInboxReply(email)}
                        disabled={sendingReply === email.uid || !inboxReply[email.uid]?.trim()}
                        className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition"
                      >
                        {sendingReply === email.uid ? 'Sending…' : 'Send Reply'}
                      </button>
                      <span className="text-xs text-gray-400">From: contact@afavers.online</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Compose modal */}
          {composing && (
            <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
              <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">New Email</h3>
                  <button onClick={() => setComposing(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                </div>
                <input value={compose.to} onChange={e => setCompose(p => ({ ...p, to: e.target.value }))} placeholder="To (email)" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500" />
                <input value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} placeholder="Subject" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500" />
                <textarea rows={6} value={compose.body} onChange={e => setCompose(p => ({ ...p, body: e.target.value }))} placeholder="Message…" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                <div className="flex gap-3">
                  <button onClick={() => setComposing(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleComposeSend} disabled={sending || !compose.to || !compose.subject || !compose.body} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition">
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Delete user?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete <strong>{confirmDelete.email}</strong> and all their data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Skeletons ──────────────────────────────────────────────────────────────
const SkeletonCards = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
    {Array.from({ length: 4 }, (_, i) => (
      <div key={i} className="bg-gray-100 rounded-2xl h-24" />
    ))}
  </div>
);

const SkeletonTable = () => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="bg-gray-100 rounded-xl h-12" />
    ))}
  </div>
);
