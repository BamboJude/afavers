// afavers Job Capture — popup script
const SUPABASE_URL = 'https://mcaletfngisgofppfugr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jYWxldGZuZ2lzZ29mcHBmdWdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDIwMjEsImV4cCI6MjA4NjkxODAyMX0.IXaomWY0h75yICaWrxUIt-gnb3zWVmoMOzBloSNJh8s';
const DASHBOARD_URL = 'https://afavers.online/jobs';

// ── DOM refs ──────────────────────────────────────────────────────────────
const views = {
  login:   document.getElementById('view-login'),
  capture: document.getElementById('view-capture'),
  success: document.getElementById('view-success'),
};

const $ = id => document.getElementById(id);

// ── Show/hide helpers ─────────────────────────────────────────────────────
function showView(name) {
  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
}
function showError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(id) { $(id).classList.add('hidden'); }

// ── Auth ──────────────────────────────────────────────────────────────────
async function getToken() {
  return new Promise(resolve => {
    chrome.storage.local.get(['accessToken', 'refreshToken', 'userEmail', 'authUserId', 'appUserId'], result => {
      resolve({
        token: result.accessToken,
        refreshToken: result.refreshToken,
        email: result.userEmail,
        authUserId: result.authUserId,
        appUserId: result.appUserId,
      });
    });
  });
}

async function saveToken(session) {
  return new Promise(resolve => {
    chrome.storage.local.set({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      userEmail: session.email,
      authUserId: session.authUserId,
      appUserId: session.appUserId,
    }, resolve);
  });
}

async function clearToken() {
  return new Promise(resolve => {
    chrome.storage.local.remove(['token', 'accessToken', 'refreshToken', 'userEmail', 'authUserId', 'appUserId'], resolve);
  });
}

async function supabaseFetch(path, options = {}, token) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || data?.error || 'Request failed');
  }
  return data;
}

async function getAppUser(accessToken, authUserId, email) {
  let rows = await supabaseFetch(`/rest/v1/users?select=id,email,is_admin&auth_user_id=eq.${encodeURIComponent(authUserId)}&limit=1`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  }, accessToken);

  if (!rows?.length && email) {
    rows = await supabaseFetch(`/rest/v1/users?select=id,email,is_admin&email=ilike.${encodeURIComponent(email)}&limit=1`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }, accessToken);
  }

  if (!rows?.length) throw new Error('Account profile is not ready yet. Sign in on afavers once, then try again.');
  return rows[0];
}

async function hashText(value) {
  const bytes = new TextEncoder().encode(value || String(Date.now()));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

// ── Login ─────────────────────────────────────────────────────────────────
$('login-btn').addEventListener('click', async () => {
  const email    = $('login-email').value.trim();
  const password = $('login-password').value;
  if (!email || !password) return showError('login-error', 'Email and password required.');
  hideError('login-error');
  $('login-btn').disabled = true;
  $('login-btn').textContent = 'Signing in…';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.error || 'Login failed');

    const profile = await getAppUser(data.access_token, data.user.id, data.user.email);
    await saveToken({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      authUserId: data.user.id,
      appUserId: profile.id,
      email: profile.email || data.user.email,
    });
    setUserInfo(profile.email || data.user.email);
    showView('capture');
    extractFromPage();
  } catch (err) {
    showError('login-error', err.message);
  } finally {
    $('login-btn').disabled = false;
    $('login-btn').textContent = 'Sign In';
  }
});

// ── User info display ─────────────────────────────────────────────────────
function setUserInfo(email) {
  $('user-email').textContent = email;
  $('user-info').classList.remove('hidden');
}

$('logout-btn').addEventListener('click', async () => {
  await clearToken();
  $('user-info').classList.add('hidden');
  showView('login');
});

// ── Extract job from page ─────────────────────────────────────────────────
async function extractFromPage() {
  showView('capture');
  $('extract-status').classList.remove('hidden');
  $('capture-form').classList.add('hidden');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script if needed (some pages may not have it running)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
    } catch { /* already injected */ }

    const response = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' });

    $('extract-status').classList.add('hidden');
    $('capture-form').classList.remove('hidden');

    if (response?.success && response.data) {
      populateForm(response.data);
    } else {
      populateForm({ title: '', company: '', location: '', description: '', salary: '', url: tab.url, source: 'manual' });
    }
  } catch (err) {
    $('extract-status').classList.add('hidden');
    $('capture-form').classList.remove('hidden');
    // Still let user fill in manually
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => [{}]);
    populateForm({ title: '', company: '', location: '', description: '', salary: '', url: tab?.url || '', source: 'manual' });
  }
}

