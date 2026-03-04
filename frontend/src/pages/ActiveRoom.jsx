import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import API from '../api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const MODE_LABEL = { silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' };

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
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [actionMenu, setActionMenu] = useState(null); // participant to action
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

        socketRef.current = io(API_URL);
        socketRef.current.emit('join', user.id);
        socketRef.current.emit('room_join', { roomId: id, userId: user.id, userName: user.name, userAvatar: user.avatar });
        socketRef.current.on('room_participant_joined', p => setParticipants(pr => [...pr, p]));
        socketRef.current.on('room_participant_left', ({ userId }) => setParticipants(pr => pr.filter(p => p.id !== userId)));
        socketRef.current.on('room_message', msg => setMessages(prev => [...prev, msg]));
        socketRef.current.on('room_kicked', () => { alert('You were removed from this room.'); navigate('/app/rooms'); });
        socketRef.current.on('room_ended', () => { alert('The host ended the session.'); navigate('/app/rooms'); });

        return () => {
            clearInterval(timerRef.current);
            socketRef.current?.emit('room_leave', { roomId: id, userId: user.id });
            socketRef.current?.disconnect();
        };
    }, [id]);

    useEffect(() => {
        if (timerRunning) {
            timerRef.current = setInterval(() => setTimerSec(s => s + 1), 1000);
        } else clearInterval(timerRef.current);
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

    if (loading) return <div className="loading-full"><div className="spinner" /></div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 600, margin: '0 auto', background: 'var(--bg)', position: 'relative' }}>

            {/* Header */}
            <div style={{ padding: '12px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 0 2px rgba(16,185,129,0.3)' }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{room?.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                        👥 {participants.length} studying &nbsp;• {MODE_LABEL[room?.mode]} &nbsp;• ⏱️ {formatTime(timerSec)}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button className="icon-btn" onClick={() => setShowParticipants(true)}>👥</button>
                    {canManage && <button className="icon-btn" style={{ background: showHostPanel ? 'var(--primary-subtle)' : '' }} onClick={() => setShowHostPanel(v => !v)}>⚙️</button>}
                    {!isHost && <button className="btn btn-danger btn-sm" onClick={leaveRoom}>Leave</button>}
                </div>
            </div>

            {/* Host Controls Panel (inline) */}
            {showHostPanel && canManage && (
                <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={lockRoom}>
                        {room?.is_locked ? '🔓 Unlock Room' : '🔒 Lock Room'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowParticipants(true)}>Manage Participants</button>
                    {isHost && <button className="btn btn-danger btn-sm" onClick={() => setShowEndConfirm(true)}>End Session</button>}
                </div>
            )}

            {/* Timer + session info */}
            <div style={{ padding: '20px 16px', background: 'var(--bg)', textAlign: 'center' }}>
                <div style={{ fontSize: 52, fontFamily: 'var(--font-head)', fontWeight: 800, letterSpacing: -3, color: 'var(--text)', lineHeight: 1 }}>
                    {formatTime(timerSec)}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                    {room?.subject || 'Study Session'}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTimerRunning(v => !v)}>
                        {timerRunning ? '⏸ Pause' : '▶ Resume'}
                    </button>
                </div>
            </div>

            {/* Chat or Silent notice */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)' }}>
                {room?.mode === 'silent' ? (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>
                        🤫 Silent mode — focus and study!<br />
                        <span style={{ fontSize: 12 }}>Chat is disabled in this room.</span>
                    </div>
                ) : (
                    <>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, padding: '10px 0' }}>Start the conversation! 👋</div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, flexDirection: m.senderId === user.id ? 'row-reverse' : 'row' }}>
                                <div style={{ fontSize: 20, flexShrink: 0 }}>{m.senderAvatar}</div>
                                <div style={{ maxWidth: '70%' }}>
                                    {m.senderId !== user.id && <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 2 }}>{m.senderName}</div>}
                                    <div style={{ background: m.senderId === user.id ? 'var(--primary)' : 'var(--surface)', color: m.senderId === user.id ? 'white' : 'var(--text)', border: m.senderId === user.id ? 'none' : '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', fontSize: 14, wordBreak: 'break-word' }}>
                                        {m.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={msgEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            {room?.mode !== 'silent' && (
                <div style={{ padding: '10px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
                    <input className="chat-text-input" style={{ flex: 1 }} value={msgInput} onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Say something..." />
                    <button className="btn btn-primary btn-sm" onClick={sendMsg} disabled={!msgInput.trim()}>↑</button>
                </div>
            )}

            {/* Participants Panel */}
            {showParticipants && (
                <div style={{ position: 'absolute', inset: 0, background: 'var(--surface)', zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                    <header className="app-header">
                        <button className="back-btn" onClick={() => setShowParticipants(false)}>← Back</button>
                        <span className="page-title">Participants ({participants.length})</span>
                    </header>
                    <div style={{ padding: '16px' }}>
                        {participants.map(p => (
                            <div key={p.id || p.userId} className="buddy-card" style={{ cursor: 'default' }}>
                                <div style={{ fontSize: 36 }}>{p.avatar || '👤'}</div>
                                <div className="buddy-info">
                                    <div className="buddy-name">{p.name} {p.id === user.id ? '(You)' : ''}</div>
                                    <div className="buddy-sub">
                                        {p.role === 'host' ? '👑 Host' : p.role === 'co_host' ? '🛡️ Co-Host' : '📚 Participant'}
                                        {p.rating && ` • ⭐ ${p.rating}`}
                                    </div>
                                </div>
                                {canManage && p.id !== user.id && (
                                    <div className="buddy-actions" style={{ position: 'relative' }}>
                                        <button className="icon-btn" onClick={() => setActionMenu(actionMenu === p.id ? null : p.id)}>⋮</button>
                                        {actionMenu === p.id && (
                                            <div style={{ position: 'absolute', right: 0, bottom: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', zIndex: 100, minWidth: 180, overflow: 'hidden' }}>
                                                {isHost && p.role === 'participant' && <button onClick={() => makeCoHost(p.id)} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 14, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', background: 'transparent' }}>👑 Make Co-Host</button>}
                                                <button onClick={() => kickParticipant(p.id)} style={{ display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left', fontSize: 14, color: 'var(--error)', background: 'transparent' }}>✕ Remove from Room</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* End Confirm */}
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
