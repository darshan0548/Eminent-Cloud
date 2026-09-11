// ============================================================
// EminentCloud dashboard — frontend logic
// ============================================================

const isLocalTesting = window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.protocol === 'file:';

const API_BASE_URL = isLocalTesting
  ? 'http://localhost:3000'
  : 'https://api.eminentcloude.in';

function getStoredUserId() {
  return localStorage.getItem('eminentcloud_user_id');
}
function setStoredUserId(id) {
  localStorage.setItem('eminentcloud_user_id', id);
}
let userId = getStoredUserId();

// ------------------------------------------------------------
// View switching (Overview / Automations / Connections / etc.)
// ------------------------------------------------------------
const viewTitles = {
  overview: 'Overview',
  automations: 'Automations',
  activity: 'Activity',
  connections: 'Connections',
  settings: 'Settings',
  help: 'Help',
};

function switchView(view) {
  document.querySelectorAll('.page').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  const crumb = document.getElementById('pageCrumb');
  if (crumb) crumb.textContent = viewTitles[view] || view;

  if (view === 'activity') loadActivity();

  closeMobileSidebar();
}

function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

// ------------------------------------------------------------
// Mobile sidebar open/close
// ------------------------------------------------------------
function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('backdrop')?.classList.add('show');
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('backdrop')?.classList.remove('show');
}

// ------------------------------------------------------------
// Connect flow (real Instagram Business Login)
// ------------------------------------------------------------
function connectInstagram() {
  window.location.href = `${API_BASE_URL}/auth/instagram`;
}

function handleAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get('connected');
  const returnedUserId = params.get('userId');
  const reason = params.get('reason');

  if (connected === 'true' && returnedUserId) {
    userId = returnedUserId;
    setStoredUserId(userId);
    showToast('Instagram connected');
    loadSettings();
  } else if (connected === 'false') {
    let message = 'Connection failed — please try again.';
    if (reason === 'no_page') message = 'No Facebook Page found. Link your Instagram to a Page first.';
    if (reason === 'no_instagram') message = 'No Instagram Business account linked yet.';
    showToast(message);
  }

  if (connected !== null) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// ------------------------------------------------------------
// Settings load/save
// ------------------------------------------------------------
async function loadSettings() {
  updateConnectionUI(!!userId);
  if (!userId) return;

  try {
    const res = await fetch(`${API_BASE_URL}/settings/${userId}`);
    const data = await res.json();

    document.getElementById('toggle-comments').checked = !!data.commentsEnabled;
    document.getElementById('toggle-dm').checked = !!data.dmEnabled;
    if (data.replyText) document.getElementById('reply-text').value = data.replyText;
    if (data.dmText) document.getElementById('dm-text').value = data.dmText;

    updateOverview(data);
  } catch (err) {
    console.error('Could not load settings:', err);
    showToast('Could not reach the server — is the backend running?');
  }
}

async function saveSettings() {
  if (!userId) {
    showToast('Connect your Instagram account first');
    return;
  }
  const payload = {
    commentsEnabled: document.getElementById('toggle-comments').checked,
    dmEnabled: document.getElementById('toggle-dm').checked,
    replyText: document.getElementById('reply-text').value,
    dmText: document.getElementById('dm-text').value,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/settings/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Save failed');
    showToast('Saved to your account');
    updateOverview(payload);
  } catch (err) {
    console.error('Could not save settings:', err);
    showToast('Could not save — check the backend is running');
  }
}

function handleToggleChange() {
  saveSettings();
}

