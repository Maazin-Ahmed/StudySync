import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import API from '../api';

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [reqCount, setReqCount] = useState(0);
    const hr = new Date().getHours();
    const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => {
        API.get('/sessions').then(r => setSessions(r.data)).catch(() => { });
        API.get('/connections/requests/received').then(r => setReqCount(r.data.length)).catch(() => { });
    }, []);

    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);
    const fmtDate = ts => { const d = new Date(ts); const now = new Date(); return d.toDateString() === now.toDateString() ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }); };

    return (
        <div className="page" id="page-home">
            <div className="app-layout">
                <header className="app-header">
                    <div className="app-header-left">
                        <span className="logo-icon-sm">📚</span>
                        <span className="app-header-title">StudySync</span>
                    </div>
                    <div className="app-header-right">
                        <button className="icon-btn" onClick={() => navigate('/app/notifications')}>🔔</button>
                    </div>
                </header>

                <div className="page-content">
                    <div className="home-greeting">{greeting}, {user?.name?.split(' ')[0]}! 👋</div>
                    <div className="home-sub">Ready to study?</div>

                    <div className="home-quick-actions">
                        <button className="quick-btn" onClick={() => navigate('/app/find')}><span className="quick-icon">🔍</span><span>Find Partner</span></button>
                        <button className="quick-btn" onClick={() => navigate('/app/session/create')}><span className="quick-icon">⏱️</span><span>New Session</span></button>
                        <button className="quick-btn" onClick={() => navigate('/app/requests')}>
                            <span className="quick-icon">🤝</span>
                            <span>Requests {reqCount > 0 && <span className="req-badge">{reqCount}</span>}</span>
                        </button>
                    </div>

                    <div className="section-label">📅 Upcoming Sessions</div>
                    {sessions.length === 0 ? (
                        <div className="empty-state-sm">
                            No sessions scheduled yet.<br />
                            <a href="#" className="link" onClick={e => { e.preventDefault(); navigate('/app/find'); }}>Find a study partner</a> to get started!
                        </div>
                    ) : (
                        sessions.slice(0, 3).map(s => (
                            <div key={s.id} className="session-card">
                                <div className="session-card-time">{fmtDate(s.scheduled_at)}</div>
                                <div className="session-card-subject">{s.subject}{s.topic ? ` — ${s.topic}` : ''}</div>
                                {s.partner_name && <div className="session-card-with">with {s.partner_name}</div>}
                                <div className="session-card-mode">{modeLabel(s.mode)} • {s.duration_hrs} hrs</div>
                                <div className="session-card-actions">
                                    {s.partner_id && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/chats/${s.partner_id}`)}>💬 Chat</button>}
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/session/${s.id}/lobby`)}>Join →</button>
                                </div>
                            </div>
                        ))
                    )}

                    <div className="section-label" style={{ marginTop: 24 }}>📊 Your Stats</div>
                    <div className="week-stats">
                        <div className="wstat"><span className="wstat-num">{user?.streak || 0}🔥</span><span className="wstat-lbl">Streak</span></div>
                        <div className="wstat"><span className="wstat-num">{user?.total_sessions || 0}</span><span className="wstat-lbl">Sessions</span></div>
                        <div className="wstat"><span className="wstat-num">{user?.rating > 0 ? user.rating : '—'}</span><span className="wstat-lbl">Rating</span></div>
                        <div className="wstat"><span className="wstat-num">{sessions.length}</span><span className="wstat-lbl">Upcoming</span></div>
                    </div>
                </div>
                <BottomNav />
            </div>
        </div>
    );
}
