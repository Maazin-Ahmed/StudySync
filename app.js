'use strict';
// ── State ─────────────────────────────────────────────────────
const S = {
  user: null,
  signupData: { name: '', email: '', subjects: [], goal: '', availability: [], modes: [] },
  signupStep: 1,
  partners: [],
  connections: [],   // accepted buddies {id, name, avatar, subject, sessions, lastChat}
  requests: { received: [], sent: [] },
  chatThreads: {},   // {partnerId: [{from,text,ts,mine}]}
  sessions: [],      // scheduled sessions
  activeSession: null,
  timer: { running: false, seconds: 25 * 60, total: 25 * 60, phase: 'focus', pomos: 0, interval: null },
  notifications: [],
  currentBuddy: null,
  currentChatId: null,
  searchFilters: { subject: '', when: 'anytime', mode: 'any' },
  stats: { days: 0, hours: 0, streak: 0, partners: 0 },
};

// ── Seed Partner Data ─────────────────────────────────────────
const SEED_PARTNERS = [
  { id: 'p1', name: 'Anjali Reddy', edu: '3rd Year, CSE', inst: 'Delhi University', avatar: '👩‍💻', subjects: ['Data Structures & Algorithms', 'Operating Systems'], goal: 'Placement Preparation', availability: ['Evening', 'Night'], modes: ['discussion', 'doubt'], rating: 4.9, sessions: 28, bio: 'Serious about placement prep. Let\'s crack DSA together!', matchPct: 0 },
  { id: 'p2', name: 'Rahul Verma', edu: 'Final Year, Mech.', inst: 'IIT Delhi', avatar: '👨‍🔬', subjects: ['Mathematics', 'Physics', 'GATE Prep'], goal: 'Exam Preparation', availability: ['Evening', 'Night'], modes: ['silent'], rating: 4.8, sessions: 32, bio: 'GATE mechanical 2026 aspirant. Consistent and punctual.', matchPct: 0 },
  { id: 'p3', name: 'Karan Singh', edu: 'Final Year, IT', inst: 'Mumbai University', avatar: '🧑‍💻', subjects: ['Data Structures & Algorithms', 'Machine Learning'], goal: 'Placement Preparation', availability: ['Morning', 'Evening'], modes: ['discussion'], rating: 4.7, sessions: 15, bio: 'Building projects + placement prep. Let\'s grind!', matchPct: 0 },
  { id: 'p4', name: 'Meera Patel', edu: '2nd Year, ECE', inst: 'BITS Bangalore', avatar: '👩‍🎓', subjects: ['Mathematics', 'Physics', 'Computer Networks'], goal: 'College Studies', availability: ['Morning', 'Afternoon'], modes: ['silent', 'doubt'], rating: 4.6, sessions: 12, bio: 'Love math and circuits. Looking for morning study partners.', matchPct: 0 },
  { id: 'p5', name: 'Arjun Nair', edu: 'Final Year, CS', inst: 'NIT Calicut', avatar: '🎓', subjects: ['Data Structures & Algorithms', 'CAT Prep'], goal: 'Exam Preparation', availability: ['Night'], modes: ['discussion', 'quiet'], rating: 4.5, sessions: 8, bio: 'CAT 2026 + coding interviews. Let\'s ace both.', matchPct: 0 },
  { id: 'p6', name: 'Sneha Gupta', edu: '3rd Year, BBA', inst: 'Symbiosis Pune', avatar: '👩‍💼', subjects: ['CAT Prep', 'Mathematics'], goal: 'Exam Preparation', availability: ['Afternoon', 'Evening'], modes: ['discussion'], rating: 4.9, sessions: 41, bio: 'CAT quant specialist. Love peer teaching.', matchPct: 0 },
  { id: 'p7', name: 'Dev Sharma', edu: 'Final Year, CS', inst: 'VIT Chennai', avatar: '🧠', subjects: ['Machine Learning', 'Data Structures & Algorithms'], goal: 'Placement Preparation', availability: ['Morning', 'Night'], modes: ['silent', 'discussion'], rating: 4.7, sessions: 20, bio: 'ML research + placement. Open to all study modes.', matchPct: 0 },
  { id: 'p8', name: 'Prachi Joshi', edu: '2nd Year, MBBS', inst: 'AIIMS Delhi', avatar: '👩‍⚕️', subjects: ['Biology', 'Chemistry'], goal: 'College Studies', availability: ['Evening', 'Night'], modes: ['silent'], rating: 4.8, sessions: 35, bio: 'Med student. Need serious, focused study buddies.', matchPct: 0 },
  { id: 'p9', name: 'Aditya Kumar', edu: 'Final Year, CS', inst: 'IIIT Hyderabad', avatar: '🚀', subjects: ['Data Structures & Algorithms', 'Computer Networks', 'Operating Systems'], goal: 'Placement Preparation', availability: ['Morning', 'Evening', 'Night'], modes: ['doubt', 'discussion'], rating: 4.9, sessions: 55, bio: 'Placed at Google! Happy to help others with DSA.', matchPct: 0 },
  { id: 'p10', name: 'Ritika Bose', edu: '3rd Year, Commerce', inst: 'Delhi College', avatar: '📊', subjects: ['CAT Prep', 'Business'], goal: 'Exam Preparation', availability: ['Morning', 'Afternoon'], modes: ['discussion'], rating: 4.6, sessions: 18, bio: 'MBA aspirant. Verbal + DILR focus. Let\'s prep together!', matchPct: 0 },
  { id: 'p11', name: 'Sahil Mehta', edu: 'Final Year, EE', inst: 'IIT Bombay', avatar: '⚡', subjects: ['Mathematics', 'Physics', 'GATE Prep'], goal: 'Exam Preparation', availability: ['Afternoon', 'Evening'], modes: ['silent', 'discussion'], rating: 4.5, sessions: 22, bio: 'GATE EE 2026. Consistent daily studiier.', matchPct: 0 },
  { id: 'p12', name: 'Nisha Thomas', edu: '1st Year, CS', inst: 'BITS Pilani', avatar: '🌟', subjects: ['Mathematics', 'Data Structures & Algorithms'], goal: 'College Studies', availability: ['Evening'], modes: ['doubt'], rating: 4.4, sessions: 6, bio: 'New here! Looking for patient study partners for DS basics.', matchPct: 0 },
];

