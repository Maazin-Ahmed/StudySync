import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import API from '../api';

export default function ChatList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [buddies, setBuddies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        API.get('/buddies').then(r => setBuddies(r.data)).catch(() => { }).finally(() => setLoading(false));
    }, []);

    const fmtRelTime = ts => {
        const d = new Date(ts); const now = new Date();
        const diffMs = now - d; const diffH = Math.floor(diffMs / 3600000);
        if (diffH < 1) return 'Just now';
        if (diffH < 24) return `${diffH}h ago`;
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="page" id="page-chats">
            <div className="app-layout">
                <header className="app-header">
                    <span className="page-title">Chats</span>
                    <button className="text-btn" onClick={() => navigate('/app/buddies')}>All Buddies</button>
                </header>
                <div className="page-content">
                    {loading ? (
                        [1, 2, 3].map(i => (
                            <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                                <div className="skeleton skel-circle" style={{ width: 48, height: 48, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div className="skeleton skel-line w-40" style={{ marginBottom: 8 }} />
                                    <div className="skeleton skel-line w-75" />
                                </div>
                            </div>
                        ))
                    ) : buddies.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">💬</div>
                            <div className="empty-title">No chats yet</div>
                            <div className="empty-sub">Accept a study buddy request to unlock messaging with them.</div>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/find')}>Find Study Buddies</button>
                        </div>
                    ) : (
                        buddies.map(c => {
                            const partnerId = c.buddy_id === user?.id ? c.user_id : c.buddy_id;
                            const isRecent = c.last_active_at && (new Date() - new Date(c.last_active_at)) < 5 * 60 * 1000;
                            return (
                                <div key={c.id} className="chat-list-item" onClick={() => navigate(`/app/chats/${partnerId}`)}>
                                    <div className="cl-avatar">
                                        {c.avatar}
                                        {isRecent && <div className="cl-online" />}
                                    </div>
                                    <div className="cl-info">
                                        <div className="cl-name">{c.name}</div>
                                        <div className="cl-preview">{c.subject ? `Studying ${c.subject}` : 'Tap to start chatting'}</div>
                                    </div>
                                    <div className="cl-meta">
                                        <div className="cl-time">{fmtRelTime(c.created_at)}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <BottomNav />
            </div>
        </div>
    );
}
