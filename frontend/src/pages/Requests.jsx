import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function Requests() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('received');
    const [received, setReceived] = useState([]);
    const [sent, setSent] = useState([]);

    const load = () => {
        API.get('/connections/requests/received').then(r => setReceived(r.data)).catch(() => { });
        API.get('/connections/requests/sent').then(r => setSent(r.data)).catch(() => { });
    };
    useEffect(() => { load(); }, []);

    const accept = async (id) => {
        await API.put(`/connections/${id}/accept`);
        load();
    };
    const decline = async (id) => {
        await API.put(`/connections/${id}/decline`);
        load();
    };

    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);

    return (
        <div className="page" id="page-requests">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate('/app/home')}>← Home</button>
                    <span className="page-title">Study Requests</span>
                </header>
                <div className="page-content">
                    <div className="tab-bar">
                        <button className={`tab-btn ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab('received')}>Received {received.length > 0 && <span className="req-badge">{received.length}</span>}</button>
                        <button className={`tab-btn ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>Sent</button>
                    </div>

                    {tab === 'received' && (received.length === 0
                        ? <div className="empty-state"><div className="empty-icon">🤝</div><div className="empty-title">No requests yet</div><div className="empty-sub">When someone sends you a study request, it'll appear here.</div></div>
                        : received.map(r => (
                            <div key={r.id} className="request-card">
                                <div className="req-card-top">
                                    <div className="req-card-avatar">{r.avatar || '👤'}</div>
                                    <div><div className="req-card-name">{r.name}</div><div className="req-card-match">⭐ {r.rating}</div></div>
                                </div>
                                <div className="req-info-row">📚 <strong>{r.subject}</strong> &nbsp;•&nbsp; {modeLabel(r.mode)}</div>
                                <div className="req-info-row">⏰ {r.scheduled_when} &nbsp;•&nbsp; {r.duration}</div>
                                {r.message && <div className="req-message">"{r.message}"</div>}
                                <div className="req-actions">
                                    <button className="btn btn-primary btn-sm" onClick={() => accept(r.id)}>Accept ✓</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => decline(r.id)}>Decline</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/partner/${r.user_id}`)}>Profile</button>
                                </div>
                            </div>
                        ))
                    )}

                    {tab === 'sent' && (sent.length === 0
                        ? <div className="empty-state"><div className="empty-icon">✉️</div><div className="empty-title">No sent requests</div><div className="empty-sub">Find partners and send study requests.</div></div>
                        : sent.map(r => (
                            <div key={r.id} className="request-card">
                                <div className="req-card-top">
                                    <div className="req-card-avatar">{r.avatar || '👤'}</div>
                                    <div><div className="req-card-name">{r.name}</div><span className={`req-status-chip ${r.status}`}>{r.status}</span></div>
                                </div>
                                <div className="req-info-row">📚 {r.subject} &nbsp;•&nbsp; {modeLabel(r.mode)}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
