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
    const bottomRef = useRef(null);

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
            <header className="chat-header-bar">
                <button className="back-btn" onClick={() => navigate('/app/chats')}>←</button>
                <div className="chat-header-info">
                    <div className="chat-header-avatar">{partner?.avatar || '👤'}</div>
                    <div>
                        <div className="chat-partner-name">{partner?.name || '...'}</div>
                        <div className="chat-partner-status">🟢 Active now</div>
                    </div>
                </div>
                <button className="icon-btn" onClick={() => navigate('/app/session/create')} title="Schedule session">📅</button>
            </header>

            <div className="chat-messages-area">
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

            <div className="chat-input-bar">
                <button className="icon-btn" onClick={() => setShowTemplates(true)}>💡</button>
                <input className="chat-text-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Type a message..." maxLength={500} />
                <button className="btn btn-primary btn-sm" onClick={send}>Send</button>
            </div>
        </div>
    );
}
