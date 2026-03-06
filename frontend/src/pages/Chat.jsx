import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import API from '../api';

const QUICK_REPLIES = ['Ready now! 🎯', 'Running 5 mins late', 'Can we reschedule?', 'Great session! 🙌', 'Same time tomorrow?'];
const TEMPLATES = [
    { label: '👋 Intro', texts: ["Hey! I saw your profile and think we'd be great study partners!", 'Hi! Looking for a consistent study buddy. Want to try a session?'] },
    { label: '📚 Study', texts: ["Would you like a 2-hour DSA session this evening?", 'Can you help with some doubts?', 'Looking for a quiet Pomodoro partner.'] },
    { label: '⏰ Timing', texts: ["Ready for our session! Just finishing up.", 'Running 10 minutes late, sorry!', 'Can we push to 7:30 PM?'] },
];

let socket = null;

export default function Chat() {
    const { id: partnerId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [partner, setPartner] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [showTemplates, setShowTemplates] = useState(false);

    // Quick Start Room State
    const [showQuickStart, setShowQuickStart] = useState(false);
    const [qsSubject, setQsSubject] = useState('');
    const [qsMode, setQsMode] = useState('silent');
    const [qsDuration, setQsDuration] = useState(120);
    const bottomRef = useRef(null);

    const handleQuickStart = async () => {
        try {
            const r = await API.post('/rooms/quick-start', {
                partnerId: partnerId,
                subject: qsSubject,
                mode: qsMode,
                duration: qsDuration
            });
            setShowQuickStart(false);
            navigate(`/app/rooms/${r.data.id}/lobby`);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to start room');
        }
    };


    useEffect(() => {
        API.get(`/users/${partnerId}`).then(r => setPartner(r.data)).catch(() => { });
        API.get(`/messages/${partnerId}`).then(r => setMessages(r.data)).catch(() => { });

        socket = io('http://localhost:4000');
        socket.emit('join', user?.id);
        socket.on('receive_message', msg => {
            if (msg.sender_id === partnerId || msg.receiver_id === partnerId) {
                setMessages(m => [...m, msg]);
            }
        });
        return () => { socket?.disconnect(); };
    }, [partnerId, user?.id]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const send = () => {
        const text = input.trim();
        if (!text) return;
        socket.emit('send_message', { senderId: user?.id, receiverId: partnerId, content: text, senderName: user?.name, senderAvatar: user?.avatar });
        setMessages(m => [...m, { sender_id: user?.id, receiver_id: partnerId, content: text, created_at: new Date().toISOString(), sender_name: user?.name, sender_avatar: user?.avatar }]);
        setInput('');
    };

    const pad2 = n => String(n).padStart(2, '0');
    const fmtTs = ts => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

    return (
        <div className="chat-layout">
            <header className="chat-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="back-btn" onClick={() => navigate('/app/chats')}>←</button>
                    <div className="chat-header-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="chat-header-avatar">{partner?.avatar || '👤'}</div>
                            <div>
                                <div className="chat-partner-name" style={{ fontWeight: 700, fontSize: 16 }}>{partner?.name || '...'}</div>
                                <div className="chat-partner-status" style={{ fontSize: 11, color: 'var(--success)' }}>🟢 Active now</div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div style={{ padding: '10px 15px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>⚡ Actions:</span>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, border: '1px solid var(--border)' }} onClick={() => navigate('/app/session/create')}>📅 Schedule</button>
                <button className="btn btn-primary btn-sm" style={{ flex: 1, boxShadow: '0 4px 10px rgba(var(--primary-rgb), 0.3)' }} onClick={() => setShowQuickStart(true)}>🎯 Start Room Now</button>
            </div>

            <div className="chat-messages-area" style={{ flex: 1, overflowY: 'auto' }}>
                {messages.length === 0 && <div className="chat-system-msg">Say hello! 👋</div>}
                <div className="chat-day-label">Today</div>
                {messages.map((m, i) => {
                    const mine = m.sender_id === user?.id;
                    return (
                        <div key={m.id || i} className={`chat-bubble-row ${mine ? 'mine' : ''}`}>
                            {!mine && <div className="chat-bubble-avatar">{partner?.avatar || '👤'}</div>}
                            <div className={`chat-bubble-wrap ${mine ? 'mine' : ''}`}>
                                {!mine && <div className="chat-sender-name">{partner?.name}</div>}
                                <div className="chat-bubble">{m.content}</div>
                                <div className="chat-ts">{fmtTs(m.created_at)}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="quick-replies-bar">
                {QUICK_REPLIES.map(r => <div key={r} className="quick-reply" onClick={() => setInput(r)}>{r}</div>)}
            </div>

            {showTemplates && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setShowTemplates(false)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setShowTemplates(false)}>✕</button>
                        <h2 className="modal-title">Quick Templates</h2>
                        {TEMPLATES.map(g => (
                            <div key={g.label} style={{ marginBottom: 14 }}>
                                <div className="tpl-label">{g.label}</div>
                                {g.texts.map(t => (
                                    <div key={t} className="template-item" onClick={() => { setInput(t); setShowTemplates(false); }}>
                                        <div className="tpl-text">{t}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Start Room Modal */}
            {showQuickStart && (
                <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setShowQuickStart(false)}>
                    <div className="modal-box" style={{ animation: 'fadeUp 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)' }}>
                        <button className="modal-close" onClick={() => setShowQuickStart(false)}>✕</button>
                        <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20 }}>
                            🎯 Start Study Room
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
                            Start an instant private session with <strong>{partner?.name}</strong>
                        </p>

                        <div className="form-group">
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Subject (Optional)</label>
                            <select value={qsSubject} onChange={e => setQsSubject(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', width: '100%', fontSize: 14 }}>
                                <option value="">Select subject...</option>
                                {['Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Operating Systems', 'Computer Networks'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Study Mode</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[['silent', '🤫 Silent'], ['discussion', '💬 Discussion'], ['doubt', '❓ Doubt']].map(([v, l]) => (
                                    <button key={v} className={`btn ${qsMode === v ? 'btn-primary' : 'btn-outline'} btn-sm`} style={{ flex: 1, padding: '8px 6px', fontSize: 13, transition: 'all 0.15s ease' }} onClick={() => setQsMode(v)}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: 15 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Duration</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {[[60, '1 hr'], [120, '2 hrs'], [180, '3 hrs']].map(([v, l]) => (
                                    <button key={v} className={`btn ${qsDuration === v ? 'btn-primary' : 'btn-outline'} btn-sm`} style={{ flex: 1, padding: '8px 6px', fontSize: 13, transition: 'all 0.15s ease' }} onClick={() => setQsDuration(v)}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary)', borderRadius: 8, padding: '12px 15px', marginTop: 24, marginBottom: 24, fontSize: 13, color: 'var(--text)', display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 20 }}>⚡</span>
                            <span><strong>{partner?.name || 'Your partner'}</strong> will be notified instantly to join your room.</span>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowQuickStart(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2, boxShadow: '0 4px 10px rgba(var(--primary-rgb), 0.3)' }} onClick={handleQuickStart}>🎯 Create & Start</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="chat-input-bar">
                <button className="icon-btn" onClick={() => setShowTemplates(true)}>💡</button>
                <input className="chat-text-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." maxLength={500} />
                <button className="btn btn-primary btn-sm" onClick={send}>Send</button>
            </div>
        </div>
    );
}