// ------------------------------------------------------------
// Small UI helpers that reflect connection/automation state
// ------------------------------------------------------------
function updateConnectionUI(isConnected) {
  const notConnected = document.getElementById('not-connected-view');
  const connected = document.getElementById('connected-view');
  if (notConnected) notConnected.style.display = isConnected ? 'none' : 'block';
  if (connected) connected.style.display = isConnected ? 'block' : 'none';

  const topPill = document.getElementById('topStatusPill');
  if (topPill) {
    topPill.className = `status-pill ${isConnected ? 'connected' : 'pending'}`;
    topPill.innerHTML = `<span class="status-dot"></span> ${isConnected ? 'Connected' : 'Not connected'}`;
  }

  const connPill = document.getElementById('connectionsPill');
  if (connPill) {
    connPill.className = `status-pill ${isConnected ? 'connected' : 'pending'}`;
    connPill.innerHTML = `<span class="status-dot"></span> ${isConnected ? 'Connected' : 'Not connected'}`;
  }

  const connBtn = document.getElementById('connectionsActionBtn');
  if (connBtn) connBtn.textContent = isConnected ? 'Reconnect Instagram' : 'Connect Instagram';

  const overviewConn = document.getElementById('overviewConnectionText');
  if (overviewConn) overviewConn.textContent = isConnected ? 'Connected' : 'Not connected yet';
}

function updateOverview(data) {
  const c = document.getElementById('overviewCommentsText');
  const d = document.getElementById('overviewDmText');
  if (c) c.textContent = data.commentsEnabled ? 'On' : 'Off';
  if (d) d.textContent = data.dmEnabled ? 'On' : 'Off';
}

function reopenCookieBanner() {
  document.getElementById('cookie-banner')?.classList.add('show');
}

// ------------------------------------------------------------
// Templates — real, working quick-fill presets (no backend needed)
// ------------------------------------------------------------
const templates = {
  thanks: {
    reply: 'Thanks so much! 🙌 Sending you more info in your DMs now.',
    dm: "Hey! Thanks for commenting 💜 Here's the link: eminentcloude.in/link",
  },
  faq: {
    reply: 'Great question! Check your DMs — I just answered it there 👇',
    dm: "Hi! Here's the answer to your question: [add your answer here]",
  },
  giveaway: {
    reply: "You're entered! 🎉 Check your DMs for the next step.",
    dm: "You're officially entered into the giveaway 🎉 Follow us and stay tuned for the winner announcement!",
  },
};

function applyTemplate(name) {
  const t = templates[name];
  if (!t) return;
  document.getElementById('reply-text').value = t.reply;
  document.getElementById('dm-text').value = t.dm;
  showToast('Template applied — edit and save when ready');
}

// ------------------------------------------------------------
// Activity — real data from Firestore, via the backend
// ------------------------------------------------------------
async function loadActivity() {
  const listEl = document.getElementById('activityList');
  const emptyEl = document.getElementById('activityEmpty');
  if (!listEl || !emptyEl) return;

  if (!userId) {
    emptyEl.querySelector('h3').textContent = 'Connect Instagram first';
    emptyEl.querySelector('p').textContent = 'Activity will appear here once your account is connected and receiving comments.';
    emptyEl.style.display = 'block';
    listEl.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/activity/${userId}`);
    const events = await res.json();

    if (!Array.isArray(events) || events.length === 0) {
      emptyEl.style.display = 'block';
      listEl.innerHTML = '';
      return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = events.map(ev => {
      const label = ev.type === 'comment_reply' ? 'Replied to a comment'
        : ev.type === 'dm_sent' ? 'Sent a follow-up DM'
        : ev.type === 'dm_received' ? 'Received a DM'
        : ev.type;
      const who = ev.fromUsername ? `@${ev.fromUsername}` : '';
      const status = ev.success === false ? ' — failed' : '';
      const when = new Date(ev.timestamp).toLocaleString();
      return `<div class="card-row">
        <div class="card-row-text">
          <h3>${label} ${who}${status}</h3>
          <p>${when}</p>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    console.error('Could not load activity:', err);
    emptyEl.querySelector('h3').textContent = 'Could not load activity';
    emptyEl.querySelector('p').textContent = 'Check that your backend is running.';
    emptyEl.style.display = 'block';
  }
}

// ------------------------------------------------------------
// Toast
// ------------------------------------------------------------
let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initNav();

  document.getElementById('openSidebar')?.addEventListener('click', openMobileSidebar);
  document.getElementById('closeSidebar')?.addEventListener('click', closeMobileSidebar);
  document.getElementById('backdrop')?.addEventListener('click', closeMobileSidebar);

  handleAuthRedirect();

  if (!document.location.search && userId) {
    loadSettings();
  } else {
    updateConnectionUI(false);
  }
});
