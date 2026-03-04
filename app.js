/* ============================================================
   STUDYTOGETHER — APP LOGIC
   ============================================================ */

'use strict';

// ── SVG gradient for progress ring (injected into body) ──────
document.body.insertAdjacentHTML('afterbegin', `
  <svg style="position:absolute;width:0;height:0;overflow:hidden" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#7c6aff"/>
        <stop offset="100%" style="stop-color:#ff6ab0"/>
      </linearGradient>
    </defs>
  </svg>
`);

// ── State ────────────────────────────────────────────────────
const state = {
  user: null,           // { name, region, subject, avatar }
  currentRoom: null,    // room object
  rooms: [],
  subjectFilter: 'all',
  regionFilter: 'all',
  timer: {
    running: false,
    seconds: 25 * 60,
    total: 25 * 60,
    phase: 'focus',     // 'focus' | 'break'
    sessions: 0,
    interval: null,
  },
  chatMessages: [],
  musicOn: false,
  currentSound: 'lofi',
  audioCtx: null,
  audioNode: null,
};

// Emoji / flag map for regions
const REGION_FLAG = {
  'North America': '🇺🇸',
  'Europe': '🇬🇧',
  'South Asia': '🇮🇳',
  'East Asia': '🇯🇵',
  'Latin America': '🇧🇷',
  'Africa': '🇳🇬',
  'Oceania': '🇦🇺',
  'Other': '🌍',
};

// Demo avatar emojis
const AVATARS = ['🧑‍💻','👩‍🎓','👨‍🔬','👩‍🏫','🧠','📖','🎓','👩‍💻','🧑‍🎓','👨‍🏫'];

// Preset seed rooms
const SEED_ROOMS = [
  {
    id: 'r1', name: 'Calculus Finals Grind', subject: 'Mathematics',
    desc: 'Integration, series, limits — let\'s crush it together!',
    members: 14, timer: 25, region: 'North America',
    flags: ['🇺🇸','🇨🇦','🇬🇧','🇮🇳'], created: Date.now() - 3600000,
  },
  {
    id: 'r2', name: 'LeetCode Daily Session', subject: 'Computer Science',
    desc: 'Algorithms & DS practice. All levels welcome.',
    members: 22, timer: 45, region: 'East Asia',
    flags: ['🇯🇵','🇰🇷','🇨🇳','🇺🇸','🇩🇪'], created: Date.now() - 7200000,
  },
  {
    id: 'r3', name: 'Quantum Mechanics Study', subject: 'Physics',
    desc: 'Tackling Griffiths chapters 3-6. Bring your questions!',
    members: 8, timer: 60, region: 'Europe',
    flags: ['🇩🇪','🇫🇷','🇬🇧'], created: Date.now() - 1800000,
  },
  {
    id: 'r4', name: 'IELTS Writing Practice', subject: 'Languages',
    desc: 'Practice essays together, peer review, tips & tricks.',
    members: 11, timer: 25, region: 'South Asia',
    flags: ['🇮🇳','🇵🇰','🇧🇩','🇳🇬'], created: Date.now() - 5400000,
  },
  {
    id: 'r5', name: 'Organic Chemistry Help', subject: 'Chemistry',
    desc: 'Reaction mechanisms, arrow pushing, MCAT prep.',
    members: 6, timer: 45, region: 'North America',
    flags: ['🇺🇸','🇨🇦'], created: Date.now() - 900000,
  },
  {
    id: 'r6', name: 'Spanish Conversation',  subject: 'Languages',
    desc: '¡Practicamos juntos! B1-B2 level, all welcome.',
    members: 9, timer: 25, region: 'Latin America',
    flags: ['🇧🇷','🇲🇽','🇦🇷','🇪🇸'], created: Date.now() - 2700000,
  },
  {
    id: 'r7', name: 'ML Paper Reading Club', subject: 'Computer Science',
    desc: 'Reading "Attention Is All You Need" and beyond.',
    members: 16, timer: 90, region: 'Europe',
    flags: ['🇩🇪','🇬🇧','🇫🇷','🇮🇳','🇨🇳'], created: Date.now() - 10800000,
  },
  {
    id: 'r8', name: 'Shakespeare Deep Dive', subject: 'Literature',
    desc: 'Hamlet analysis — themes, characters, and context.',
    members: 5, timer: 25, region: 'Europe',
    flags: ['🇬🇧','🇺🇸'], created: Date.now() - 4500000,
  },
];

