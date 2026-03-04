import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const CATEGORY_LABELS = {
    active: { label: 'Active Buddies', color: 'var(--success)', desc: 'Studied in last 2 weeks' },
    occasional: { label: 'Occasional Buddies', color: 'var(--warning)', desc: 'Study monthly' },
    inactive: { label: 'Inactive Buddies', color: 'var(--text-3)', desc: 'No sessions in 30+ days' },
};

function categorizeBuddy(b) {
    if (!b.last_session_at) return 'inactive';
    const daysSince = (Date.now() - new Date(b.last_session_at)) / (1000 * 60 * 60 * 24);
    if (daysSince <= 14) return 'active';
    if (daysSince <= 30) return 'occasional';
    return 'inactive';
}

export default function Buddies() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [buddies, setBuddies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/buddies').then(r => setBuddies(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const grouped = buddies.reduce((acc, b) => {
        const cat = categorizeBuddy(b);
        (acc[cat] = acc[cat] || []).push(b);
        return acc;
    }, {});

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate('/app/chats')}>← Chats</button>
                    <span className="page-title">My Study Buddies</span>
                    <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 600 }}>{buddies.length} total</span>
                </header>
                <div className="page-content">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="buddy-card">
                                <div className="skeleton skel-circle" style={{ width: 44, height: 44 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton skel-line w-50" style={{ marginBottom: 8 }} />
                                    <div className="skeleton skel-line w-75" />
                                </div>
                            </div>
                        ))
                    ) : buddies.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🤝</div>
                            <div className="empty-title">No study buddies yet</div>
                            <div className="empty-sub">Find partners and send buddy requests to build your study circle!</div>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/find')}>Find Partners</button>
                        </div>
                    ) : (
                        ['active', 'occasional', 'inactive'].map(cat => {
                            const list = grouped[cat];
                            if (!list?.length) return null;
                            const meta = CATEGORY_LABELS[cat];
                            return (
                                <div key={cat}>
                                    <div className="section-label" style={{ color: meta.color }}>
                                        {meta.label} ({list.length})
                                        <span style={{ marginLeft: 6, color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— {meta.desc}</span>
                                    </div>
                                    {list.map(c => {
                                        const partnerId = c.buddy_id === user?.id ? c.user_id : c.buddy_id;
                                        return (
                                            <div key={c.id} className="buddy-card" onClick={() => navigate(`/app/partner/${partnerId}`)}>
                                                <div className="buddy-avatar">{c.avatar}</div>
                                                <div className="buddy-info">
                                                    <div className="buddy-name">{c.name}</div>
                                                    <div className="buddy-sub">{c.institution || ''}</div>
                                                    <div className="buddy-sessions">
                                                        {c.sessions_together > 0 ? `${c.sessions_together} sessions together` : 'No sessions yet'}
                                                        {c.sessions_together > 0 && ` • ${Number(c.hours_together).toFixed(1)}h`}
                                                    </div>
                                                </div>
                                                <div className="buddy-actions" onClick={e => e.stopPropagation()}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/chats/${partnerId}`)}>💬</button>
                                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/session/create?partnerId=${partnerId}`)}>📅</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
