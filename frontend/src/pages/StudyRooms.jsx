import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import API from '../api';

const PERM_META = {
    open: { icon: '🌍', label: 'OPEN ROOM', color: 'var(--success)', bg: 'var(--success-bg)', cta: 'Join Room' },
    link: { icon: '🔗', label: 'LINK ACCESS', color: 'var(--primary)', bg: 'var(--primary-subtle)', cta: 'Join via Link' },
    request: { icon: '🚪', label: 'REQUEST TO JOIN', color: 'var(--warning)', bg: 'var(--warning-bg)', cta: 'Request to Join' },
    private: { icon: '🔒', label: 'PRIVATE', color: 'var(--text-3)', bg: 'var(--surface-2)', cta: '' },
};
const MODE_LABEL = { silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' };

export default function StudyRooms() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tab, setTab] = useState('browse');
    const [rooms, setRooms] = useState([]);
    const [myData, setMyData] = useState({ hosting: [], joined: [], invitations: [] });
    const [loading, setLoading] = useState(true);
    const [subjectFilter, setSubjectFilter] = useState('');
    const [modeFilter, setModeFilter] = useState('');
    const [requestModal, setRequestModal] = useState(null); // room to request join
    const [reqMsg, setReqMsg] = useState('');
    const [joining, setJoining] = useState(null);

    const loadBrowse = () => {
        setLoading(true);
        const params = {};
        if (subjectFilter) params.subject = subjectFilter;
        if (modeFilter) params.mode = modeFilter;
        API.get('/rooms', { params }).then(r => setRooms(r.data)).catch(() => { }).finally(() => setLoading(false));
    };

    const loadMy = () => {
        setLoading(true);
        API.get('/rooms/my').then(r => setMyData(r.data)).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => { if (tab === 'browse') loadBrowse(); else loadMy(); }, [tab]);
    useEffect(() => { if (tab === 'browse') loadBrowse(); }, [subjectFilter, modeFilter]);

    const joinOpen = async (room) => {
        setJoining(room.id);
        try {
            await API.post(`/rooms/${room.id}/join`);
            navigate(`/app/rooms/${room.id}/lobby`);
        } catch (e) { alert(e.response?.data?.error || 'Failed to join'); }
        setJoining(null);
    };

    const sendRequest = async () => {
        try {
            const r = await API.post(`/rooms/${requestModal.id}/request`, { message: reqMsg });
            if (r.data.status === 'approved') navigate(`/app/rooms/${requestModal.id}/lobby`);
            else { alert('✅ Request sent! You\'ll be notified when approved.'); setRequestModal(null); }
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    };

    const acceptInvite = async (inv) => {
        try {
            await API.put(`/rooms/invitations/${inv.id}/accept`);
            navigate(`/app/rooms/${inv.room_id}/lobby`);
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    };

    const declineInvite = async (inv) => {
        await API.put(`/rooms/invitations/${inv.id}/decline`).catch(() => { });
        loadMy();
    };

    const fmtTime = ts => {
        const d = new Date(ts); const now = new Date();
        const diffMs = now - d;
        if (diffMs > 0) return `Started ${Math.floor(diffMs / 60000)}m ago`;
        const mins = Math.floor(-diffMs / 60000);
        if (mins < 60) return `Starts in ${mins}m`;
        return `Starts ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const RoomCard = ({ room }) => {
        const meta = PERM_META[room.permission] || PERM_META.open;
        const isFull = room.capacity && room.participant_count >= room.capacity;
        return (
            <div className="partner-card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30`, borderRadius: 20, padding: '3px 10px', letterSpacing: 0.4 }}>
                        {meta.icon} {meta.label}
                    </span>
                    {isFull && <span style={{ fontSize: 12, color: 'var(--error)', fontWeight: 600, background: 'var(--error-bg)', borderRadius: 20, padding: '2px 8px' }}>FULL</span>}
                    {room.status === 'active' && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, background: 'var(--success-bg)', borderRadius: 20, padding: '2px 8px' }}>🟢 LIVE</span>}
                </div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{room.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>{MODE_LABEL[room.mode]}</span>
                    <span>•</span><span>👥 {room.participant_count}{room.capacity ? `/${room.capacity}` : ''} studying</span>
                    <span>•</span><span>⏱️ {fmtTime(room.scheduled_at)}</span>
                </div>
                {room.subject && <div className="pc-tags" style={{ marginBottom: 8 }}><span className="pc-tag">📚 {room.subject}</span></div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 22 }}>{room.host_avatar}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Hosted by <strong>{room.host_name}</strong> &nbsp;⭐ {room.host_rating}</span>
                </div>
                <div className="pc-actions">
                    {room.permission === 'open' && !isFull && (
                        <button className="btn btn-primary btn-sm" disabled={joining === room.id} onClick={() => joinOpen(room)}>
                            {joining === room.id ? 'Joining...' : '→ Join Now'}
                        </button>
                    )}
                    {room.permission === 'request' && !isFull && (
                        <button className="btn btn-outline btn-sm" onClick={() => setRequestModal(room)}>🚪 Request to Join</button>
                    )}
                    {isFull && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Room is full</span>}
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/partner/${room.host_id}`)}>View Host</button>
                </div>
            </div>
        );
    };

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <span className="page-title">Study Rooms</span>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/rooms/create')}>+ Create Room</button>
                </header>
                <div className="page-content">
                    <div className="tab-bar">
                        <button className={`tab-btn ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse Rooms</button>
                        <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>
                            My Rooms {myData.invitations.length > 0 && <span className="req-badge">{myData.invitations.length}</span>}
                        </button>
                    </div>

                    {tab === 'browse' && (
                        <>
                            <div className="find-filters" style={{ marginBottom: 16 }}>
                                <div className="filter-row">
                                    <div className="form-group half">
                                        <label>Subject</label>
                                        <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}>
                                            <option value="">All Subjects</option>
                                            {['Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'GATE Prep', 'CAT Prep', 'UPSC', 'JEE / NEET', 'English / IELTS', 'Business'].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group half">
                                        <label>Mode</label>
                                        <select value={modeFilter} onChange={e => setModeFilter(e.target.value)}>
                                            <option value="">Any Mode</option>
                                            <option value="silent">🤫 Silent</option>
                                            <option value="discussion">💬 Discussion</option>
                                            <option value="doubt">❓ Doubt Clearing</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            {loading ? (
                                [1, 2, 3].map(i => <div key={i} className="partner-card"><div className="skeleton skel-line w-40" /><div className="skeleton skel-line w-75" /><div className="skeleton skel-line w-50" /></div>)
                            ) : rooms.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🏠</div>
                                    <div className="empty-title">No active rooms</div>
                                    <div className="empty-sub">Be the first to create a study room and invite others!</div>
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/rooms/create')}>Create Room</button>
                                </div>
                            ) : (
                                <>
                                    <div className="section-label">{rooms.length} rooms active {subjectFilter ? `for ${subjectFilter}` : ''}</div>
                                    {rooms.map(r => <RoomCard key={r.id} room={r} />)}
                                </>
                            )}
                        </>
                    )}

                    {tab === 'my' && (
                        <>
                            {/* Invitations */}
                            {myData.invitations.length > 0 && (
                                <>
                                    <div className="section-label" style={{ color: 'var(--primary)' }}>💌 Invitations ({myData.invitations.length})</div>
                                    {myData.invitations.map(inv => (
                                        <div key={inv.id} className="partner-card" style={{ borderLeft: '3px solid var(--primary)' }}>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                                                <span style={{ fontSize: 26 }}>{inv.inviter_avatar}</span>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{inv.inviter_name} invited you</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>🔒 Private Session</div>
                                                </div>
                                            </div>
                                            <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{inv.room_name}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>{inv.subject ? `📚 ${inv.subject}` : ''} &nbsp;• {MODE_LABEL[inv.mode]}</div>
                                            {inv.message && <div className="req-message">"{inv.message}"</div>}
                                            <div className="pc-actions" style={{ marginTop: 12 }}>
                                                <button className="btn btn-primary btn-sm" onClick={() => acceptInvite(inv)}>✓ Accept</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => declineInvite(inv)}>Decline</button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Hosting */}
                            {myData.hosting.length > 0 && (
                                <>
                                    <div className="section-label">👑 Hosting ({myData.hosting.length})</div>
                                    {myData.hosting.map(r => (
                                        <div key={r.id} className="session-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: PERM_META[r.permission]?.color }}>{PERM_META[r.permission]?.icon} {PERM_META[r.permission]?.label}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>👥 {r.participant_count}{r.capacity ? `/${r.capacity}` : ''}</span>
                                            </div>
                                            <div className="session-card-subject">{r.name}</div>
                                            <div className="session-card-mode">{MODE_LABEL[r.mode]} • {r.duration_hrs}h</div>
                                            {r.pending_requests > 0 && (
                                                <div style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 600, margin: '8px 0', background: 'var(--warning-bg)', borderRadius: 8, padding: '6px 10px' }}>
                                                    ⏳ {r.pending_requests} pending join request{r.pending_requests > 1 ? 's' : ''}
                                                </div>
                                            )}
                                            <div className="session-card-actions">
                                                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/rooms/${r.id}/lobby`)}>
                                                    {r.status === 'active' ? 'Rejoin Room' : 'Open Lobby'}
                                                </button>
                                                {r.pending_requests > 0 && (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/rooms/${r.id}/requests`)}>Review Requests</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Joined */}
                            {myData.joined.length > 0 && (
                                <>
                                    <div className="section-label">📚 Joined ({myData.joined.length})</div>
                                    {myData.joined.map(r => (
                                        <div key={r.id} className="session-card" onClick={() => navigate(`/app/rooms/${r.id}/lobby`)} style={{ cursor: 'pointer' }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: PERM_META[r.permission]?.color, marginBottom: 4 }}>{PERM_META[r.permission]?.icon} {PERM_META[r.permission]?.label}</div>
                                            <div className="session-card-subject">{r.name}</div>
                                            <div className="session-card-with">hosted by {r.host_name}</div>
                                            <div className="session-card-mode">{MODE_LABEL[r.mode]} • 👥 {r.participant_count}</div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {myData.hosting.length === 0 && myData.joined.length === 0 && myData.invitations.length === 0 && !loading && (
                                <div className="empty-state">
                                    <div className="empty-icon">🏠</div>
                                    <div className="empty-title">No rooms yet</div>
                                    <div className="empty-sub">Create a room or join one from Browse to get started.</div>
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/rooms/create')}>Create Your First Room</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <BottomNav />
            </div>

            {/* Request to Join Modal */}
            {requestModal && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setRequestModal(null)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setRequestModal(null)}>✕</button>
                        <div className="modal-logo">🚪</div>
                        <h2 className="modal-title">Request to Join</h2>
                        <p className="modal-sub" style={{ marginBottom: 16 }}>"{requestModal.name}" hosted by {requestModal.host_name}</p>
                        <div className="form-group">
                            <label>Why do you want to join? {!requestModal.require_join_message && '(Optional)'}</label>
                            <textarea value={reqMsg} onChange={e => setReqMsg(e.target.value)} rows={3} maxLength={200}
                                placeholder={`I'm also preparing ${requestModal.subject ? 'for ' + requestModal.subject : 'and would love to study with your group'}...`} />
                            <span style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', display: 'block', marginTop: 4 }}>{reqMsg.length}/200</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                            ℹ️ Your profile will be shared with the host to review.
                        </div>
                        <button className="btn btn-primary btn-block" onClick={sendRequest}>Send Request →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
