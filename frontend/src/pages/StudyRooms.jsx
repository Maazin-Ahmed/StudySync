import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import API from '../api';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const PERM_META = {
    open: { icon: '🌍', label: 'OPEN ROOM', color: 'var(--success)', bg: 'var(--success-bg)', cta: 'Join Now' },
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
    const [sortMode, setSortMode] = useState('active');
    const [requestModal, setRequestModal] = useState(null);
    const [reqMsg, setReqMsg] = useState('');
    const [joining, setJoining] = useState(null);
    const socketRef = useRef(null);

    // ── Socket.IO for real-time notifications ──────────────────
    useEffect(() => {
        const socket = io(API_URL);
        socket.emit('join', user.id);
        // When a join request for a room we host is approved, refresh
        socket.on('room_request_approved', ({ roomId }) => {
            navigate(`/app/rooms/${roomId}/lobby`);
        });
        socketRef.current = socket;
        return () => socket.disconnect();
    }, [user.id]);

    const loadBrowse = () => {
        setLoading(true);
        const params = {};
        if (subjectFilter) params.subject = subjectFilter;
        if (modeFilter) params.mode = modeFilter;
        params.sort = sortMode;
        API.get('/rooms', { params }).then(r => setRooms(r.data)).catch(() => { }).finally(() => setLoading(false));
    };

    const loadMy = () => {
        setLoading(true);
        API.get('/rooms/my').then(r => setMyData(r.data)).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => { if (tab === 'browse') loadBrowse(); else loadMy(); }, [tab]);
    useEffect(() => { if (tab === 'browse') loadBrowse(); }, [subjectFilter, modeFilter, sortMode]);

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
            else {
                alert('✅ Request sent! You\'ll be notified when the host approves.');
                setRequestModal(null);
                setReqMsg('');
            }
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
        if (diffMs > 0) {
            const mins = Math.floor(diffMs / 60000);
            if (mins < 60) return `Started ${mins}m ago`;
            return `Started ${Math.floor(mins / 60)}h ago`;
        }
        const mins = Math.floor(-diffMs / 60000);
        if (mins < 60) return `Starts in ${mins}m`;
        return `Starts at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const totalPendingRequests = myData.hosting.reduce((acc, r) => acc + (parseInt(r.pending_requests) || 0), 0);

    // ── Room Card ───────────────────────────────────────────────
    const RoomCard = ({ room }) => {
        const meta = PERM_META[room.permission] || PERM_META.open;
        const isFull = room.capacity && parseInt(room.participant_count) >= room.capacity;
        const isActive = room.status === 'active';
        return (
            <div className="partner-card" style={{ cursor: 'default', position: 'relative', overflow: 'hidden' }}>
                {/* Permission badge row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30`, borderRadius: 20, padding: '3px 10px', letterSpacing: 0.4 }}>
                        {meta.icon} {meta.label}
                    </span>
                    {isActive && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', background: 'var(--success-bg)', borderRadius: 20, padding: '2px 8px', border: '1px solid rgba(16,185,129,0.2)' }}>🟢 LIVE</span>}
                    {isFull && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)', background: 'var(--error-bg)', borderRadius: 20, padding: '2px 8px' }}>FULL</span>}
                </div>

                {/* Room name */}
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{room.name}</div>

                {/* Meta info row */}
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>{MODE_LABEL[room.mode]}</span>
                    <span>•</span>
                    <span>👥 {room.participant_count}{room.capacity ? `/${room.capacity}` : ''} studying</span>
                    <span>•</span>
                    <span>⏱️ {fmtTime(room.scheduled_at)}</span>
                </div>

                {/* Tags */}
                {room.subject && <div className="pc-tags" style={{ marginBottom: 10 }}><span className="pc-tag">📚 {room.subject}</span></div>}

                {/* Host info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 20 }}>{room.host_avatar}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Hosted by <strong>{room.host_name}</strong> &nbsp;⭐ {parseFloat(room.host_rating || 0).toFixed(1)}</span>
                </div>

                {/* CTA */}
                <div className="pc-actions">
                    {room.permission === 'open' && !isFull && (
                        <button className="btn btn-primary btn-sm" disabled={joining === room.id} onClick={() => joinOpen(room)}>
                            {joining === room.id ? 'Joining...' : '→ Join Now'}
                        </button>
                    )}
                    {room.permission === 'request' && !isFull && (
                        <button className="btn btn-outline btn-sm" onClick={() => { setRequestModal(room); setReqMsg(''); }}>🚪 Request to Join</button>
                    )}
                    {room.permission === 'link' && (
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/app/rooms/join/${room.link_token || ''}`)}>🔗 Join via Link</button>
                    )}
                    {isFull && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Room is full</span>}
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/partner/${room.host_id}`)}>View Host</button>
                </div>
            </div>
        );
    };

    // ── My Room hosting card ────────────────────────────────────
    const HostingCard = ({ r }) => {
        const meta = PERM_META[r.permission] || PERM_META.open;
        const pending = parseInt(r.pending_requests) || 0;
        return (
            <div className="partner-card" style={{ cursor: 'default', borderLeft: `3px solid ${meta.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 20, padding: '2px 8px' }}>{meta.icon} {meta.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>👥 {r.participant_count}{r.capacity ? `/${r.capacity}` : ''}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: pending > 0 ? 8 : 12 }}>{MODE_LABEL[r.mode]} • {r.duration_hrs}h</div>
                {pending > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', background: 'var(--warning-bg)', borderRadius: 8, padding: '6px 10px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ background: 'var(--warning)', color: 'white', borderRadius: 12, padding: '1px 8px', fontSize: 11 }}>{pending}</span>
                        pending join request{pending > 1 ? 's' : ''}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/rooms/${r.id}/lobby`)}>
                        {r.status === 'active' ? 'Rejoin Room' : 'Open Lobby'}
                    </button>
                    {pending > 0 && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => navigate(`/app/rooms/${r.id}/requests`)}>
                            Review Requests
                        </button>
                    )}
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
                    {/* Tab bar with badge */}
                    <div className="tab-bar">
                        <button className={`tab-btn ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse Rooms</button>
                        <button className={`tab-btn ${tab === 'my' ? 'active' : ''}`} onClick={() => setTab('my')}>
                            My Rooms {(myData.invitations.length + totalPendingRequests) > 0 && (
                                <span className="req-badge">{myData.invitations.length + totalPendingRequests}</span>
                            )}
                        </button>
                    </div>

                    {/* ── BROWSE TAB ─────────────────────────────── */}
                    {tab === 'browse' && (
                        <>
                            {/* Filters */}
                            <div className="find-filters" style={{ marginBottom: 14 }}>
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
                                {/* Sort pills */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                    {[['active', '🔥 Active Now'], ['new', '🆕 Newest'], ['size', '👥 Most People']].map(([val, label]) => (
                                        <button key={val} onClick={() => setSortMode(val)}
                                            style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${sortMode === val ? 'var(--primary)' : 'var(--border)'}`, background: sortMode === val ? 'var(--primary-subtle)' : 'var(--surface)', color: sortMode === val ? 'var(--primary)' : 'var(--text-3)', cursor: 'pointer', fontWeight: sortMode === val ? 700 : 400 }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {loading ? (
                                [1, 2, 3].map(i => <div key={i} className="partner-card"><div className="skeleton skel-line w-40" /><div className="skeleton skel-line w-75" /><div className="skeleton skel-line w-50" /></div>)
                            ) : rooms.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-icon">🏠</div>
                                    <div className="empty-title">No active rooms</div>
                                    <div className="empty-sub">Be the first to create a study room!</div>
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/rooms/create')}>Create Room</button>
                                </div>
                            ) : (
                                <>
                                    <div className="section-label">{rooms.length} room{rooms.length !== 1 ? 's' : ''} active{subjectFilter ? ` for ${subjectFilter}` : ''}</div>
                                    {rooms.map(r => <RoomCard key={r.id} room={r} />)}
                                </>
                            )}
                        </>
                    )}

                    {/* ── MY ROOMS TAB ───────────────────────────── */}
                    {tab === 'my' && (
                        <>
                            {/* Invitations */}
                            {myData.invitations.length > 0 && (
                                <>
                                    <div className="section-label" style={{ color: 'var(--primary)' }}>💌 INVITATIONS ({myData.invitations.length})</div>
                                    {myData.invitations.map(inv => {
                                        const perm = PERM_META[inv.room_permission] || PERM_META.private;
                                        return (
                                            <div key={inv.id} className="partner-card" style={{ borderLeft: '3px solid var(--primary)' }}>
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                                                    <span style={{ fontSize: 26 }}>{inv.inviter_avatar}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{inv.inviter_name} invited you</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{perm.icon} {perm.label}</div>
                                                    </div>
                                                </div>
                                                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{inv.room_name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: inv.message ? 8 : 12 }}>
                                                    {inv.subject ? `📚 ${inv.subject}` : ''} {inv.subject ? '•' : ''} {MODE_LABEL[inv.mode]}
                                                </div>
                                                {inv.message && (
                                                    <div className="req-message" style={{ marginBottom: 10 }}>"{inv.message}"</div>
                                                )}
                                                <div className="pc-actions">
                                                    <button className="btn btn-primary btn-sm" onClick={() => acceptInvite(inv)}>✓ Accept</button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => declineInvite(inv)}>Decline</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {/* Hosting */}
                            {myData.hosting.length > 0 && (
                                <>
                                    <div className="section-label">👑 HOSTING ({myData.hosting.length})</div>
                                    {myData.hosting.map(r => <HostingCard key={r.id} r={r} />)}
                                </>
                            )}

                            {/* Joined */}
                            {myData.joined.length > 0 && (
                                <>
                                    <div className="section-label">📚 JOINED ({myData.joined.length})</div>
                                    {myData.joined.map(r => {
                                        const meta = PERM_META[r.permission] || PERM_META.open;
                                        return (
                                            <div key={r.id} className="partner-card" onClick={() => navigate(`/app/rooms/${r.id}/lobby`)} style={{ cursor: 'pointer' }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginBottom: 6 }}>{meta.icon} {meta.label}</div>
                                                <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{r.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>hosted by {r.host_name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{MODE_LABEL[r.mode]} • 👥 {r.participant_count}</div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {myData.hosting.length === 0 && myData.joined.length === 0 && myData.invitations.length === 0 && !loading && (
                                <div className="empty-state">
                                    <div className="empty-icon">🏠</div>
                                    <div className="empty-title">No rooms yet</div>
                                    <div className="empty-sub">Create a room or browse public rooms to get started.</div>
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/rooms/create')}>Create Room</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setTab('browse')}>Browse Rooms</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <BottomNav />
            </div>

            {/* ── Request to Join Modal ─────────────────────── */}
            {requestModal && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setRequestModal(null)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setRequestModal(null)}>✕</button>
                        <div className="modal-logo">🚪</div>
                        <h2 className="modal-title">Request to Join</h2>
                        <p className="modal-sub" style={{ marginBottom: 16 }}>"{requestModal.name}" hosted by {requestModal.host_name}</p>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-3)', marginBottom: 16, background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                            <span>👥 {requestModal.participant_count} currently studying</span>
                            {requestModal.capacity && <span>• Max {requestModal.capacity}</span>}
                            <span>• {MODE_LABEL[requestModal.mode]}</span>
                        </div>
                        <div className="form-group">
                            <label>Why do you want to join? {!requestModal.require_join_message && '(Optional)'}</label>
                            <textarea value={reqMsg} onChange={e => setReqMsg(e.target.value)} rows={3} maxLength={200}
                                placeholder={`I'm also studying ${requestModal.subject ? requestModal.subject : 'this topic'} and would love to join your session...`} />
                            <span style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', display: 'block', marginTop: 4 }}>{reqMsg.length}/200</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
                            ℹ️ Your profile (name, rating, institution) will be shared with the host.
                        </div>
                        <button className="btn btn-primary btn-block" onClick={sendRequest}>Send Request →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
