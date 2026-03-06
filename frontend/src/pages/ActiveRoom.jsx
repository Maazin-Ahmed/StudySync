import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import API from '../api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MODE_LABEL = { silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' };
const PERM_META = {
    open: { icon: '🌍', label: 'Open', color: 'var(--success)' },
    link: { icon: '🔗', label: 'Link', color: 'var(--primary)' },
    request: { icon: '🚪', label: 'Request', color: 'var(--warning)' },
    private: { icon: '🔒', label: 'Private', color: 'var(--text-3)' },
};

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function ActiveRoom() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [participants, setParticipants] = useState([]);
    const [messages, setMessages] = useState([]);
    const [msgInput, setMsgInput] = useState('');
    const [timerSec, setTimerSec] = useState(0);
    const [timerRunning, setTimerRunning] = useState(true);
    const [showHostPanel, setShowHostPanel] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [actionMenu, setActionMenu] = useState(null);
    const [buddies, setBuddies] = useState([]);
    const [selectedInvite, setSelectedInvite] = useState([]);
    const [inviteMsg, setInviteMsg] = useState('');
    const msgEndRef = useRef(null);
    const timerRef = useRef(null);

    const isHost = room?.my_role === 'host';
    const isCoHost = room?.my_role === 'co_host';
    const canManage = isHost || isCoHost;

    useEffect(() => {
        API.get(`/rooms/${id}`).then(r => {
            setRoom(r.data);
            setParticipants(r.data.participants || []);
            if (r.data.status === 'ended') navigate('/app/rooms');
        }).catch(() => navigate('/app/rooms')).finally(() => setLoading(false));

        const socket = io(API_URL);
        socket.emit('join', user.id);
        socket.emit('room_join', { roomId: id, userId: user.id, userName: user.name, userAvatar: user.avatar });
        socket.on('room_participant_joined', p => setParticipants(pr => {
            if (pr.find(x => x.id === p.userId)) return pr;
            return [...pr, { id: p.userId, name: p.userName, avatar: p.userAvatar, role: 'participant', joined_at: p.joinedAt }];
        }));
        socket.on('room_participant_left', ({ userId }) => setParticipants(pr => pr.filter(p => p.id !== userId)));
        socket.on('room_message', msg => setMessages(prev => [...prev, msg]));
        socket.on('room_kicked', () => { alert('You were removed from this room.'); navigate('/app/rooms'); });
        socket.on('room_ended', () => { alert('The host ended the session.'); navigate('/app/rooms'); });
        socketRef.current = socket;

        return () => {
            clearInterval(timerRef.current);
            socket.emit('room_leave', { roomId: id, userId: user.id });
            socket.disconnect();
        };
    }, [id]);

    useEffect(() => {
        if (timerRunning) { timerRef.current = setInterval(() => setTimerSec(s => s + 1), 1000); }
        else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [timerRunning]);

    useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const sendMsg = () => {
        if (!msgInput.trim() || room?.mode === 'silent') return;
        socketRef.current?.emit('room_message', { roomId: id, senderId: user.id, senderName: user.name, senderAvatar: user.avatar, content: msgInput.trim() });
        setMsgInput('');
    };

    const kickParticipant = async (uid) => {
        if (!window.confirm('Remove this participant?')) return;
        await API.delete(`/rooms/${id}/participants/${uid}`);
        socketRef.current?.emit('room_kick', { roomId: id, targetUserId: uid });
        setParticipants(prev => prev.filter(p => p.id !== uid));
        setActionMenu(null);
    };

    const makeCoHost = async (uid) => {
        await API.put(`/rooms/${id}/cohost/${uid}`);
        setParticipants(prev => prev.map(p => p.id === uid ? { ...p, role: 'co_host' } : p));
        setActionMenu(null);
    };

    const lockRoom = async () => {
        await API.put(`/rooms/${id}`, { is_locked: !room.is_locked });
        setRoom(r => ({ ...r, is_locked: !r.is_locked }));
        socketRef.current?.emit('room_settings_changed', { roomId: id, settings: { is_locked: !room.is_locked } });
    };

    const endSession = async () => {
        await API.post(`/rooms/${id}/end`);
        socketRef.current?.emit('room_ended', { roomId: id });
        navigate('/app/rooms');
    };

    const leaveRoom = async () => {
        await API.post(`/rooms/${id}/leave`);
        socketRef.current?.emit('room_leave', { roomId: id, userId: user.id });
        navigate('/app/rooms');
    };

    const sendInvites = async () => {
        if (!selectedInvite.length) return;
        await API.post(`/rooms/${id}/invite`, { invitees: selectedInvite, message: inviteMsg });
        setShowInvite(false); setSelectedInvite([]); setInviteMsg('');
        alert(`Invitations sent to ${selectedInvite.length} buddy${selectedInvite.length > 1 ? 'ies' : ''}!`);
    };

    const copyLink = () => {
        if (!room?.link_token) return;
        navigator.clipboard.writeText(`${window.location.origin}/app/rooms/join/${room.link_token}`);
        alert('Link copied! 📋');
    };

    const openInvite = () => {
        API.get('/buddies').then(r => setBuddies(r.data));
        setShowInvite(true);
    };

    if (loading) return <div className="loading-full"><div className="spinner" /></div>;

    const meta = PERM_META[room?.permission] || PERM_META.open;
    const timeRemaining = room ? Math.max(0, room.duration_hrs * 3600 - timerSec) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 600, margin: '0 auto', background: 'var(--bg)', position: 'relative' }}>

            {/* ── Header ─────────────────────────────────────── */}
            <div style={{ padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 0 2px rgba(16,185,129,0.3)', flexShrink: 0 }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{room?.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: `${meta.color}12`, borderRadius: 12, padding: '1px 7px' }}>{meta.icon} {meta.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        👥 {participants.length} studying &nbsp;• {MODE_LABEL[room?.mode]} &nbsp;• ⏱️ {formatTime(timerSec)}
                        {timeRemaining > 0 && <span style={{ marginLeft: 6 }}>({formatTime(timeRemaining)} left)</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="icon-btn" onClick={() => setShowParticipants(true)} title="Participants">👥</button>
                    {/* Show invite/share for everyone, restrict private room invites to hosts only */}
                    {(room?.permission !== 'private' || canManage) && <button className="btn btn-primary btn-sm" style={{ padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 4px 10px rgba(var(--primary-rgb), 0.3)' }} onClick={openInvite} title="Invite Buddies"><span style={{ fontSize: 16 }}>+</span> Invite</button>}
                    {canManage && <button className="icon-btn" style={{ background: showHostPanel ? 'var(--primary-subtle)' : '' }} onClick={() => setShowHostPanel(v => !v)} title="Host Controls">⚙️</button>}
                    {!isHost && <button className="btn btn-danger btn-sm" onClick={leaveRoom}>Leave</button>}
                </div>
            </div>

            {/* ── Host Controls Panel ─────────────────────── */}
            {showHostPanel && canManage && (
                <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={lockRoom}>
                        {room?.is_locked ? '🔓 Unlock Room' : '🔒 Lock Room'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowParticipants(true)}>Manage Participants</button>
                    <button className="btn btn-ghost btn-sm" onClick={openInvite}>➕ Invite More</button>
                    {isHost && <button className="btn btn-danger btn-sm" onClick={() => setShowEndConfirm(true)}>End Session</button>}
                </div>
            )}

            {/* ── Timer ───────────────────────────────────── */}
            <div style={{ padding: '20px 16px', background: 'var(--bg)', textAlign: 'center' }}>
                <div style={{ fontSize: 52, fontFamily: 'var(--font-head)', fontWeight: 800, letterSpacing: -3, color: 'var(--text)', lineHeight: 1 }}>{formatTime(timerSec)}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{room?.subject || 'Study Session'}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTimerRunning(v => !v)}>
                        {timerRunning ? '⏸ Pause' : '▶ Resume'}
                    </button>
                </div>
            </div>

            {/* ── Chat or Silent notice ────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)' }}>
                {room?.mode === 'silent' ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>
                        🤫 Silent mode — focus and study!<br />
                        <span style={{ fontSize: 12 }}>Chat is disabled. Use lobby for conversations.</span>
                    </div>
                ) : (
                    <>
                        {messages.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>Start the conversation! 👋</div>}
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.senderId === user.id ? 'row-reverse' : 'row' }}>
                                <div style={{ fontSize: 20, flexShrink: 0 }}>{m.senderAvatar}</div>
                                <div style={{ maxWidth: '70%' }}>
                                    {m.senderId !== user.id && <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 2 }}>{m.senderName}</div>}
                                    <div style={{ background: m.senderId === user.id ? 'var(--primary)' : 'var(--surface)', color: m.senderId === user.id ? 'white' : 'var(--text)', border: m.senderId === user.id ? 'none' : '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', fontSize: 14, wordBreak: 'break-word' }}>{m.content}</div>
                                </div>
                            </div>
                        ))}
                        <div ref={msgEndRef} />
                    </>
                )}
            </div>

            {/* ── Input ───────────────────────────────────── */}
            {room?.mode !== 'silent' && (
                <div style={{ padding: '10px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
                    <input className="chat-text-input" style={{ flex: 1 }} value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Say something..." />
                    <button className="btn btn-primary btn-sm" onClick={sendMsg} disabled={!msgInput.trim()}>↑</button>
                </div>
            )}

            {/* ── Participants Panel ─────────────────────── */}
            {showParticipants && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--surface)', zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <header className="app-header">
                        <button className="back-btn" onClick={() => setShowParticipants(false)}>← Back</button>
                        <span className="page-title">Participants ({participants.length})</span>
                        {canManage && <button className="btn btn-ghost btn-sm" onClick={openInvite}>+ Invite</button>}
                    </header>
                    <div style={{ padding: '16px' }}>
                        {participants.map(p => (
                            <div key={p.id || p.userId} className="buddy-card" style={{ cursor: 'default' }}>
                                <div style={{ fontSize: 36 }}>{p.avatar || '👤'}</div>
                                <div className="buddy-info">
                                    <div className="buddy-name">{p.name} {p.id === user.id ? '(You)' : ''}</div>
                                    <div className="buddy-sub">
                                        {p.role === 'host' ? '👑 Host' : p.role === 'co_host' ? '🛡️ Co-Host' : '📚 Participant'}
                                        {p.rating ? ` • ⭐ ${p.rating}` : ''}
                                        {p.joined_at ? ` • Joined ${Math.floor((Date.now() - new Date(p.joined_at)) / 60000)}m ago` : ''}
                                    </div>
                                </div>
                                {canManage && p.id !== user.id && (
                                    <div className="buddy-actions" style={{ position: 'relative' }}>
                                        <button className="icon-btn" onClick={() => setActionMenu(actionMenu === p.id ? null : p.id)}>⋮</button>
                                        {actionMenu === p.id && (
                                            <div style={{ position: 'absolute', right: 0, bottom: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 190, overflow: 'hidden' }}>
                                                <button onClick={() => { navigate(`/app/partner/${p.id}`); setActionMenu(null); }} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 13, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', background: 'transparent' }}>👤 View Profile</button>
                                                {isHost && p.role === 'participant' && <button onClick={() => makeCoHost(p.id)} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 13, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', background: 'transparent' }}>👑 Make Co-Host</button>}
                                                <button onClick={() => kickParticipant(p.id)} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 13, color: 'var(--error)', background: 'transparent' }}>✕ Remove from Room</button>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                        <h2 className="modal-title">Invite to Session</h2>
                        <p className="modal-sub" style={{ marginBottom: 12 }}>"{room?.name}" — {participants.length} people in, {formatTime(Math.max(0, room.duration_hrs * 3600 - timerSec))} remaining</p>
                        {room?.permission === 'link' && room?.link_token && (
                            <div style={{ background: 'var(--primary-subtle)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-2)', flex: 1 }}>Share the room link</span>
                                <button className="btn btn-primary btn-sm" onClick={copyLink}>📋 Copy Link</button>
                                <a className="btn btn-ghost btn-sm" href={`https://wa.me/?text=${encodeURIComponent('Join my study session: ' + window.location.origin + '/app/rooms/join/' + room.link_token)}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>
                            </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>Select Study Buddies:</div>
                        {buddies.length === 0 ? <div className="empty-state-sm">No study buddies to invite.</div> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, maxHeight: 240, overflowY: 'auto' }}>
                                {buddies.map(b => {
                                    const partnerId = b.buddy_id === user?.id ? b.user_id : b.buddy_id;
                                    const sel = selectedInvite.includes(partnerId);
                                    const alreadyIn = participants.find(p => p.id === partnerId);
                                    if (alreadyIn) return null;
                                    return (
                                        <label key={b.id} className="check-card" style={sel ? { borderColor: 'var(--primary)', background: 'var(--primary-subtle)' } : {}}>
                                            <input type="checkbox" checked={sel} onChange={() => setSelectedInvite(prev => sel ? prev.filter(x => x !== partnerId) : [...prev, partnerId])} />
                                            <span style={{ fontSize: 20 }}>{b.avatar}</span>
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
                            <textarea value={inviteMsg} onChange={e => setInviteMsg(e.target.value)} rows={2} maxLength={300} placeholder={`Join me studying ${room?.subject || 'together'}! ${formatTime(Math.max(0, room?.duration_hrs * 3600 - timerSec))} remaining.`} />
                        </div>
                        <button className="btn btn-primary btn-block" disabled={!selectedInvite.length} onClick={sendInvites}>
                            Send {selectedInvite.length > 0 ? `${selectedInvite.length} ` : ''}Invitation{selectedInvite.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            )}

            {/* ── End Confirm ──────────────────────────────── */}
            {showEndConfirm && (
                <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-logo">⚠️</div>
                        <h2 className="modal-title">End Session?</h2>
                        <p className="modal-sub" style={{ marginBottom: 20 }}>This will end the room for all {participants.length} participants.</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowEndConfirm(false)}>Cancel</button>
                            <button className="btn btn-danger" style={{ flex: 1 }} onClick={endSession}>End Session</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
