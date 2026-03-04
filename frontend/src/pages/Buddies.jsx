import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function Buddies() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [buddies, setBuddies] = useState([]);

    useEffect(() => { API.get('/connections').then(r => setBuddies(r.data)).catch(() => { }); }, []);

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate('/app/chats')}>← Chats</button>
                    <span className="page-title">My Study Buddies</span>
                </header>
                <div className="page-content">
                    {buddies.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">🤝</div><div className="empty-title">No buddies yet</div><div className="empty-sub">Find partners and accept requests to build your buddy list!</div><button className="btn btn-primary btn-sm" onClick={() => navigate('/app/find')}>Find Partners</button></div>
                    ) : buddies.map(c => {
                        const partnerId = c.partner_id === user?.id ? c.user_id : c.partner_id;
                        return (
                            <div key={c.id} className="buddy-card">
                                <div className="buddy-avatar">{c.avatar}</div>
                                <div className="buddy-info">
                                    <div className="buddy-name">{c.name}</div>
                                    <div className="buddy-sub">{c.subject || ''}</div>
                                    <div className="buddy-sessions">{c.total_sessions || 0} sessions</div>
                                </div>
                                <div className="buddy-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/chats/${partnerId}`)}>💬</button>
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/session/create?partnerId=${partnerId}`)}>📅</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