function populateForm(data) {
  $('field-title').value    = data.title    || '';
  $('field-company').value  = data.company  || '';
  $('field-location').value = data.location || '';
  $('field-salary').value   = data.salary   || '';

  // Source badge
  const badge = $('source-badge');
  const source = data.source || 'manual';
  const sourceLabels = {
    linkedin: '🔵 LinkedIn', indeed: '🔵 Indeed', stepstone: '🟠 StepStone',
    xing: '🟢 Xing', bundesagentur: '🇩🇪 Bundesagentur', glassdoor: '🟡 Glassdoor',
    adzuna: '🔍 Adzuna', manual: '✏️ Manual entry',
  };
  badge.textContent = sourceLabels[source] || `🌐 ${source}`;
  badge.dataset.url = data.url || '';
  badge.dataset.source = source;
  badge.dataset.description = data.description || '';
}

// ── Save job ──────────────────────────────────────────────────────────────
$('save-btn').addEventListener('click', async () => {
  const title   = $('field-title').value.trim();
  const company = $('field-company').value.trim();
  const location = $('field-location').value.trim();
  const salary  = $('field-salary').value.trim();
  const status  = $('field-status').value;
  const badge   = $('source-badge');
  const url     = badge.dataset.url || '';
  const source  = badge.dataset.source || 'manual';
  const description = badge.dataset.description || '';

  if (!title) return showError('save-error', 'Job title is required.');
  hideError('save-error');

  $('save-btn').disabled = true;
  $('save-btn').textContent = 'Saving…';

  const session = await getToken();
  if (!session.token) {
    await clearToken();
    showView('login');
    return;
  }

  try {
    const appUserId = session.appUserId || (await getAppUser(session.token, session.authUserId, session.email)).id;
    const cleanUrl = url || '';
    const externalHash = await hashText(`${appUserId}:${cleanUrl || `${title}:${company}:${location}`}`);
    const capturedFrom = source && source !== 'manual' ? `Captured from ${source}` : 'Captured from browser extension';
    const jobRows = await supabaseFetch('/rest/v1/jobs?on_conflict=external_id&select=id', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        external_id: `capture_${appUserId}_${externalHash}`,
        title,
        company: company || 'Unknown company',
        location: location || 'Not specified',
        salary: salary || null,
        url: cleanUrl,
        description: description ? `${capturedFrom}\n\n${description}` : capturedFrom,
        source: 'manual',
        posted_date: new Date().toISOString().slice(0, 10),
        owner_user_id: appUserId,
        is_manual: true,
      }),
    }, session.token);

    const jobId = jobRows?.[0]?.id;
    if (!jobId) throw new Error('Save failed');

    await supabaseFetch('/rest/v1/user_jobs?on_conflict=user_id,job_id', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: appUserId,
        job_id: jobId,
        status,
        applied_date: ['applied', 'followup', 'interviewing', 'offered'].includes(status) ? new Date().toISOString().slice(0, 10) : null,
        checklist: status === 'applied' ? { 'Application submitted': true } : {},
        history: [
          { type: 'manual', label: 'Captured from browser extension', at: new Date().toISOString() },
          { type: 'status', label: `Moved to ${status}`, at: new Date().toISOString() },
        ],
        updated_at: new Date().toISOString(),
      }),
    }, session.token);

    // Success
    $('success-sub').textContent = `${title}${company ? ` at ${company}` : ''}`;
    $('open-dashboard').href = DASHBOARD_URL;
    showView('success');
    $('user-info').classList.remove('hidden');
  } catch (err) {
    showError('save-error', err.message);
  } finally {
    $('save-btn').disabled = false;
    $('save-btn').textContent = 'Save to afavers';
  }
});

// ── Save another ──────────────────────────────────────────────────────────
$('save-another').addEventListener('click', () => {
  extractFromPage();
});

// ── Init ──────────────────────────────────────────────────────────────────
(async () => {
  const { token, email } = await getToken();
  if (token) {
    setUserInfo(email);
    showView('capture');
    extractFromPage();
  } else {
    showView('login');
  }
})();