// ── Helpers ──────────────────────────────────────────────────
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
function timeAgo(ms) {
  const diff = Math.floor((Date.now() - ms) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}
function saveUser(u) { localStorage.setItem('st_user', JSON.stringify(u)); }
function loadUser() {
  try { return JSON.parse(localStorage.getItem('st_user')); }
  catch { return null; }
}

// ── Pages ────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById(id);
  if (page) { page.classList.remove('hidden'); page.classList.add('active'); }
}
function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function hideModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── User Profile ──────────────────────────────────────────────
function initUser() {
  state.user = loadUser();
  if (state.user) renderUserBadge();
}

function renderUserBadge() {
  const el = document.getElementById('user-badge');
  if (!el || !state.user) return;
  el.innerHTML = `
    <div class="badge-avatar">${state.user.avatar}</div>
    <span>${state.user.name}</span>
  `;
}

document.getElementById('btn-hero-start').addEventListener('click', () => showModal('modal-join'));
document.getElementById('btn-nav-signup').addEventListener('click', () => showModal('modal-join'));
document.getElementById('btn-nav-login').addEventListener('click', () => {
  if (state.user) { showPage('page-rooms'); loadRooms(); }
  else showModal('modal-join');
});
document.getElementById('btn-browse-rooms').addEventListener('click', () => {
  if (state.user) { showPage('page-rooms'); loadRooms(); }
  else showModal('modal-join');
});
document.getElementById('btn-modal-close').addEventListener('click', () => hideModal('modal-join'));

document.getElementById('btn-create-profile').addEventListener('click', () => {
  const name = document.getElementById('input-name').value.trim();
  const region = document.getElementById('input-region').value;
  const subject = document.getElementById('input-subject').value;
  if (!name) { alert('Please enter your name.'); return; }
  if (!region) { alert('Please select your region.'); return; }
  if (!subject) { alert('Please select your subject.'); return; }

  state.user = { name, region, subject, avatar: rand(AVATARS) };
  saveUser(state.user);
  hideModal('modal-join');
  renderUserBadge();
  loadRooms();
  showPage('page-rooms');
});

// ── Rooms ─────────────────────────────────────────────────────
function loadRooms() {
  // Merge seed rooms with any user-created rooms from localStorage
  const custom = JSON.parse(localStorage.getItem('st_custom_rooms') || '[]');
  state.rooms = [...SEED_ROOMS, ...custom];
  renderRooms();
}

function filteredRooms() {
  const search = (document.getElementById('room-search')?.value || '').toLowerCase();
  let rooms = state.rooms.filter(r => {
    const matchSubject = state.subjectFilter === 'all' || r.subject === state.subjectFilter;
    const regionKey = state.regionFilter === 'all' ? true : r.region.includes(state.regionFilter);
    const matchSearch = !search || r.name.toLowerCase().includes(search) || r.subject.toLowerCase().includes(search) || r.desc.toLowerCase().includes(search);
    return matchSubject && regionKey && matchSearch;
  });
  const sort = document.getElementById('sort-rooms')?.value || 'popular';
  if (sort === 'popular') rooms.sort((a, b) => b.members - a.members);
  else if (sort === 'new') rooms.sort((a, b) => b.created - a.created);
  else if (sort === 'small') rooms.sort((a, b) => a.members - b.members);
  return rooms;
}

function renderRooms() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;
  const rooms = filteredRooms();
  if (rooms.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3)">No rooms found. <button class="btn btn-primary btn-sm" onclick="openCreateRoom()">Create one?</button></div>`;
    return;
  }
  grid.innerHTML = rooms.map(r => `
    <div class="room-card" onclick="joinRoom('${r.id}')">
      <div class="card-top">
        <div class="card-subject-tag">${r.subject}</div>
        <div class="card-members">
          <div class="dot"></div>
          ${r.members + (state.user ? 1 : 0)} studying
        </div>
      </div>
      <div class="card-title">${r.name}</div>
      <div class="card-desc">${r.desc}</div>
      <div class="card-footer">
        <div class="card-flags">${r.flags.join(' ')}</div>
        <div class="card-timer">⏱ ${r.timer} min • ${timeAgo(r.created)}</div>
      </div>
    </div>
  `).join('');
}

// Filters
document.getElementById('subject-filters').addEventListener('click', e => {
  const item = e.target.closest('[data-filter]');
  if (!item) return;
  document.querySelectorAll('[data-filter]').forEach(i => i.classList.remove('active'));
  item.classList.add('active');
  state.subjectFilter = item.dataset.filter;
  renderRooms();
});

