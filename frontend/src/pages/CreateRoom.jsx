import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const SUBJECTS = ['Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'GATE Prep', 'CAT Prep', 'UPSC', 'JEE / NEET', 'English / IELTS', 'Business'];
const CAPACITIES = [5, 10, 20, 50, null];
const CAP_LABEL = v => v === null ? 'Unlimited' : String(v);

const PERMS = [
    { id: 'open', icon: '🌍', title: 'Open to Everyone', desc: 'Anyone can discover and join instantly', color: 'var(--success)' },
    { id: 'link', icon: '🔗', title: 'Anyone with Link', desc: 'Not publicly listed — share link to invite', color: 'var(--primary)' },
    { id: 'request', icon: '🚪', title: 'Request to Join', desc: 'Visible publicly, but you approve each join', color: 'var(--warning)' },
    { id: 'private', icon: '🔒', title: 'Invite Only', desc: 'Hidden — only people you invite can join', color: 'var(--text-3)' },
];

export default function CreateRoom() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1); // 1=basics, 2=permission, 3=settings/invite
    const [form, setForm] = useState({
        name: '', subject: '', topic: '', mode: 'silent',
        permission: '', duration_hrs: 2, capacity: null,
        auto_approve_buddies: false, auto_approve_min_rating: null, require_join_message: false,
        invite_message: '',
    });
    const [buddies, setBuddies] = useState([]);
    const [selectedBuddies, setSelectedBuddies] = useState([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (form.permission === 'private') {
            API.get('/buddies').then(r => setBuddies(r.data)).catch(() => { });
        }
    }, [form.permission]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const next = () => {
        if (step === 1) {
            if (!form.name.trim()) return setError('Room name is required');
            if (!form.subject) return setError('Please select a subject');
        }
        if (step === 2 && !form.permission) return setError('Please choose who can join');
        setError('');
        setStep(s => s + 1);
    };

    const handleCreate = async () => {
        setCreating(true); setError('');
        try {
            const payload = { ...form, invite_buddies: selectedBuddies };
            const r = await API.post('/rooms', payload);
            setResult(r.data);
        } catch (e) { setError(e.response?.data?.error || 'Failed to create room'); }
        finally { setCreating(false); }
    };

    if (result) {
        return (
            <div className="page">
                <div className="app-layout">
                    <header className="app-header"><span className="page-title">Room Created!</span></header>
                    <div className="page-content" style={{ textAlign: 'center', paddingTop: 40 }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>{PERMS.find(p => p.id === result.permission)?.icon || '🏠'}</div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{result.name}</div>
                        <div style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600, marginBottom: 24 }}>✅ Room created successfully!</div>

                        {result.link_url && (
                            <div style={{ background: 'var(--primary-subtle)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>🔗 Shareable Link</div>
                                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, wordBreak: 'break-all' }}>
                                    {window.location.origin}{result.link_url}
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={() => navigator.clipboard.writeText(window.location.origin + result.link_url)}>
                                    Copy Link
                                </button>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate('/app/rooms')}>← Browse Rooms</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/app/rooms/${result.id}/lobby`)}>Open Room →</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/app/rooms')}>← {step > 1 ? 'Back' : 'Rooms'}</button>
                    <span className="page-title">Create Study Room</span>
                </header>
                <div className="page-content">
                    <div className="step-indicator">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`step-dot ${s === step ? 'active' : s < step ? 'done' : ''}`} />
                        ))}
                    </div>

                    {step === 1 && (
                        <>
                            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Room Details</h2>
                            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>Set up your study room basics</p>

                            <div className="form-group">
                                <label>Room Name *</label>
                                <input value={form.name} onChange={e => set('name', e.target.value)} maxLength={100} placeholder="e.g., DSA Practice Session, GATE Prep 2026" />
                            </div>
                            <div className="form-group">
                                <label>Subject *</label>
                                <select value={form.subject} onChange={e => set('subject', e.target.value)}>
                                    <option value="">Select a subject</option>
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Topic (Optional)</label>
                                <input value={form.topic} onChange={e => set('topic', e.target.value)} maxLength={200} placeholder="e.g., Trees & Graphs, Thermodynamics Chapter 3" />
                            </div>
                            <div className="form-group">
                                <label>Study Mode</label>
                                <div className="radio-stack">
                                    {[['silent', '🤫 Silent Co-Study', 'Everyone works quietly, no talking'], ['discussion', '💬 Discussion-Based', 'Open conversation and collaboration'], ['doubt', '❓ Doubt Clearing', 'Ask and answer questions together']].map(([val, title, desc]) => (
                                        <label key={val} className="radio-card">
                                            <input type="radio" checked={form.mode === val} onChange={() => set('mode', val)} />
                                            <div><div style={{ fontWeight: 600 }}>{title}</div><div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{desc}</div></div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Duration</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {[0.5, 1, 1.5, 2, 3, 4].map(h => (
                                        <button key={h} className={`subj-chip ${form.duration_hrs === h ? 'selected' : ''}`} onClick={() => set('duration_hrs', h)}>{h}h</button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Who Can Join?</h2>
                            <p style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 20 }}>Choose the access level for your room</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {PERMS.map(p => (
                                    <div key={p.id}
                                        onClick={() => set('permission', p.id)}
                                        style={{ padding: '16px 18px', borderRadius: 'var(--radius-md)', border: `1.5px solid ${form.permission === p.id ? p.color : 'var(--border)'}`, background: form.permission === p.id ? `${p.color}08` : 'var(--surface)', cursor: 'pointer', transition: 'all var(--transition)', display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ fontSize: 28, flexShrink: 0 }}>{p.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: form.permission === p.id ? p.color : 'var(--text)' }}>{p.title}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{p.desc}</div>
                                        </div>
                                        {form.permission === p.id && <div style={{ color: p.color, fontSize: 20 }}>✓</div>}
                                    </div>
                                ))}
                            </div>

                            <div className="form-group" style={{ marginTop: 20 }}>
                                <label>Maximum Participants</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {CAPACITIES.map(c => (
                                        <button key={c ?? 'unlimited'} className={`subj-chip ${form.capacity === c ? 'selected' : ''}`} onClick={() => set('capacity', c)}>{CAP_LABEL(c)}</button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                                {form.permission === 'private' ? '🔒 Invite Study Buddies' : form.permission === 'request' ? '🚪 Approval Settings' : form.permission === 'link' ? '🔗 Link Settings' : '🌍 Final Details'}
                            </h2>

                            {form.permission === 'request' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                                    <label className="check-card"><input type="checkbox" checked={form.auto_approve_buddies} onChange={e => set('auto_approve_buddies', e.target.checked)} /><span>Auto-approve my study buddies</span></label>
                                    <label className="check-card"><input type="checkbox" checked={form.require_join_message} onChange={e => set('require_join_message', e.target.checked)} /><span>Require a message when requesting</span></label>
                                    {form.auto_approve_buddies && (
                                        <div className="form-group">
                                            <label>Also auto-approve users with rating ≥</label>
                                            <select value={form.auto_approve_min_rating || ''} onChange={e => set('auto_approve_min_rating', e.target.value ? parseFloat(e.target.value) : null)}>
                                                <option value="">Don't auto-approve by rating</option>
                                                <option value="4.0">4.0 ⭐ and above</option>
                                                <option value="4.5">4.5 ⭐ and above</option>
                                                <option value="4.8">4.8 ⭐ and above</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            {form.permission === 'private' && (
                                <>
                                    {buddies.length === 0 ? (
                                        <div className="empty-state-sm">You need study buddies to invite to a private room. <span className="link" onClick={() => navigate('/app/find')}>Find Partners first</span>.</div>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>Select study buddies to invite:</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                                {buddies.map(b => {
                                                    const partnerId = b.buddy_id === user?.id ? b.user_id : b.buddy_id;
                                                    const isSelected = selectedBuddies.includes(partnerId);
                                                    return (
                                                        <label key={b.id} className="check-card" style={isSelected ? { borderColor: 'var(--primary)', background: 'var(--primary-subtle)' } : {}}>
                                                            <input type="checkbox" checked={isSelected} onChange={() => setSelectedBuddies(prev => isSelected ? prev.filter(id => id !== partnerId) : [...prev, partnerId])} />
                                                            <span style={{ fontSize: 22 }}>{b.avatar}</span>
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>{b.name}</div>
                                                                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>⭐ {b.rating}</div>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <div className="form-group">
                                                <label>Personal Message (Optional)</label>
                                                <textarea value={form.invite_message} onChange={e => set('invite_message', e.target.value)} rows={2} maxLength={300} placeholder="Hey! Want to study together? I'm free for the next 2 hours 😊" />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 20 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Room Summary</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: 'var(--text-2)' }}>
                                    <div>📝 <strong>{form.name}</strong></div>
                                    <div>📚 {form.subject}{form.topic ? ` — ${form.topic}` : ''}</div>
                                    <div>🎯 {form.mode === 'silent' ? '🤫 Silent' : form.mode === 'discussion' ? '💬 Discussion' : '❓ Doubt Clearing'} • {form.duration_hrs}h</div>
                                    <div>{PERMS.find(p => p.id === form.permission)?.icon} {PERMS.find(p => p.id === form.permission)?.title} • {form.capacity ?? 'Unlimited'} participants</div>
                                </div>
                            </div>
                        </>
                    )}

                    {error && <div className="form-error">{error}</div>}

                    <div className="step-nav">
                        {step < 3 ? (
                            <button className="btn btn-primary btn-block" onClick={next}>Continue →</button>
                        ) : (
                            <button className="btn btn-primary btn-block" onClick={handleCreate} disabled={creating}>
                                {creating ? 'Creating...' : form.permission === 'private' && selectedBuddies.length > 0 ? `Create & Invite ${selectedBuddies.length} Buddy${selectedBuddies.length > 1 ? 'ies' : ''}` : 'Create Room 🚀'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
