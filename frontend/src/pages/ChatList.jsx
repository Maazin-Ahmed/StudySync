import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import API from '../api';

export default function ChatList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [buddies, setBuddies] = useState([]);

    useEffect(() => {
        API.get('/connections').then(r => setBuddies(r.data)).catch(() => { });
    }, []);

    const pad2 = n => String(n).padStart(2, '0');
    const fmtTs = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

    return (
        <div className="page" id="page-chats">
            <div className="app-layout">
                <header className="app-header">
                    <span className="page-title">Chats</span>
                    <button className="text-btn" onClick={() => navigate('/app/buddies')}>My Buddies</button>
                </header>
                <div className="page-content">
                    {buddies.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">💬</div>
                            <div className="empty-title">No chats yet</div>
                            <div className="empty-sub">Accept a study request to start chatting</div>
                            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/find')}>Find Partners</button>
                        </div>
                    ) : (
                        buddies.map(c => {
                            const partnerId = c.partner_id === user?.id ? c.user_id : c.partner_id;
                            return (
                                <div key={c.id} className="chat-list-item" onClick={() => navigate(`/app/chats/${partnerId}`)}>
                                    <div className="cl-avatar">{c.avatar}<div className="cl-online" /></div>
                                    <div className="cl-info">
                                        <div className="cl-name">{c.name}</div>
                                        <div className="cl-preview">Tap to continue conversation</div>
                                    </div>
                                    <div className="cl-meta">
                                        <div className="cl-time">{fmtTs(c.created_at || Date.now())}</div>
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
