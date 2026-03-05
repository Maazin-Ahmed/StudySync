import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import API from '../api';

const PERM_META = {
    open: { icon: '🌍', label: 'Open Room', color: 'var(--success)' },
    link: { icon: '🔗', label: 'Link Access', color: 'var(--primary)' },
    request: { icon: '🚪', label: 'Request to Join', color: 'var(--warning)' },
    private: { icon: '🔒', label: 'Private', color: 'var(--text-3)' },
};
const MODE_LABEL = { silent: '🤫 Silent Co-Study', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function RoomLobby() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState([]);
    const [msgInput, setMsgInput] = useState('');
    const [requests, setRequests] = useState([]);
    const [showRequests, setShowRequests] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [buddies, setBuddies] = useState([]);
    const [selectedInvite, setSelectedInvite] = useState([]);
    const [inviteMsg, setInviteMsg] = useState('');
    const [starting, setStarting] = useState(false);
    const [locking, setLocking] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const msgEndRef = useRef(null);

    const isHost = room?.my_role === 'host';
    const isCoHost = room?.my_role === 'co_host';
    const canManage = isHost || isCoHost;

    const loadRoom = async () => {
        try {
            const r = await API.get(`/rooms/${id}`);
            setRoom(r.data);
            if (r.data.status === 'active') navigate(`/app/rooms/${id}/session`);
        } catch { navigate('/app/rooms'); }
        finally { setLoading(false); }
    };

    const loadRequests = async () => {
        if (!canManage) return;
        try {
            const r = await API.get(`/rooms/${id}/requests`);
            setRequests(r.data);
            setPendingCount(r.data.length);
        } catch { }
    };

    useEffect(() => {
        loadRoom();
        const socket = io(API_URL);
        socket.emit('join', user.id);
        socket.emit('room_join', { roomId: id, userId: user.id, userName: user.name, userAvatar: user.avatar });
        socket.on('room_participant_joined', (p) => {
            setRoom(prev => prev ? { ...prev, participants: [...(prev.participants || []), p], participant_count: (prev.participant_count || 0) + 1 } : prev);
        });
        socket.on('room_participant_left', ({ userId }) => {
            setRoom(prev => prev ? { ...prev, participants: (prev.participants || []).filter(p => p.id !== userId), participant_count: Math.max(0, (prev.participant_count || 1) - 1) } : prev);
        });
        socket.on('room_message', (msg) => setMessages(prev => [...prev, msg]));
        socket.on('room_ended', () => { alert('The host ended this room.'); navigate('/app/rooms'); });
        socket.on('room_kicked', () => { alert('You were removed from this room.'); navigate('/app/rooms'); });
        socket.on('room_settings_changed', () => loadRoom());
        // Real-time join request badge for host
        socket.on('room_request_new', ({ roomId }) => {
            if (roomId === id) setPendingCount(c => c + 1);
        });
        socketRef.current = socket;
        return () => { socket.emit('room_leave', { roomId: id, userId: user.id }); socket.disconnect(); };
    }, [id]);

    useEffect(() => { if (canManage) loadRequests(); }, [canManage]);
    useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const sendMsg = () => {
        if (!msgInput.trim()) return;
        socketRef.current?.emit('room_message', { roomId: id, senderId: user.id, senderName: user.name, senderAvatar: user.avatar, content: msgInput.trim() });
        setMsgInput('');
    };

    const startSession = async () => {
        setStarting(true);
        try {
            await API.post(`/rooms/${id}/start`);
            socketRef.current?.emit('room_settings_changed', { roomId: id, settings: { status: 'active' } });
            navigate(`/app/rooms/${id}/session`);
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
        setStarting(false);
    };

    const toggleLock = async () => {
        if (!room) return;
        setLocking(true);
        try {
            await API.put(`/rooms/${id}`, { is_locked: !room.is_locked });
            setRoom(r => ({ ...r, is_locked: !r.is_locked }));
            socketRef.current?.emit('room_settings_changed', { roomId: id, settings: { is_locked: !room.is_locked } });
        } catch { }
        setLocking(false);
    };

    const changePermission = async (permission) => {
        try {
            await API.put(`/rooms/${id}`, { permission });
            setRoom(r => ({ ...r, permission }));
            socketRef.current?.emit('room_settings_changed', { roomId: id, settings: { permission } });
            setShowSettings(false);
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
    };

    const approveRequest = async (reqId) => {
        await API.put(`/rooms/requests/${reqId}/approve`);
        loadRequests(); loadRoom();
    };
    const denyRequest = async (reqId) => {
        await API.put(`/rooms/requests/${reqId}/deny`);
        loadRequests();
    };

    const sendInvites = async () => {
        if (!selectedInvite.length) return;
        await API.post(`/rooms/${id}/invite`, { invitees: selectedInvite, message: inviteMsg });
        setShowInvite(false); setSelectedInvite([]); setInviteMsg('');
        alert(`Invitations sent to ${selectedInvite.length} study buddy${selectedInvite.length > 1 ? 'ies' : ''}!`);
    };

    const copyLink = () => {
        if (!room?.link_token) return;
        navigator.clipboard.writeText(`${window.location.origin}/app/rooms/join/${room.link_token}`);
        alert('Link copied! 📋');
    };

    if (loading) return <div className="loading-full"><div className="spinner" /></div>;
    if (!room) return null;

    const meta = PERM_META[room.permission] || PERM_META.open;

    return (
        <div className="page">
            <div className="app-layout" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

                {/* ── Header ─────────────────────────────────── */}
                <header className="app-header">
                    <button className="back-btn" onClick={() => { socketRef.current?.emit('room_leave', { roomId: id, userId: user.id }); navigate('/app/rooms'); }}>← Leave</button>
                    <span className="page-title" style={{ flex: 1, textAlign: 'center' }}>{room.name}</span>
                    {canManage && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            {/* Requests badge */}
                            {pendingCount > 0 && (
                                <button className="icon-btn" style={{ position: 'relative', background: 'var(--warning-bg)' }} onClick={() => navigate(`/app/rooms/${id}/requests`)}>
                                    🚪<span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--warning)', color: 'white', fontSize: 10, fontWeight: 700, borderRadius: 8, padding: '1px 5px' }}>{pendingCount}</span>
                                </button>
                            )}
                            {/* Lock toggle */}
                            <button className="icon-btn" style={{ background: room.is_locked ? 'var(--error-bg)' : '' }} onClick={toggleLock} disabled={locking} title={room.is_locked ? 'Unlock Room' : 'Lock Room'}>
                                {room.is_locked ? '🔒' : '🔓'}
                            </button>
                            {/* Settings */}
                            <button className="icon-btn" style={{ background: showSettings ? 'var(--primary-subtle)' : '' }} onClick={() => setShowSettings(v => !v)}>⚙️</button>
                            {/* Invite */}
                            <button className="icon-btn" onClick={() => { API.get('/buddies').then(r => setBuddies(r.data)); setShowInvite(true); }}>➕</button>
                        </div>
                    )}
                    {!canManage && room.permission !== 'private' && (
                        <button className="icon-btn" onClick={() => { API.get('/buddies').then(r => setBuddies(r.data)); setShowInvite(true); }} title="Invite buddies">➕</button>
                    )}
                </header>

                {/* ── Host Settings inline panel ──────────────── */}
                {showSettings && canManage && (
                    <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Room Settings</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>Change access level:</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[['open', '🌍 Open'], ['link', '🔗 Link'], ['request', '🚪 Request'], ['private', '🔒 Private']].map(([perm, label]) => (
                                <button key={perm} onClick={() => perm !== room.permission && window.confirm(`Change room to "${label}"?`) && changePermission(perm)}
                                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: `1px solid ${room.permission === perm ? 'var(--primary)' : 'var(--border)'}`, background: room.permission === perm ? 'var(--primary)' : 'var(--surface)', color: room.permission === perm ? 'white' : 'var(--text-2)', cursor: 'pointer', fontWeight: room.permission === perm ? 700 : 400 }}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {room.permission === 'link' && room.link_token && (
                            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>{window.location.origin}/app/rooms/join/{room.link_token}</span>
                                <button className="btn btn-primary btn-sm" onClick={copyLink}>📋 Copy</button>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* ── Room info bar ─────────────────────── */}
                    <div style={{ padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, background: `${meta.color}12`, borderRadius: 20, padding: '2px 10px', border: `1px solid ${meta.color}30` }}>{meta.icon} {meta.label}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>👥 {room.participant_count}{room.capacity ? `/${room.capacity}` : ''}</span>
                            {room.is_locked && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--error)', background: 'var(--error-bg)', borderRadius: 20, padding: '2px 8px' }}>🔒 LOCKED</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {room.subject && <span>📚 {room.subject}</span>}
                            <span>{MODE_LABEL[room.mode]}</span>
                            <span>⏱️ {room.duration_hrs}h</span>
                        </div>
                    </div>

                    {/* ── Participants avatars ──────────────── */}
                    <div style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>Participants ({room.participant_count})</span>
                        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {(room.participants || []).map((p, i) => (
                                <div key={p.id || i} title={p.name + (p.role === 'host' ? ' (Host)' : p.role === 'co_host' ? ' (Co-Host)' : '')} style={{ position: 'relative', flexShrink: 0 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--primary-subtle)', border: `2px solid ${p.role === 'host' ? 'var(--warning)' : p.role === 'co_host' ? 'var(--primary)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{p.avatar}</div>
                                    {p.role === 'host' && <div style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 9 }}>👑</div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Lobby chat ───────────────────────── */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', padding: '10px 0' }}>
                            👋 Welcome to the lobby! Chat while you wait for the session to start.
                        </div>
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8 }}>
                                <div style={{ fontSize: 20, flexShrink: 0 }}>{m.senderAvatar}</div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: m.senderId === user.id ? 'var(--primary)' : 'var(--text-3)', marginBottom: 2 }}>{m.senderId === user.id ? 'You' : m.senderName}</div>
                                    <div style={{ background: m.senderId === user.id ? 'var(--primary)' : 'var(--surface)', color: m.senderId === user.id ? 'white' : 'var(--text)', border: m.senderId === user.id ? 'none' : '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', fontSize: 14 }}>{m.content}</div>
                                </div>
                            </div>
                        ))}
                        <div ref={msgEndRef} />
                    </div>

                    {/* ── Input & action bar ───────────────── */}
                    <div style={{ padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input className="chat-text-input" style={{ flex: 1 }} value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Lobby chat..." />
                            <button className="btn btn-ghost btn-sm" onClick={sendMsg} disabled={!msgInput.trim()}>Send</button>
                        </div>
                        {isHost && room.status === 'lobby' && (
                            <button className="btn btn-primary btn-block" onClick={startSession} disabled={starting} style={{ height: 50, fontSize: 15 }}>
                                {starting ? 'Starting...' : '🚀 Start Study Session'}
                            </button>
                        )}
                        {!isHost && room.status === 'lobby' && (
                            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', padding: '8px', background: 'var(--surface-2)', borderRadius: 8 }}>
                                ⏳ Waiting for the host to start the session...
                            </div>
                        )}
                        {room.status === 'active' && (
                            <button className="btn btn-primary btn-block" onClick={() => navigate(`/app/rooms/${id}/session`)} style={{ height: 50, fontSize: 15 }}>
                                ▶ Rejoin Active Session
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Join Requests Modal ──────────────────────── */}
            {showRequests && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setShowRequests(false)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setShowRequests(false)}>✕</button>
                        <h2 className="modal-title">Join Requests</h2>
                        <p className="modal-sub" style={{ marginBottom: 16 }}>{requests.length} pending request{requests.length !== 1 ? 's' : ''}</p>
                        {requests.length === 0 && <div className="empty-state-sm">No pending requests</div>}
                        {requests.map(r => (
                            <div key={r.id} className="request-card">
                                <div className="req-card-top">
                                    <div className="req-card-avatar">{r.avatar}</div>
                                    <div>
                                        <div className="req-card-name">{r.name}</div>
                                        <div className="req-card-match">⭐ {r.rating} • {r.total_sessions} sessions • {r.institution}</div>
                                    </div>
                                </div>
                                {r.message && <div className="req-message">"{r.message}"</div>}
                                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => approveRequest(r.id)}>✓ Approve</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => denyRequest(r.id)}>✕ Deny</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/partner/${r.user_id}`)}>View Profile</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Invite Modal ─────────────────────────────── */}
            {showInvite && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setShowInvite(false)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setShowInvite(false)}>✕</button>
                        <h2 className="modal-title">Invite Study Buddies</h2>
                        <p className="modal-sub" style={{ marginBottom: 16 }}>to "{room.name}"</p>
                        {room.permission === 'link' && room.link_token && (
                            <div style={{ background: 'var(--primary-subtle)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>📋 Or share the room link</span>
                                <button className="btn btn-primary btn-sm" onClick={copyLink}>Copy Link</button>
                            </div>
                        )}
                        {buddies.length === 0 ? (
                            <div className="empty-state-sm">No study buddies to invite yet.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                                {buddies.map(b => {
                                    const partnerId = b.buddy_id === user?.id ? b.user_id : b.buddy_id;
                                    const sel = selectedInvite.includes(partnerId);
                                    return (
                                        <label key={b.id} className="check-card" style={sel ? { borderColor: 'var(--primary)', background: 'var(--primary-subtle)' } : {}}>
                                            <input type="checkbox" checked={sel} onChange={() => setSelectedInvite(prev => sel ? prev.filter(x => x !== partnerId) : [...prev, partnerId])} />
                                            <span style={{ fontSize: 22 }}>{b.avatar}</span>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{b.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.institution}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        <div className="form-group">
                            <label>Message (Optional)</label>
                            <textarea value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} rows={2} maxLength={300} placeholder={`Join me studying ${room.subject || 'together'}!`} />
                        </div>
                        <button className="btn btn-primary btn-block" disabled={!selectedInvite.length} onClick={sendInvites}>
                            Send {selectedInvite.length > 0 ? `${selectedInvite.length} ` : ''}Invitation{selectedInvite.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