const MSG_TEMPLATES = [
  { label: '👋 Introduction', texts: ['Hey! I saw your profile and think we\'d make great study partners!', 'Hi! Looking for a consistent study buddy. Want to try a session?', 'Hello! Your profile looks great. When are you usually free to study?'] },
  { label: '📚 Study Request', texts: ['Would you be open to a 2-hour DSA session this evening?', 'Struggling with some concepts and your profile says you\'re great at it. Can you help?', 'Looking for a quiet pomodoro partner for tonight. Interested?'] },
  { label: '⏰ Session Coordination', texts: ['Ready for our session? Just finishing up lunch!', 'Running 10 minutes late, sorry!', 'Can we push the session to 7:30 PM instead?'] },
  { label: '🎯 Post Session', texts: ['Great session today! Same time next week?', 'Thanks for the help! Learned a lot.', 'That was super productive. Let\'s do it again tomorrow?'] },
];

// ── Helpers ───────────────────────────────────────────────────
function save(key, val) { try { localStorage.setItem('ss_' + key, JSON.stringify(val)); } catch (e) { } }
function load(key) { try { return JSON.parse(localStorage.getItem('ss_' + key)); } catch (e) { return null; } }
function pad(n) { return String(n).padStart(2, '0'); }
function fmtTime(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
function fmtTs(ts) { if (!ts) return ''; const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDate(ts) {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const tom = new Date(now); tom.setDate(now.getDate() + 1);
  if (d.toDateString() === tom.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}
function calcMatch(partner) {
  if (!S.user) return 50;
  let score = 0;
  const subjectOverlap = (partner.subjects || []).filter(s => (S.user.subjects || []).includes(s)).length;
  score += Math.min(40, subjectOverlap * 20);
  if (partner.goal === S.user.goal) score += 25; else score += 10;
  const modeOverlap = (partner.modes || []).filter(m => (S.user.modes || []).includes(m)).length;
  score += Math.min(20, modeOverlap * 10);
  const availOverlap = (partner.availability || []).filter(a => (S.user.availability || []).includes(a)).length;
  score += Math.min(10, availOverlap * 5);
  score += Math.min(5, Math.round(partner.rating));
  return Math.min(99, Math.max(30, score));
}
function addNotif(icon, title, body, action = '') {
  S.notifications.unshift({ icon, title, body, action, ts: Date.now(), unread: true });
  save('notifications', S.notifications);
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = 'block';
}
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => { p.classList.add('hidden'); p.classList.remove('active'); });
  const el = document.getElementById(id);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  // Sync bottom nav
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const tab = id.replace('page-', '');
  const active = document.querySelector(`.bnav-item[data-page="${tab}"]`);
  if (active) active.classList.add('active');
}
function showModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('hidden'); }
function hideModal(id) { const m = document.getElementById(id); if (m) m.classList.add('hidden'); }
function modeLabel(m) { return { silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing', teaching: '✏️ Teaching' }[m] || m; }

// ── Init ──────────────────────────────────────────────────────
function init() {
  S.user = load('user');
  S.connections = load('connections') || [];
  S.requests = load('requests') || { received: [], sent: [] };
  S.chatThreads = load('chatThreads') || {};
  S.sessions = load('sessions') || [];
  S.notifications = load('notifications') || [];
  S.stats = load('stats') || { days: 3, hours: 8, streak: 3, partners: S.connections.length };

  // Populate seed partners with match scores
  S.partners = SEED_PARTNERS.map(p => ({ ...p, matchPct: calcMatch(p) }));

  if (S.user) {
    goHome();
    // seed default notifications if none
    if (!S.notifications.length) {
      addNotif('📚', 'Welcome to StudySync!', 'Find your first study partner.', 'Find Partners');
    }
  }
}

// ── Landing page ──────────────────────────────────────────────
document.getElementById('btn-nav-signup').onclick = () => showModal('modal-signup');
document.getElementById('btn-nav-login').onclick = () => { if (S.user) goHome(); else showModal('modal-login'); };
document.getElementById('btn-hero-start').onclick = () => showModal('modal-signup');
document.getElementById('btn-hero-learn').onclick = () => document.querySelector('.features')?.scrollIntoView({ behavior: 'smooth' });

// ── Signup Flow ───────────────────────────────────────────────
let signupSubjects = [];
function gotoStep(n) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-${i}`);
    if (el) el.classList.toggle('hidden', i !== n);
  }
  S.signupStep = n;
  renderStepDots(n);
}
function renderStepDots(active) {
  const el = document.getElementById('signup-step-dots');
  if (!el) return;
  el.innerHTML = [1, 2, 3, 4, 5].map(i => `<div class="step-dot ${i < active ? 'done' : i === active ? 'active' : ''}"></div>`).join('');
}
document.getElementById('btn-close-signup').onclick = () => hideModal('modal-signup');
document.getElementById('btn-step1-next').onclick = () => {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  if (!name) { alert('Please enter your name.'); return; }
  S.signupData.name = name; S.signupData.email = email;
  gotoStep(2);
};
document.getElementById('btn-step2-back').onclick = () => gotoStep(1);
document.getElementById('btn-step2-next').onclick = () => {
  if (!signupSubjects.length) { alert('Pick at least one subject.'); return; }
  S.signupData.subjects = [...signupSubjects]; gotoStep(3);
};
document.getElementById('btn-step3-back').onclick = () => gotoStep(2);
document.getElementById('btn-step3-next').onclick = () => {
  const checked = document.querySelector('input[name="goal"]:checked');
  if (!checked) { alert('Please select your goal.'); return; }
  S.signupData.goal = checked.value; gotoStep(4);
};
document.getElementById('btn-step4-back').onclick = () => gotoStep(3);
document.getElementById('btn-step4-next').onclick = () => {
  const avail = [...document.querySelectorAll('#step-4 .check-card input[type=checkbox]:checked')].map(c => c.value);
  const modes = [...document.querySelectorAll('input[name=mode]:checked')].map(c => c.value);
  S.signupData.availability = avail; S.signupData.modes = modes;
  const avatars = ['👩‍💻', '🧑‍💻', '👨‍🔬', '👩‍🎓', '🎓', '🧠', '📖', '🚀', '⚡', '🌟'];
  S.user = {
    name: S.signupData.name, email: S.signupData.email,
    subjects: S.signupData.subjects, goal: S.signupData.goal,
    availability: S.signupData.availability, modes: S.signupData.modes,
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    institution: '', education: '', bio: '',
    rating: 0, totalSessions: 0, joinedDays: 0,
  };
  save('user', S.user); gotoStep(5);
};
document.getElementById('btn-start-app').onclick = () => {
  hideModal('modal-signup');
  S.partners = SEED_PARTNERS.map(p => ({ ...p, matchPct: calcMatch(p) }));
  goHome();
  addNotif('🎉', 'Welcome to StudySync!', 'Start by finding a study partner.', 'Find Partners');
};
// Subject chips in signup
document.getElementById('subject-chips-grid').addEventListener('click', e => {
  const chip = e.target.closest('.subj-chip');
  if (!chip) return;
  const val = chip.dataset.val;
  if (signupSubjects.includes(val)) {
    signupSubjects = signupSubjects.filter(s => s !== val);
    chip.classList.remove('selected');
  } else if (signupSubjects.length < 3) {
    signupSubjects.push(val);
    chip.classList.add('selected');
  }
});
// Link to login from signup
document.getElementById('link-to-login').onclick = e => { e.preventDefault(); hideModal('modal-signup'); showModal('modal-login'); };

// ── Login ──────────────────────────────────────────────────────
document.getElementById('btn-close-login').onclick = () => hideModal('modal-login');
document.getElementById('btn-do-login').onclick = () => {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { alert('Please enter your email.'); return; }
  if (S.user) { hideModal('modal-login'); goHome(); return; }
  // demo: create a minimal user from email
  S.user = { name: email.split('@')[0], email, subjects: ['Data Structures & Algorithms'], goal: 'Placement Preparation', availability: ['Evening'], modes: ['discussion'], avatar: '🧑‍💻', institution: '', education: '', bio: '', rating: 4.5, totalSessions: 0 };
  save('user', S.user); hideModal('modal-login'); goHome();
};
document.getElementById('link-to-signup').onclick = e => { e.preventDefault(); hideModal('modal-login'); showModal('modal-signup'); };

// ── Home ──────────────────────────────────────────────────────
function goHome() {
  showPage('page-home');
  renderHome();
}
function renderHome() {
  if (!S.user) return;
  const h = document.getElementById('home-greeting');
  const sub = document.getElementById('home-sub');
  if (h) h.textContent = `Hey ${S.user.name.split(' ')[0]}! 👋`;
  const hr = new Date().getHours();
  if (sub) sub.textContent = hr < 12 ? 'Good morning! Ready to study?' : hr < 17 ? 'Good afternoon, keep going!' : 'Good evening, time to focus!';

  // stats
  document.getElementById('wstat-days').textContent = S.stats.days;
  document.getElementById('wstat-hrs').textContent = S.stats.hours;
  document.getElementById('wstat-streak').textContent = S.stats.streak + '🔥';
  document.getElementById('wstat-partners').textContent = S.connections.length;

  // requests badge
  const pending = S.requests.received.filter(r => r.status === 'pending').length;
  const badge = document.getElementById('req-badge-home');
  if (badge) { badge.textContent = pending || ''; badge.style.display = pending ? 'inline' : 'none'; }

  // sessions
  renderUpcomingSessions();
  // notif dot
  const hasUnread = S.notifications.some(n => n.unread);
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = hasUnread ? 'block' : 'none';
}

function renderUpcomingSessions() {
  const el = document.getElementById('upcoming-sessions-list');
  if (!el) return;
  if (!S.sessions.length) {
    el.innerHTML = `<div class="empty-state-sm">No sessions scheduled yet.<br><a href="#" class="link" id="link-find-first">Find a study partner</a> to get started!</div>`;
    document.getElementById('link-find-first')?.addEventListener('click', e => { e.preventDefault(); goFind(); });
    return;
  }
  el.innerHTML = S.sessions.slice(0, 2).map(s => `
    <div class="session-card">
      <div class="session-card-time">${fmtDate(s.ts)} • ${s.time || '7:00 PM'}</div>
      <div class="session-card-subject">${s.subject}</div>
      <div class="session-card-with">with ${s.partnerName}</div>
      <div class="session-card-mode">${modeLabel(s.mode)} • ${s.duration} hrs</div>
      <div class="session-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="openChat('${s.partnerId}')">💬 Chat</button>
        <button class="btn btn-primary btn-sm" onclick="goLobby('${s.id}')">Join Session →</button>
      </div>
    </div>`).join('');
}

// ── Bottom Nav ────────────────────────────────────────────────
document.querySelectorAll('.bnav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!S.user) { showModal('modal-signup'); return; }
    const p = btn.dataset.page;
    if (p === 'home') goHome();
    else if (p === 'find') goFind();
    else if (p === 'chats') goChats();
    else if (p === 'profile') goProfile();
  });
});
document.getElementById('btn-quick-find').onclick = () => goFind();
document.getElementById('btn-quick-session').onclick = () => goSessionCreate();
document.getElementById('btn-quick-requests').onclick = () => goRequests();
document.getElementById('link-find-first')?.addEventListener('click', e => { e.preventDefault(); goFind(); });
document.getElementById('btn-notifs').onclick = () => goNotifs();

// ── Find Partners ─────────────────────────────────────────────
function goFind() { showPage('page-find'); document.getElementById('partners-results').innerHTML = ''; document.getElementById('results-label').style.display = 'none'; }
document.getElementById('btn-find-partners').onclick = () => {
  const subj = document.getElementById('filter-subject').value;
  const when = document.getElementById('filter-when').value;
  const mode = document.getElementById('filter-mode').value;
  S.searchFilters = { subject: subj, when, mode };
  let results = S.partners.filter(p => {
    if (S.connections.find(c => c.id === p.id)) return false;
    if (subj && !p.subjects.includes(subj)) return false;
    if (mode !== 'any' && !p.modes.includes(mode)) return false;
    return true;
  }).sort((a, b) => b.matchPct - a.matchPct);
  const lbl = document.getElementById('results-label');
  lbl.style.display = 'block';
  lbl.textContent = `${results.length} partner${results.length !== 1 ? 's' : ''} found${subj ? ' studying ' + subj : ''}`;
  renderPartnerResults(results);
};
function renderPartnerResults(list) {
  const el = document.getElementById('partners-results');
  if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No partners found</div><div class="empty-sub">Try adjusting your filters</div></div>`; return; }
  el.innerHTML = list.map(p => {
    const matchClass = p.matchPct >= 80 ? 'high' : p.matchPct >= 65 ? 'mid' : 'low';
    const sharedSubjects = p.subjects.filter(s => (S.user?.subjects || []).includes(s));
    return `<div class="partner-card">
      <div class="pc-top">
        <div class="pc-avatar">${p.avatar}</div>
        <div class="pc-info">
          <div class="pc-name">${p.name}</div>
          <div class="pc-edu">${p.edu} • ${p.inst}</div>
          <div class="pc-rating">⭐ ${p.rating} • ${p.sessions} sessions</div>
        </div>
        <div class="pc-match ${matchClass}">${p.matchPct}%<span>match</span></div>
      </div>
      <div class="pc-tags">
        ${p.subjects.map(s => `<span class="pc-tag">${s}</span>`).join('')}
      </div>
      <div class="pc-avail">⏰ ${p.availability.join(', ')} &nbsp;•&nbsp; ${p.modes.map(modeLabel).join(', ')}</div>
      ${sharedSubjects.length ? `<div class="pc-match-exp">✓ You both study: ${sharedSubjects.join(', ')}</div>` : ''}
      <div class="pc-actions">
        <button class="btn btn-ghost btn-sm" onclick="viewBuddy('${p.id}')">View Profile</button>
        <button class="btn btn-primary btn-sm" onclick="openSendRequest('${p.id}')">Send Request</button>
      </div>
    </div>`;
  }).join('');
}

