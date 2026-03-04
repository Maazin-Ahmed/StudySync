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
    const [loading, setLoading] = useState(true);

    const hr = new Date().getHours();
    const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';

    useEffect(() => {
        Promise.all([
            API.get('/sessions').catch(() => ({ data: [] })),
            API.get('/buddies/requests/received').catch(() => ({ data: [] })),
        ]).then(([sess, reqs]) => {
            setSessions(sess.data);
            setReqCount(reqs.data.length);
        }).finally(() => setLoading(false));
    }, []);

    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);
    const fmtDate = ts => {
        const d = new Date(ts); const now = new Date();
        return d.toDateString() === now.toDateString() ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="page" id="page-home">
            <div className="app-layout">
                <header className="app-header">
                    <div className="app-header-left">
                        <span className="logo-icon-sm">📚</span>
                        <span className="app-header-title">StudySync</span>
                    </div>
                    <div className="app-header-right">
                        {reqCount > 0 && (
                            <button className="icon-btn" style={{ position: 'relative' }} onClick={() => navigate('/app/requests')}>
                                🤝 <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--error)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{reqCount}</span>
                            </button>
                        )}
                        <button className="icon-btn" onClick={() => navigate('/app/notifications')}>🔔</button>
                    </div>
                </header>

                <div className="page-content">
                    <div className="home-greeting">{greeting}, {user?.name?.split(' ')[0]}! 👋</div>
                    <div className="home-sub">Ready to study?</div>

                    <div className="home-quick-actions">
                        <button className="quick-btn" onClick={() => navigate('/app/find')}>
                            <span className="quick-icon">🔍</span><span>Find Partner</span>
                        </button>
                        <button className="quick-btn" onClick={() => navigate('/app/session/create')}>
                            <span className="quick-icon">⏱️</span><span>New Session</span>
                        </button>
                        <button className="quick-btn" onClick={() => navigate('/app/requests')} style={{ position: 'relative' }}>
                            <span className="quick-icon">🤝</span>
                            <span>Requests {reqCount > 0 && <span className="req-badge">{reqCount}</span>}</span>
                        </button>
                    </div>

                    <div className="section-label">📅 Upcoming Sessions</div>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[1, 2].map(i => <div key={i} className="session-card"><div className="skeleton skel-line w-40" /><div className="skeleton skel-line w-75" /><div className="skeleton skel-line w-50" /></div>)}
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="empty-state-sm">
                            No sessions yet. <span className="link" onClick={() => navigate('/app/find')}>Find a study buddy</span> to schedule your first session!
                        </div>
                    ) : (
                        sessions.slice(0, 3).map(s => (
                            <div key={s.id} className="session-card">
                                <div className="session-card-time">{fmtDate(s.scheduled_at)}</div>
                                <div className="session-card-subject">{s.subject}{s.topic ? ` — ${s.topic}` : ''}</div>
                                {s.partner_name && <div className="session-card-with">with {s.partner_name}</div>}
                                <div className="session-card-mode">{modeLabel(s.mode)} • {s.duration_hrs}h</div>
                                <div className="session-card-actions">
                                    {s.partner_id && <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/chats/${s.partner_id}`)}>💬 Chat</button>}
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/session/${s.id}/lobby`)}>Join →</button>
                                </div>
                            </div>
                        ))
                    )}

                    <div className="section-label" style={{ marginTop: 24 }}>📊 Your Stats</div>
                    <div className="week-stats">
                        <div className="wstat"><span className="wstat-num">{user?.streak || 0} 🔥</span><span className="wstat-lbl">Day Streak</span></div>
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