document.getElementById('region-filters').addEventListener('click', e => {
  const item = e.target.closest('[data-rfilter]');
  if (!item) return;
  document.querySelectorAll('[data-rfilter]').forEach(i => i.classList.remove('active'));
  item.classList.add('active');
  state.regionFilter = item.dataset.rfilter;
  renderRooms();
});

document.getElementById('room-search').addEventListener('input', renderRooms);
document.getElementById('sort-rooms').addEventListener('change', renderRooms);

// ── Create Room ───────────────────────────────────────────────
document.getElementById('btn-create-room').addEventListener('click', openCreateRoom);
function openCreateRoom() {
  if (!state.user) { showModal('modal-join'); return; }
  showModal('modal-create-room');
}
document.getElementById('btn-close-create-room').addEventListener('click', () => hideModal('modal-create-room'));

document.getElementById('btn-confirm-create-room').addEventListener('click', () => {
  const name = document.getElementById('cr-name').value.trim();
  const subject = document.getElementById('cr-subject').value;
  const desc = document.getElementById('cr-desc').value.trim() || 'A focused study session.';
  const timer = parseInt(document.getElementById('cr-timer').value, 10);

  if (!name) { alert('Please enter a room name.'); return; }

  const newRoom = {
    id: 'cr_' + Date.now(),
    name, subject, desc, timer,
    members: 1,
    region: state.user.region.split(' ').slice(1).join(' ') || 'Other',
    flags: [REGION_FLAG[state.user.region.split(' ').slice(1).join(' ')] || '🌍'],
    created: Date.now(),
    isOwner: true,
  };

  // Save to localStorage
  const custom = JSON.parse(localStorage.getItem('st_custom_rooms') || '[]');
  custom.push(newRoom);
  localStorage.setItem('st_custom_rooms', JSON.stringify(custom));

  hideModal('modal-create-room');
  loadRooms();
  joinRoom(newRoom.id);
});

// ── Join Room ─────────────────────────────────────────────────
window.joinRoom = function(id) {
  const room = state.rooms.find(r => r.id === id);
  if (!room) return;
  state.currentRoom = room;

  // Reset timer
  resetTimer(room.timer * 60);

  // Init chat with some seed messages
  state.chatMessages = generateSeedChat(room);

  // Setup room UI
  document.getElementById('room-name-display').textContent = room.name;
  document.getElementById('room-desc-display').textContent = room.desc;
  document.getElementById('room-subject-tag').textContent = room.subject;

  showPage('page-room');
  renderParticipants();
  renderChat();
  updateTimerUI();
};

// ── Participants ──────────────────────────────────────────────
const FAKE_NAMES = [
  ['Alex K.','North America','🇺🇸'],['Yuki T.','East Asia','🇯🇵'],['Priya S.','South Asia','🇮🇳'],
  ['Lena M.','Europe','🇩🇪'],['Carlos R.','Latin America','🇧🇷'],['Amara D.','Africa','🇳🇬'],
  ['Sophie L.','Europe','🇫🇷'],['Jin W.','East Asia','🇰🇷'],['Omar F.','Other','🌍'],
  ['Emma H.','North America','🇨🇦'],['Aarav P.','South Asia','🇮🇳'],['Mia B.','Europe','🇬🇧'],
];

const TASKS = [
  'Working on derivatives','Practicing arrays','Reading chapter 4','Writing essay',
  'Solving past papers','Reviewing notes','Watching lecture replay','Doing flashcards',
];

function generateParticipants(room) {
  const count = Math.min(room.members + 1, 12);
  const participants = [];
  // Add self
  if (state.user) {
    participants.push({
      name: state.user.name, region: state.user.region, avatar: state.user.avatar,
      task: document.getElementById('my-task')?.value || 'Getting started…', isSelf: true,
      focusing: true,
    });
  }
  // Add bots
  const names = [...FAKE_NAMES].sort(() => Math.random() - 0.5).slice(0, count - 1);
  names.forEach(([name, , flag]) => {
    participants.push({
      name, region: flag, avatar: rand(AVATARS),
      task: rand(TASKS), isSelf: false,
      focusing: Math.random() > 0.3,
    });
  });
  return participants;
}

