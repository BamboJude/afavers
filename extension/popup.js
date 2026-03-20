// afavers Job Capture — popup script
const API_URL = 'https://server-production-ebd2b.up.railway.app';
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
    chrome.storage.local.get(['token', 'userEmail'], result => {
      resolve({ token: result.token, email: result.userEmail });
    });
  });
}

async function saveToken(token, email) {
  return new Promise(resolve => {
    chrome.storage.local.set({ token, userEmail: email }, resolve);
  });
}

async function clearToken() {
  return new Promise(resolve => {
    chrome.storage.local.remove(['token', 'userEmail'], resolve);
  });
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
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    await saveToken(data.token, data.user.email);
    setUserInfo(data.user.email);
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

  const { token } = await getToken();
  if (!token) {
    await clearToken();
    showView('login');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/jobs/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, company, location, salary, status, url, source, description }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        await clearToken();
        showView('login');
        return;
      }
      throw new Error(data.error || 'Save failed');
    }

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
