import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const FOCUS_SECS = 25 * 60;
const BREAK_SECS = 5 * 60;

export default function ActiveSession() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [secs, setSecs] = useState(FOCUS_SECS);
    const [total, setTotal] = useState(FOCUS_SECS);
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState('focus');
    const [pomos, setPomos] = useState(0);
    const [task, setTask] = useState('');
    const [showPost, setShowPost] = useState(false);
    const [rating, setRating] = useState(0);
    const [notes, setNotes] = useState('');
    const intervalRef = useRef(null);

    useEffect(() => {
        API.get('/sessions').then(r => setSession(r.data.find(x => x.id === id))).catch(() => { });
        return () => clearInterval(intervalRef.current);
    }, [id]);

    const toggle = () => {
        if (running) { clearInterval(intervalRef.current); setRunning(false); }
        else {
            setRunning(true);
            intervalRef.current = setInterval(() => {
                setSecs(s => {
                    if (s <= 1) {
                        clearInterval(intervalRef.current); setRunning(false);
                        if (phase === 'focus') { setPomos(p => p + 1); setPhase('break'); setSecs(BREAK_SECS); setTotal(BREAK_SECS); }
                        else { setPhase('focus'); setSecs(FOCUS_SECS); setTotal(FOCUS_SECS); }
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        }
    };

    const takeBreak = () => {
        clearInterval(intervalRef.current); setRunning(false);
        setPhase('break'); setSecs(BREAK_SECS); setTotal(BREAK_SECS);
    };

    const endSession = async () => {
        clearInterval(intervalRef.current); setRunning(false);
        setShowPost(true);
    };

    const submitPost = async () => {
        try { await API.put(`/sessions/${id}/complete`, { rating, notes }); }
        catch (e) { }
        navigate('/app/home');
    };

    const pad = n => String(n).padStart(2, '0');
    const fmt = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    const pct = secs / total;
    const circ = 628.32;
    const offset = circ * (1 - pct);

    return (
        <div className="page">
            <div className="session-layout">
                {session && (
                    <div className="session-partner-bar">
                        <div className="session-partner-info">
                            <div className="sp-avatar">{session.partner_avatar || '👤'}</div>
                            <div><div className="sp-name">{session.partner_name || 'Solo'}</div><div className="sp-status">🟢 Studying</div></div>
                        </div>
                        <div className="sp-subject">{session.subject}</div>
                    </div>
                )}

                <div className="session-phase">{phase === 'focus' ? '🎯 Focus Time' : '☕ Break Time'}</div>

                <div className="session-timer-wrap">
                    <div className="session-timer-progress">
                        <svg className="session-ring" viewBox="0 0 220 220">
                            <defs>
                                <linearGradient id="sGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#5B8EFF' }} />
                                    <stop offset="100%" style={{ stopColor: '#42DBC8' }} />
                                </linearGradient>
                            </defs>
                            <circle className="s-ring-bg" cx="110" cy="110" r="100" />
                            <circle className="s-ring-fill" cx="110" cy="110" r="100"
                                strokeDasharray={circ} strokeDashoffset={offset}
                                style={{ transition: 'stroke-dashoffset 1s linear' }} />
                        </svg>
                        <div className="session-timer-overlay">
                            <div className="session-time">{fmt(secs)}</div>
                            <div className="session-time-label">remaining</div>
                        </div>
                    </div>
                    <div className="session-count">{pomos} session{pomos !== 1 ? 's' : ''} done</div>
                </div>

                <div className="session-task-bar">
                    <input className="session-task-input" value={task} onChange={e => setTask(e.target.value)} placeholder="📋 What are you working on?" />
                </div>

                <div className="session-controls">
                    <button className="ctrl-btn" onClick={toggle}>{running ? '⏸ Pause' : '▶ Start'}</button>
                    <button className="ctrl-btn ctrl-secondary" onClick={takeBreak}>☕ Break</button>
                    <button className="ctrl-btn ctrl-danger" onClick={endSession}>✕ End</button>
                </div>
            </div>

            {showPost && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <div className="modal-logo">✅</div>
                        <h2 className="modal-title">Session Complete!</h2>
                        <p className="modal-sub">You studied for {session?.duration_hrs || 1} hour{session?.duration_hrs !== 1 ? 's' : ''}{session?.partner_name ? ' with ' + session.partner_name : ''}</p>
                        <div className="form-group">
                            <label>How was the session?</label>
                            <div className="star-rating">
                                {[1, 2, 3, 4, 5].map(v => (
                                    <span key={v} onClick={() => setRating(v)} style={{ opacity: v <= rating ? 1 : 0.3, cursor: 'pointer', fontSize: 32, transition: 'all 0.15s', transform: v <= rating ? 'scale(1.2)' : 'scale(1)', display: 'inline-block' }}>⭐</span>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>What did you cover?</label>
                            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Linked lists, binary trees..." />
                        </div>
                        <button className="btn btn-primary btn-block" onClick={submitPost}>Save & Go Home</button>
                    </div>
                </div>
            )}
        </div>
    );
}