function renderParticipants() {
  const list = document.getElementById('participants-list');
  if (!list || !state.currentRoom) return;
  const parts = generateParticipants(state.currentRoom);
  const focusing = parts.filter(p => p.focusing).length;
  document.getElementById('participant-count').textContent = parts.length;
  document.getElementById('active-label').textContent = `${focusing} focusing`;

  list.innerHTML = parts.map(p => `
    <div class="participant-item">
      <div class="p-avatar">${p.avatar}</div>
      <div class="p-info">
        <div class="p-name">${p.name} ${p.isSelf ? '<span style="color:var(--primary-light);font-size:11px">(you)</span>' : ''}</div>
        <div class="p-region">${p.region}</div>
        <div class="p-task">${p.isSelf ? (document.getElementById('my-task')?.value || 'Getting started…') : p.task}</div>
      </div>
      <div class="p-status">${p.focusing ? '🟢' : '☕'}</div>
    </div>
  `).join('');
}

document.getElementById('my-task').addEventListener('input', () => renderParticipants());

// ── Pomodoro Timer ────────────────────────────────────────────
function resetTimer(totalSeconds) {
  clearInterval(state.timer.interval);
  state.timer.running = false;
  state.timer.seconds = totalSeconds || state.currentRoom?.timer * 60 || 25 * 60;
  state.timer.total = state.timer.seconds;
  state.timer.phase = 'focus';
  updateTimerUI();
  document.getElementById('btn-timer-toggle').textContent = '▶ Start';
}

function updateTimerUI() {
  document.getElementById('timer-display').textContent = formatTime(state.timer.seconds);
  document.getElementById('timer-phase').textContent =
    state.timer.phase === 'focus' ? '🎯 Focus Time' : '☕ Break Time';

  const progress = state.timer.seconds / state.timer.total;
  const circumference = 565.49;
  const offset = circumference * (1 - progress);
  const ring = document.getElementById('ring-fill');
  if (ring) ring.style.strokeDashoffset = offset;

  document.getElementById('session-count').textContent = state.timer.sessions;
}

document.getElementById('btn-timer-toggle').addEventListener('click', () => {
  if (state.timer.running) {
    clearInterval(state.timer.interval);
    state.timer.running = false;
    document.getElementById('btn-timer-toggle').textContent = '▶ Resume';
  } else {
    state.timer.running = true;
    document.getElementById('btn-timer-toggle').textContent = '⏸ Pause';
    state.timer.interval = setInterval(() => {
      state.timer.seconds--;
      updateTimerUI();
      if (state.timer.seconds <= 0) {
        clearInterval(state.timer.interval);
        state.timer.running = false;
        if (state.timer.phase === 'focus') {
          state.timer.sessions++;
          state.timer.phase = 'break';
          state.timer.seconds = 5 * 60;
          state.timer.total = 5 * 60;
          addSystemChat('⏰ Focus session complete! Take a 5-minute break.');
        } else {
          state.timer.phase = 'focus';
          state.timer.seconds = (state.currentRoom?.timer || 25) * 60;
          state.timer.total = state.timer.seconds;
          addSystemChat('🎯 Break\'s over! New focus session starting.');
        }
        document.getElementById('btn-timer-toggle').textContent = '▶ Start';
        updateTimerUI();
      }
    }, 1000);
  }
});

document.getElementById('btn-timer-reset').addEventListener('click', () => {
  resetTimer((state.currentRoom?.timer || 25) * 60);
});

// ── Chat ──────────────────────────────────────────────────────
function generateSeedChat(room) {
  const msgs = [
    { from: FAKE_NAMES[0][0], text: `Hey everyone! Let's have a productive session 💪`, flag: FAKE_NAMES[0][2], time: Date.now() - 600000 },
    { from: FAKE_NAMES[1][0], text: `Ready to go! Started on ${rand(TASKS).toLowerCase()}`, flag: FAKE_NAMES[1][2], time: Date.now() - 480000 },
    { from: FAKE_NAMES[2][0], text: `Anyone want to share resources for ${room.subject}?`, flag: FAKE_NAMES[2][2], time: Date.now() - 300000 },
    { from: FAKE_NAMES[3][0], text: `Check out https://khan-academy.org for free content!`, flag: FAKE_NAMES[3][2], time: Date.now() - 120000 },
    { system: true, text: `You joined the room 🎉` },
  ];
  return msgs;
}

