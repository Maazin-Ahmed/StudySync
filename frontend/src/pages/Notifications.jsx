import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function Notifications() {
    const navigate = useNavigate();
    const [notifs, setNotifs] = useState([]);

    useEffect(() => {
        API.get('/notifications').then(r => setNotifs(r.data)).catch(() => { });
    }, []);

    const markAll = async () => {
        await API.put('/notifications/read-all').catch(() => { });
        setNotifs(n => n.map(x => ({ ...x, is_read: true })));
    };

    const fmtTs = ts => { const d = new Date(ts); const p = n => String(n).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; };

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate('/app/home')}>← Back</button>
                    <span className="page-title">Notifications</span>
                    <button className="text-btn" onClick={markAll}>Mark All Read</button>
                </header>
                <div className="page-content">
                    {notifs.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">🔔</div><div className="empty-title">No notifications</div><div className="empty-sub">Activity will show up here</div></div>
                    ) : notifs.map(n => (
                        <div key={n.id} className={`notif-card ${!n.is_read ? 'unread' : ''}`}>
                            <div className="notif-icon">{n.icon}</div>
                            <div className="notif-title">{n.title}</div>
                            <div className="notif-body">{n.body}</div>
                            <div className="notif-time">{fmtTs(n.created_at)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
