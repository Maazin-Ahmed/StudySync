import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';

export default function Requests() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('received');
    const [received, setReceived] = useState([]);
    const [sent, setSent] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = () => {
        setLoading(true);
        Promise.all([
            API.get('/buddies/requests/received').catch(() => ({ data: [] })),
            API.get('/buddies/requests/sent').catch(() => ({ data: [] })),
        ]).then(([r, s]) => { setReceived(r.data); setSent(s.data); }).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const accept = async (id) => { await API.put(`/buddies/${id}/accept`); load(); };
    const decline = async (id) => { await API.put(`/buddies/${id}/decline`); load(); };
    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);

    return (
        <div className="page" id="page-requests">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate('/app/home')}>← Home</button>
                    <span className="page-title">Study Buddy Requests</span>
                </header>
                <div className="page-content">
                    <div className="tab-bar">
                        <button className={`tab-btn ${tab === 'received' ? 'active' : ''}`} onClick={() => setTab('received')}>
                            Received {received.length > 0 && <span className="req-badge">{received.length}</span>}
                        </button>
                        <button className={`tab-btn ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
                            Sent
                        </button>
                    </div>

                    {loading ? (
                        [1, 2].map(i => (
                            <div key={i} className="request-card">
                                <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                                    <div className="skeleton skel-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}><div className="skeleton skel-line w-50" /><div className="skeleton skel-line w-40" /></div>
                                </div>
                                <div className="skeleton skel-line w-75" />
                            </div>
                        ))
                    ) : tab === 'received' ? (
                        received.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">🤝</div>
                                <div className="empty-title">No requests yet</div>
                                <div className="empty-sub">When someone wants to be your study buddy, their request will appear here.</div>
                            </div>
                        ) : received.map(r => (
                            <div key={r.id} className="request-card">
                                <div className="req-card-top">
                                    <div className="req-card-avatar">{r.avatar || '👤'}</div>
                                    <div>
                                        <div className="req-card-name">{r.name}</div>
                                        <div className="req-card-match">{r.institution} &nbsp;•&nbsp; ⭐ {r.rating}</div>
                                    </div>
                                </div>
                                <div className="req-info-row">📚 <strong>{r.subject}</strong> &nbsp;•&nbsp; {modeLabel(r.mode)}</div>
                                <div className="req-info-row">⏰ {r.scheduled_when} &nbsp;•&nbsp; {r.duration}</div>
                                {r.message && <div className="req-message">"{r.message}"</div>}
                                <div className="req-actions">
                                    <button className="btn btn-primary btn-sm" onClick={() => accept(r.id)}>✓ Accept</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => decline(r.id)}>Decline</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/partner/${r.user_id}`)}>View Profile</button>
                                </div>
                            </div>
                        ))
                    ) : (
                        sent.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">✉️</div>
                                <div className="empty-title">No sent requests</div>
                                <div className="empty-sub">Find study partners and send them a buddy request to get started.</div>
                                <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/find')}>Find Partners</button>
                            </div>
                        ) : sent.map(r => (
                            <div key={r.id} className="request-card">
                                <div className="req-card-top">
                                    <div className="req-card-avatar">{r.avatar || '👤'}</div>
                                    <div>
                                        <div className="req-card-name">{r.name}</div>
                                        <span className={`req-status-chip ${r.status}`}>{r.status === 'pending' ? '⏳ Pending' : r.status === 'accepted' ? '✅ Accepted' : r.status}</span>
                                    </div>
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