function formatChatTime(ts) {
  if (!ts) return 'now';
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

function addSystemChat(text) {
  state.chatMessages.push({ system: true, text });
  renderChat();
}

function renderChat() {
  const container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = state.chatMessages.map(m => {
    if (m.system) {
      return `<div style="text-align:center;font-size:12px;color:var(--text3);padding:4px 0">${m.text}</div>`;
    }
    const isMine = m.isMine;
    return `
      <div class="chat-msg ${isMine ? 'mine' : ''}">
        <div class="chat-avatar ${isMine ? 'chat-mine-avatar' : ''}">${m.avatar || m.flag || '👤'}</div>
        <div class="chat-bubble-wrap ${isMine ? 'mine-wrap' : ''}">
          ${!isMine ? `<div class="chat-sender">${m.from} ${m.flag || ''}</div>` : ''}
          <div class="chat-bubble">${m.text}</div>
          <div class="chat-time">${formatChatTime(m.time)}</div>
        </div>
      </div>
    `;
  }).join('');
  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  state.chatMessages.push({
    from: state.user?.name || 'You',
    text,
    avatar: state.user?.avatar || '😊',
    isMine: true,
    time: Date.now(),
  });
  input.value = '';
  renderChat();

  // Simulate a reply after a short delay
  if (Math.random() > 0.5) {
    setTimeout(() => {
      const responder = rand(FAKE_NAMES);
      const replies = ['Good point! 👍', 'I was thinking the same thing.', `Interesting! Let me check that.`, `Thanks for sharing! 🙏`, `Keep it up! 💪`, `Agreed! Focus mode 🎯`];
      state.chatMessages.push({
        from: responder[0], flag: responder[2], text: rand(replies),
        avatar: rand(AVATARS), time: Date.now(),
      });
      renderChat();
    }, 1500 + Math.random() * 2000);
  }
}

document.getElementById('btn-send-chat').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendMessage();
});

// ── Back Button ───────────────────────────────────────────────
document.getElementById('btn-back-rooms').addEventListener('click', () => {
  clearInterval(state.timer.interval);
  state.timer.running = false;
  stopMusic();
  showPage('page-rooms');
});

// ── Logo click to go home ─────────────────────────────────────
document.querySelectorAll('.nav-logo').forEach(el => {
  el.addEventListener('click', () => {
    clearInterval(state.timer.interval);
    state.timer.running = false;
    stopMusic();
    showPage('page-landing');
  });
});

// ── Focus Music (Web Audio API) ───────────────────────────────
function generateLofiTone() {
  if (!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const ctx = state.audioCtx;

  // Rain / ambient texture using filtered noise
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  const soundMap = {
    lofi: () => {
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.04;
    },
    rain: () => {
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.08;
    },
    cafe: () => {
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.03;
    },
    whitenoise: () => {
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.1;
    },
  };

  (soundMap[state.currentSound] || soundMap.lofi)();

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = state.currentSound === 'lofi' ? 'lowpass' : 'bandpass';
  filter.frequency.value = state.currentSound === 'whitenoise' ? 2000 : 600;
  filter.Q.value = 0.7;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 1.5);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  state.audioNode = { source, gain };
  return gain;
}

function startMusic() {
  stopMusic();
  generateLofiTone();
  state.musicOn = true;
}

function stopMusic() {
  if (state.audioNode) {
    try {
      state.audioNode.gain.gain.linearRampToValueAtTime(0, state.audioCtx.currentTime + 0.5);
      setTimeout(() => { try { state.audioNode.source.stop(); } catch(e){} }, 600);
    } catch(e) {}
    state.audioNode = null;
  }
  state.musicOn = false;
}

document.getElementById('music-toggle').addEventListener('change', e => {
  if (e.target.checked) startMusic();
  else stopMusic();
});

document.getElementById('music-options').addEventListener('click', e => {
  const btn = e.target.closest('.music-btn');
  if (!btn) return;
  document.querySelectorAll('.music-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.currentSound = btn.dataset.sound;
  if (state.musicOn) startMusic();
});

// ── Auto-refresh participants liveness ────────────────────────
setInterval(() => {
  if (document.getElementById('page-room') && !document.getElementById('page-room').classList.contains('hidden')) {
    // Gently fluctuate member counts
    if (state.currentRoom && Math.random() > 0.7) {
      const delta = Math.random() > 0.5 ? 1 : -1;
      state.currentRoom.members = Math.max(2, state.currentRoom.members + delta);
    }
  }
}, 8000);

// ── Init ──────────────────────────────────────────────────────
initUser();