// ── Buddy Profile ─────────────────────────────────────────────
window.viewBuddy = function (id) {
  const p = S.partners.find(x => x.id === id);
  if (!p) return;
  S.currentBuddy = p;
  document.getElementById('buddy-profile-title').textContent = p.name;
  const matchClass = p.matchPct >= 80 ? 'high' : p.matchPct >= 65 ? 'mid' : 'low';
  const sharedSubjects = p.subjects.filter(s => (S.user?.subjects || []).includes(s));
  const isConn = S.connections.find(c => c.id === id);
  document.getElementById('buddy-profile-content').innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar">${p.avatar}</div>
      <div class="profile-name">${p.name}</div>
      <div class="profile-edu">${p.edu}</div>
      <div class="profile-inst">${p.inst}</div>
      <div class="profile-rating">⭐ ${p.rating} &nbsp;•&nbsp; ${p.sessions} sessions</div>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Studying</div>
      <div class="profile-subjects">${p.subjects.map(s => `<span class="profile-subject-tag">${s}</span>`).join('')}</div>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Goal</div>
      <div>${p.goal}</div>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Usually Available</div>
      <div class="profile-avail-pills">${p.availability.map(a => `<span class="avail-pill">${a}</span>`).join('')}</div>
      <div style="margin-top:8px;font-size:13px;color:var(--text2)">Prefers: ${p.modes.map(modeLabel).join(', ')}</div>
    </div>
    ${p.bio ? `<div class="profile-section"><div class="profile-section-label">About</div><div class="profile-bio">${p.bio}</div></div>` : ''}
    <div class="match-score-banner">
      <div class="match-pct ${matchClass}">${p.matchPct}% Match</div>
      ${sharedSubjects.length ? `<div class="match-desc">You both study: ${sharedSubjects.join(', ')}</div>` : '<div class="match-desc">Similar study patterns</div>'}
    </div>
    <div style="height:80px"></div>
  `;
  const actions = document.createElement('div');
  actions.className = 'buddy-profile-actions';
  actions.innerHTML = isConn
    ? `<button class="btn btn-primary" style="width:100%" onclick="openChat('${id}')">💬 Chat with ${p.name.split(' ')[0]}</button>`
    : `<button class="btn btn-primary" style="width:100%;margin-top:0" onclick="openSendRequest('${id}')">Send Study Request ✉️</button>`;
  document.getElementById('buddy-profile-content').appendChild(actions);
  showPage('page-buddy-profile');
};
document.getElementById('btn-back-from-buddy').onclick = () => {
  // go back to where we came from
  showPage('page-find');
};

// ── Send Request ──────────────────────────────────────────────
window.openSendRequest = function (id) {
  const p = S.partners.find(x => x.id === id) || S.currentBuddy;
  if (!p) return;
  S.currentBuddy = p;
  document.getElementById('req-partner-sub').textContent = `to ${p.name}`;
  // prefill subject
  const subj = document.getElementById('req-subject');
  if (p.subjects[0]) subj.value = p.subjects[0];
  showModal('modal-send-request');
};
document.getElementById('btn-close-send-req').onclick = () => hideModal('modal-send-request');
document.getElementById('btn-confirm-send-req').onclick = () => {
  const p = S.currentBuddy;
  if (!p) return;
  const subject = document.getElementById('req-subject').value;
  const mode = document.getElementById('req-mode').value;
  const when = document.getElementById('req-when').value;
  const duration = document.getElementById('req-duration').value;
  const msg = document.getElementById('req-message').value.trim() || `Hey ${p.name.split(' ')[0]}! I'd love to study ${subject} together.`;
  const req = { id: 'req_' + Date.now(), partnerId: p.id, partnerName: p.name, partnerAvatar: p.avatar, subject, mode, when, duration, message: msg, status: 'pending', ts: Date.now() };
  S.requests.sent.push(req);
  // simulate receiving after 3s
  setTimeout(() => {
    const i = S.requests.sent.findIndex(r => r.id === req.id);
    if (i > -1) S.requests.sent[i].status = 'accepted';
    // add to connections
    if (!S.connections.find(c => c.id === p.id)) {
      S.connections.push({ id: p.id, name: p.name, avatar: p.avatar, subject, sessions: p.sessions, lastChat: '', lastTs: Date.now() });
      S.stats.partners = S.connections.length;
      save('stats', S.stats);
    }
    // init chat thread
    if (!S.chatThreads[p.id]) S.chatThreads[p.id] = [];
    S.chatThreads[p.id].push({ from: p.name, text: `Hey! Thanks for reaching out. ${msg.includes('?') ? "Sure, let's connect!" : "I'm in!"}`, ts: Date.now(), mine: false, avatar: p.avatar });
    save('connections', S.connections); save('chatThreads', S.chatThreads); save('requests', S.requests);
    addNotif('✅', `${p.name} accepted!`, `You can now chat with ${p.name.split(' ')[0]}.`, 'Open Chat');
    renderHome();
  }, 3000);
  save('requests', S.requests);
  hideModal('modal-send-request');
  addNotif('✉️', 'Request sent!', `Your study request was sent to ${p.name}.`, '');
  alert(`Request sent to ${p.name}! They'll be notified. (Demo: they'll accept in 3 seconds)`);
};
// Template pills
document.querySelectorAll('.tpill').forEach(pill => {
  pill.addEventListener('click', () => {
    const p = S.currentBuddy;
    const name = p?.name?.split(' ')[0] || 'there';
    const subj = document.getElementById('req-subject')?.value || 'DSA';
    const tpl = {
      intro: `Hey ${name}! I saw your profile and think we'd make great study partners for ${subj}. Would you like to connect?`,
      doubt: `Hi ${name}! I'm struggling with some concepts in ${subj}. Could you help with a doubt-clearing session? I can help you with other topics in return!`,
      regular: `Hey ${name}! Looking for a consistent study partner for ${subj}. I usually study evenings. Want to try a session?`,
    };
    const ta = document.getElementById('req-message');
    if (ta) ta.value = tpl[pill.dataset.tpl] || '';
  });
});

// ── Requests Page ─────────────────────────────────────────────
function goRequests() { showPage('page-requests'); renderRequests(); }
document.getElementById('btn-back-requests').onclick = () => goHome();
function renderRequests() {
  renderReceivedReqs(); renderSentReqs();
}
function renderReceivedReqs() {
  const el = document.getElementById('requests-received-list');
  const list = S.requests.received;
  if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-title">No requests yet</div><div class="empty-sub">When someone sends you a study request, it'll appear here.</div></div>`; return; }
  el.innerHTML = list.map(r => `
    <div class="request-card">
      <div class="req-card-top">
        <div class="req-card-avatar">${r.partnerAvatar || '👤'}</div>
        <div><div class="req-card-name">${r.partnerName}</div><div class="req-card-match">Match: ${r.matchPct || 75}%</div></div>
      </div>
      <div class="req-info-row">📚 <strong>${r.subject}</strong> &nbsp;•&nbsp; ${modeLabel(r.mode)}</div>
      <div class="req-info-row">⏰ ${r.when} &nbsp;•&nbsp; ${r.duration}</div>
      ${r.message ? `<div class="req-message">"${r.message}"</div>` : ''}
      <div class="req-actions">
        <button class="btn btn-primary btn-sm" onclick="acceptRequest('${r.id}')">Accept ✓</button>
        <button class="btn btn-danger btn-sm" onclick="declineRequest('${r.id}')">Decline</button>
        <button class="btn btn-ghost btn-sm" onclick="viewBuddy('${r.partnerId}')">View Profile</button>
      </div>
    </div>`).join('');
}
function renderSentReqs() {
  const el = document.getElementById('requests-sent-list');
  const list = S.requests.sent;
  if (!list.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">✉️</div><div class="empty-title">No sent requests</div><div class="empty-sub">Send a study request to a partner first.</div></div>`; return; }
  el.innerHTML = list.map(r => `
    <div class="request-card">
      <div class="req-card-top">
        <div class="req-card-avatar">${r.partnerAvatar || '👤'}</div>
        <div><div class="req-card-name">${r.partnerName}</div><span class="req-status-chip ${r.status}">${r.status}</span></div>
      </div>
      <div class="req-info-row">📚 ${r.subject} &nbsp;•&nbsp; ${modeLabel(r.mode)}</div>
    </div>`).join('');
}
window.acceptRequest = function (id) {
  const r = S.requests.received.find(x => x.id === id);
  if (!r) return;
  r.status = 'accepted';
  if (!S.connections.find(c => c.id === r.partnerId)) {
    S.connections.push({ id: r.partnerId, name: r.partnerName, avatar: r.partnerAvatar, subject: r.subject, sessions: 0, lastChat: '', lastTs: Date.now() });
  }
  if (!S.chatThreads[r.partnerId]) S.chatThreads[r.partnerId] = [];
  S.chatThreads[r.partnerId].push({ from: r.partnerName, text: `Hi! Thanks for accepting. Looking forward to our ${r.subject} session!`, ts: Date.now(), mine: false, avatar: r.partnerAvatar });
  S.stats.partners = S.connections.length;
  save('connections', S.connections); save('chatThreads', S.chatThreads); save('requests', S.requests); save('stats', S.stats);
  addNotif('✅', 'Request accepted!', `You can now chat with ${r.partnerName}.`, '');
  renderRequests(); renderHome();
};
window.declineRequest = function (id) {
  S.requests.received = S.requests.received.filter(x => x.id !== id);
  save('requests', S.requests); renderRequests();
};
document.getElementById('tab-received').onclick = () => { document.getElementById('tab-received').classList.add('active'); document.getElementById('tab-sent').classList.remove('active'); document.getElementById('requests-received-list').classList.remove('hidden'); document.getElementById('requests-sent-list').classList.add('hidden'); };
document.getElementById('tab-sent').onclick = () => { document.getElementById('tab-sent').classList.add('active'); document.getElementById('tab-received').classList.remove('active'); document.getElementById('requests-sent-list').classList.remove('hidden'); document.getElementById('requests-received-list').classList.add('hidden'); };

// ── Chats ─────────────────────────────────────────────────────
function goChats() { showPage('page-chats'); renderChatList(); }
function renderChatList() {
  const el = document.getElementById('chat-list-content');
  if (!S.connections.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">💬</div><div class="empty-title">No chats yet</div><div class="empty-sub">Accept a study request to start chatting</div><button class="btn btn-primary btn-sm" onclick="goFind()">Find Partners</button></div>`; return; }
  el.innerHTML = S.connections.map(c => {
    const msgs = S.chatThreads[c.id] || [];
    const last = msgs[msgs.length - 1];
    return `<div class="chat-list-item" onclick="openChat('${c.id}')">
      <div class="cl-avatar">${c.avatar}<div class="cl-online"></div></div>
      <div class="cl-info">
        <div class="cl-name">${c.name}</div>
        <div class="cl-preview">${last ? (last.mine ? 'You: ' : '') + last.text : 'Say hello!'}</div>
      </div>
      <div class="cl-meta"><div class="cl-time">${last ? fmtTs(last.ts) : ''}</div></div>
    </div>`;
  }).join('');
}
document.getElementById('btn-go-buddies').onclick = () => goBuddies();
document.getElementById('btn-find-from-chats').onclick = () => goFind();

// ── Individual Chat ────────────────────────────────────────────
window.openChat = function (id) {
  const c = S.connections.find(x => x.id === id) || S.partners.find(x => x.id === id);
  if (!c) return;
  S.currentChatId = id;
  document.getElementById('chat-partner-avatar').textContent = c.avatar || '👤';
  document.getElementById('chat-partner-name').textContent = c.name;
  document.getElementById('chat-partner-status').textContent = '🟢 Active now';
  if (!S.chatThreads[id]) S.chatThreads[id] = [];
  renderChatMessages();
  renderQuickReplies();
  showPage('page-chat');
};
function renderChatMessages() {
  const el = document.getElementById('chat-messages-area');
  if (!el) return;
  const msgs = S.chatThreads[S.currentChatId] || [];
  if (!msgs.length) { el.innerHTML = `<div class="chat-system-msg">Start a conversation!</div>`; return; }
  el.innerHTML = `<div class="chat-day-label">Today</div>` + msgs.map(m => {
    if (m.system) return `<div class="chat-system-msg">${m.text}</div>`;
    return `<div class="chat-bubble-row ${m.mine ? 'mine' : ''}">
      ${!m.mine ? `<div class="chat-bubble-avatar">${m.avatar || '👤'}</div>` : ''}
      <div class="chat-bubble-wrap ${m.mine ? 'mine' : ''}">
        ${!m.mine ? `<div class="chat-sender-name">${m.from}</div>` : ''}
        <div class="chat-bubble">${m.text}</div>
        <div class="chat-ts">${fmtTs(m.ts)}</div>
      </div>
    </div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}
function renderQuickReplies() {
  const el = document.getElementById('quick-replies-bar');
  const replies = ['Ready now! 🎯', 'Running 5 mins late', 'Can we reschedule?', 'Great session! 🙌', 'Same time tomorrow?'];
  el.innerHTML = replies.map(r => `<div class="quick-reply" data-text="${r}">${r}</div>`).join('');
  el.querySelectorAll('.quick-reply').forEach(q => q.addEventListener('click', () => sendChatMsg(q.dataset.text)));
}
function sendChatMsg(text) {
  if (!text || !S.currentChatId) return;
  if (!S.chatThreads[S.currentChatId]) S.chatThreads[S.currentChatId] = [];
  S.chatThreads[S.currentChatId].push({ from: 'You', text, ts: Date.now(), mine: true });
  const conn = S.connections.find(c => c.id === S.currentChatId);
  if (conn) { conn.lastChat = text; conn.lastTs = Date.now(); }
  save('chatThreads', S.chatThreads); save('connections', S.connections);
  renderChatMessages();
  // bot reply
  const partner = S.partners.find(p => p.id === S.currentChatId) || S.connections.find(c => c.id === S.currentChatId);
  setTimeout(() => {
    const replies = ["Sounds good! 👍", "Sure, let's do it!", "That works for me!", "Okay! See you then 🎯", "Agreed! Let's make it productive.", "Looking forward to it! 📚"];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    S.chatThreads[S.currentChatId].push({ from: partner?.name || 'Partner', text: reply, ts: Date.now(), mine: false, avatar: partner?.avatar || '👤' });
    save('chatThreads', S.chatThreads);
    if (S.currentChatId && !document.getElementById('page-chat').classList.contains('hidden')) renderChatMessages();
  }, 1200 + Math.random() * 1200);
}
document.getElementById('btn-send-msg').onclick = () => {
  const inp = document.getElementById('chat-msg-input');
  const t = inp.value.trim();
  if (t) { sendChatMsg(t); inp.value = ''; }
};
document.getElementById('chat-msg-input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-send-msg').click(); } });
document.getElementById('btn-back-chat').onclick = () => goChats();
document.getElementById('btn-chat-schedule').onclick = () => goSessionCreate();
// Template picker
document.getElementById('btn-template-picker').onclick = () => {
  const list = document.getElementById('template-list');
  list.innerHTML = MSG_TEMPLATES.map(g => `
    <div style="margin-bottom:14px">
      <div class="tpl-label">${g.label}</div>
      ${g.texts.map(t => `<div class="template-item" data-t="${t.replace(/"/g, "'")}"><div class="tpl-text">${t}</div></div>`).join('')}
    </div>`).join('');
  list.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
      document.getElementById('chat-msg-input').value = item.dataset.t;
      hideModal('modal-templates');
    });
  });
  showModal('modal-templates');
};
document.getElementById('btn-close-templates').onclick = () => hideModal('modal-templates');

// ── Buddies Page ──────────────────────────────────────────────
function goBuddies() {
  showPage('page-buddies');
  const el = document.getElementById('buddies-list-content');
  if (!S.connections.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">🤝</div><div class="empty-title">No buddies yet</div><div class="empty-sub">Send study requests and get accepted to build your buddy list!</div></div>`; return; }
  el.innerHTML = S.connections.map(c => `
    <div class="buddy-card">
      <div class="buddy-avatar">${c.avatar}</div>
      <div class="buddy-info">
        <div class="buddy-name">${c.name}</div>
        <div class="buddy-sub">${c.subject || ''}</div>
        <div class="buddy-sessions">${c.sessions} sessions together</div>
      </div>
      <div class="buddy-actions">
        <button class="btn btn-ghost btn-sm" onclick="openChat('${c.id}')">💬</button>
        <button class="btn btn-primary btn-sm" onclick="goSessionCreateWith('${c.id}')">📅</button>
      </div>
    </div>`).join('');
}
document.getElementById('btn-back-buddies').onclick = () => goChats();

// ── Profile ───────────────────────────────────────────────────
function goProfile() { showPage('page-profile'); renderOwnProfile(); }
function renderOwnProfile() {
  const u = S.user;
  if (!u) return;
  document.getElementById('own-profile-content').innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar">${u.avatar || '👤'}</div>
      <div class="profile-name">${u.name}</div>
      ${u.education ? `<div class="profile-edu">${u.education}</div>` : ''}
      ${u.institution ? `<div class="profile-inst">${u.institution}</div>` : ''}
      <div class="profile-rating">⭐ ${u.rating || 'New'} &nbsp;•&nbsp; ${u.totalSessions || 0} sessions</div>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Studying</div>
      <div class="profile-subjects">${(u.subjects || []).map(s => `<span class="profile-subject-tag">${s}</span>`).join('') || '<span style="color:var(--text3)">No subjects set</span>'}</div>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Goal</div>
      <div>${u.goal || 'Not set'}</div>
    </div>
    <div class="profile-section">
      <div class="profile-section-label">Availability</div>
      <div class="profile-avail-pills">${(u.availability || []).map(a => `<span class="avail-pill">${a}</span>`).join('') || '<span style="color:var(--text3)">Not set</span>'}</div>
      <div style="margin-top:8px;font-size:13px;color:var(--text2)">Modes: ${(u.modes || []).map(modeLabel).join(', ') || 'Not set'}</div>
    </div>
    ${u.bio ? `<div class="profile-section"><div class="profile-section-label">About</div><div class="profile-bio">${u.bio}</div></div>` : ''}
    <div class="profile-section">
      <div class="profile-section-label">Activity</div>
      <div class="profile-stats-row">
        <div class="pstat"><div class="pstat-num">${S.stats.hours}</div><div class="pstat-lbl">Hrs studied</div></div>
        <div class="pstat"><div class="pstat-num">${S.connections.length}</div><div class="pstat-lbl">Buddies</div></div>
        <div class="pstat"><div class="pstat-num">${S.stats.streak}🔥</div><div class="pstat-lbl">Streak</div></div>
      </div>
    </div>
    <div class="profile-section" style="cursor:pointer" onclick="showModal('modal-edit-profile')">⚙️ Settings & Edit Profile</div>
    <div style="height:80px"></div>`;
}
document.getElementById('btn-edit-profile').onclick = () => openEditProfile();
function openEditProfile() {
  const u = S.user;
  if (!u) return;
  document.getElementById('edit-name').value = u.name || '';
  document.getElementById('edit-institution').value = u.institution || '';
  document.getElementById('edit-education').value = u.education || '';
  document.getElementById('edit-bio').value = u.bio || '';
  showModal('modal-edit-profile');
}
document.getElementById('btn-close-edit-profile').onclick = () => hideModal('modal-edit-profile');
document.getElementById('btn-save-edit-profile').onclick = () => {
  S.user.name = document.getElementById('edit-name').value.trim() || S.user.name;
  S.user.institution = document.getElementById('edit-institution').value.trim();
  S.user.education = document.getElementById('edit-education').value.trim();
  S.user.bio = document.getElementById('edit-bio').value.trim();
  save('user', S.user); hideModal('modal-edit-profile'); renderOwnProfile();
};
document.getElementById('btn-goto-settings').onclick = () => { hideModal('modal-edit-profile'); showPage('page-settings'); };

// ── Settings ──────────────────────────────────────────────────
document.getElementById('btn-back-settings').onclick = () => goProfile();
document.getElementById('btn-goto-edit-profile').onclick = () => { showPage('page-profile'); openEditProfile(); };
document.getElementById('btn-logout').onclick = () => {
  if (!confirm('Log out of StudySync?')) return;
  localStorage.clear(); S.user = null; S.connections = []; S.requests = { received: [], sent: [] }; S.chatThreads = {}; S.sessions = [];
  showPage('page-landing');
};

// ── Session Create ────────────────────────────────────────────
function goSessionCreate() {
  showPage('page-session-create');
  renderPartnerChips();
}
window.goSessionCreateWith = function (id) {
  const c = S.connections.find(x => x.id === id);
  S.currentBuddy = c || S.partners.find(x => x.id === id);
  goSessionCreate();
};
function renderPartnerChips() {
  const el = document.getElementById('partner-chips');
  if (!S.connections.length) { el.innerHTML = `<div style="color:var(--text3);font-size:13px;padding:4px">No buddies yet — find partners first</div>`; return; }
  const preset = S.currentBuddy && S.connections.find(c => c.id === S.currentBuddy.id) ? [S.currentBuddy] : S.connections;
  el.innerHTML = preset.slice(0, 4).map(c => `<div class="partner-chip" data-id="${c.id}">${c.avatar} ${c.name.split(' ')[0]}</div>`).join('');
}
document.getElementById('btn-back-session-create').onclick = () => { S.currentBuddy = null; showPage('page-home'); };
document.getElementById('btn-create-session').onclick = () => {
  const subject = document.getElementById('session-subject').value;
  const topic = document.getElementById('session-topic').value.trim();
  const mode = document.querySelector('input[name="smode"]:checked')?.value || 'silent';
  const when = document.getElementById('session-when').value;
  const duration = parseInt(document.getElementById('session-duration').value) / 60;
  if (!subject) { alert('Please select a subject.'); return; }
  const chips = document.querySelectorAll('.partner-chip');
  const partner = chips.length ? S.connections.find(c => c.id === chips[0].dataset.id) : S.connections[0];
  if (!partner && S.connections.length) { alert('Select a study partner.'); return; }
  const timeMap = { now: 'Now', today_eve: '7:00 PM', tomorrow: 'Tomorrow 6:00 PM' };
  const session = {
    id: 'sess_' + Date.now(), subject, topic, mode, duration,
    partnerId: partner?.id || '', partnerName: partner?.name || 'Solo',
    time: timeMap[when] || when, ts: when === 'now' ? Date.now() : Date.now() + 86400000,
  };
  S.sessions.unshift(session); save('sessions', S.sessions);
  addNotif('📅', 'Session scheduled!', `${subject} with ${session.partnerName} at ${session.time}`, '');
  if (partner) { S.chatThreads[partner.id] = S.chatThreads[partner.id] || []; S.chatThreads[partner.id].push({ from: 'System', text: `📅 Session scheduled: ${subject} at ${session.time}`, ts: Date.now(), mine: false, system: true }); save('chatThreads', S.chatThreads); }
  S.stats.hours = (S.stats.hours || 0) + duration; S.stats.days = Math.min(7, S.stats.days + 1); save('stats', S.stats);
  goLobby(session.id);
};

// ── Lobby ─────────────────────────────────────────────────────
window.goLobby = function (id) {
  const sess = S.sessions.find(s => s.id === id);
  if (!sess) return;
  S.activeSession = sess;
  document.getElementById('lobby-info').textContent = `${sess.subject} • ${modeLabel(sess.mode)} • ${sess.duration} hrs`;
  document.getElementById('lobby-countdown').textContent = 'Ready to start!';
  document.getElementById('lobby-you-name').textContent = S.user?.name || 'You';
  document.getElementById('lobby-partner-name').textContent = sess.partnerName;
  setTimeout(() => { document.getElementById('lobby-partner-ready').innerHTML = `<span>✅</span> <span>${sess.partnerName}</span> (Ready)`; }, 2000);
  showPage('page-session-lobby');
};
document.getElementById('btn-join-session').onclick = () => startActiveSession();
document.getElementById('btn-cancel-session').onclick = () => goHome();
function startActiveSession() {
  const sess = S.activeSession;
  if (!sess) return;
  document.getElementById('session-partner-bar').innerHTML = `
    <div class="session-partner-info">
      <div class="sp-avatar">${S.connections.find(c => c.id === sess.partnerId)?.avatar || '👤'}</div>
      <div><div class="sp-name">${sess.partnerName}</div><div class="sp-status">🟢 Studying</div></div>
    </div>
    <div class="sp-subject">${sess.subject}</div>`;
  const totalSecs = parseInt(sess.duration * 60 * 60) || 25 * 60;
  S.timer = { running: false, seconds: 25 * 60, total: 25 * 60, phase: 'focus', pomos: 0, interval: null };
  updateSessionTimer();
  showPage('page-session-active');
}
// Timer
function updateSessionTimer() {
  document.getElementById('session-time-display').textContent = fmtTime(S.timer.seconds);
  document.getElementById('session-phase').textContent = S.timer.phase === 'focus' ? '🎯 Focus Time' : '☕ Break Time';
  document.getElementById('session-pomo-count').textContent = `${S.timer.pomos} session${S.timer.pomos !== 1 ? 's' : ''} done`;
  const pct = S.timer.seconds / S.timer.total;
  const circ = 628.32;
  const el = document.getElementById('s-ring-fill');
  if (el) el.style.strokeDashoffset = circ * (1 - pct);
}
document.getElementById('btn-session-toggle').onclick = () => {
  const btn = document.getElementById('btn-session-toggle');
  if (S.timer.running) {
    clearInterval(S.timer.interval); S.timer.running = false; btn.textContent = '▶ Resume';
  } else {
    S.timer.running = true; btn.textContent = '⏸ Pause';
    S.timer.interval = setInterval(() => {
      S.timer.seconds--;
      updateSessionTimer();
      if (S.timer.seconds <= 0) {
        clearInterval(S.timer.interval); S.timer.running = false;
        if (S.timer.phase === 'focus') {
          S.timer.pomos++; S.timer.phase = 'break'; S.timer.seconds = 5 * 60; S.timer.total = 5 * 60;
        } else {
          S.timer.phase = 'focus'; S.timer.seconds = 25 * 60; S.timer.total = 25 * 60;
        }
        btn.textContent = '▶ Start'; updateSessionTimer();
      }
    }, 1000);
  }
};
document.getElementById('btn-session-break').onclick = () => {
  clearInterval(S.timer.interval); S.timer.running = false;
  S.timer.phase = 'break'; S.timer.seconds = 5 * 60; S.timer.total = 5 * 60;
  document.getElementById('btn-session-toggle').textContent = '▶ Start';
  updateSessionTimer();
};
document.getElementById('btn-session-end').onclick = () => endSession();
function endSession() {
  clearInterval(S.timer.interval); S.timer.running = false;
  const sess = S.activeSession;
  const hrs = sess?.duration || 1;
  document.getElementById('post-session-summary').textContent = `You studied for ${hrs} hour${hrs !== 1 ? 's' : ''} with ${sess?.partnerName || 'your buddy'}`;
  // star rating init
  document.querySelectorAll('.star-rating span').forEach((s, i) => { s.classList.remove('active'); });
  showModal('modal-post-session');
}
// Star rating
document.querySelectorAll('.star-rating span').forEach((star, i, arr) => {
  star.addEventListener('click', () => { arr.forEach((s, j) => s.classList.toggle('active', j <= i)); });
});
document.getElementById('btn-submit-post-session').onclick = () => {
  const notes = document.getElementById('post-session-notes').value;
  const sess = S.activeSession;
  S.stats.hours = (S.stats.hours || 0) + (sess?.duration || 1);
  S.stats.days = Math.min(7, (S.stats.days || 0) + 1);
  S.stats.streak = (S.stats.streak || 0) + 1;
  if (sess) {
    S.sessions = S.sessions.filter(s => s.id !== sess.id);
    const u = S.user; if (u) { u.totalSessions = (u.totalSessions || 0) + 1; u.rating = Math.min(5, (u.rating || 4.5)); save('user', u); }
  }
  save('stats', S.stats); save('sessions', S.sessions);
  addNotif('🔥', `${S.stats.streak}-day streak!`, 'Keep it up! Same time tomorrow?');
  S.activeSession = null; hideModal('modal-post-session'); goHome();
};

// ── Notifications ─────────────────────────────────────────────
function goNotifs() {
  showPage('page-notifications');
  S.notifications.forEach(n => n.unread = false);
  save('notifications', S.notifications);
  const dot = document.getElementById('notif-dot'); if (dot) dot.style.display = 'none';
  const el = document.getElementById('notifs-content');
  if (!S.notifications.length) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><div class="empty-title">No notifications</div><div class="empty-sub">Activity will show up here</div></div>`; return; }
  el.innerHTML = S.notifications.map(n => `
    <div class="notif-card">
      <div class="notif-icon">${n.icon}</div>
      <div class="notif-title">${n.title}</div>
      <div class="notif-body">${n.body}</div>
      <div class="notif-time">${fmtTs(n.ts)}</div>
      ${n.action ? `<div class="notif-action">${n.action} →</div>` : ''}
    </div>`).join('');
}
document.getElementById('btn-back-notifs').onclick = () => goHome();
document.getElementById('btn-mark-all-read').onclick = () => { S.notifications.forEach(n => n.unread = false); save('notifications', S.notifications); goNotifs(); };

// ── Start ─────────────────────────────────────────────────────
init();
