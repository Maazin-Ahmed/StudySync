import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function BuddyProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [relationship, setRelationship] = useState({ status: 'none' });
    const [showRequest, setShowRequest] = useState(false);
    const [form, setForm] = useState({ subject: '', mode: 'discussion', message: '' });
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        Promise.all([
            API.get(`/users/${id}`),
            API.get(`/buddies/check/${id}`),
        ]).then(([p, rel]) => {
            setProfile(p.data);
            setRelationship(rel.data);
            // Track profile view
            pool?.query?.('', []).catch?.(() => { });
        }).catch(() => { }).finally(() => setLoading(false));
    }, [id]);

    function calcMatch(partner) {
        if (!user || !partner) return 0;
        let score = 0;
        const subOv = (partner.subjects || []).filter(s => (user.subjects || []).includes(s)).length;
        score += Math.min(40, subOv * 20);
        if (partner.goal === user.goal) score += 25; else score += 10;
        const modeOv = (partner.modes || []).filter(m => (user.modes || []).includes(m)).length;
        score += Math.min(20, modeOv * 10);
        const avOv = (partner.availability || []).filter(a => (user.availability || []).includes(a)).length;
        score += Math.min(10, avOv * 5);
        score += Math.min(5, Math.round(partner.rating || 0));
        return Math.min(99, Math.max(30, score));
    }

    const sendRequest = async () => {
        if (!form.subject) { setError('Please select a subject'); return; }
        setSending(true); setError('');
        try {
            await API.post('/buddies', { buddyId: id, ...form });
            setRelationship({ status: 'pending', isSender: true });
            setShowRequest(false);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to send request');
        } finally { setSending(false); }
    };

    const modeLabel = m => ({ silent: '🤫 Silent Co-study', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);

    if (loading) return (
        <div className="page"><div className="app-layout">
            <header className="app-header"><button className="back-btn" onClick={() => navigate(-1)}>← Back</button></header>
            <div className="page-content">
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="skeleton skel-circle" style={{ width: 72, height: 72, margin: '0 auto 16px' }} />
                    <div className="skeleton skel-line w-50" style={{ margin: '0 auto 8px', width: 160 }} />
                    <div className="skeleton skel-line w-40" style={{ margin: '0 auto', width: 120 }} />
                </div>
                <div className="profile-section"><div className="skeleton skel-line" /><div className="skeleton skel-line w-75" /></div>
                <div className="profile-section"><div className="skeleton skel-line" /><div className="skeleton skel-line w-50" /></div>
            </div>
        </div></div>
    );

    if (!profile) return (
        <div className="page"><div className="app-layout">
            <header className="app-header"><button className="back-btn" onClick={() => navigate(-1)}>← Back</button></header>
            <div className="empty-state"><div className="empty-icon">😕</div><div className="empty-title">Profile not found</div></div>
        </div></div>
    );

    const matchPct = calcMatch(profile);
    const mc = matchPct >= 80 ? 'high' : matchPct >= 65 ? 'mid' : 'low';

    return (
        <div className="page" id="page-buddy-profile" style={{ paddingBottom: 100 }}>
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                    {relationship.status === 'accepted' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/chats/${id}`)}>💬 Message</button>
                    )}
                </header>
                <div className="page-content">
                    <div className="profile-hero">
                        <div className="profile-avatar">{profile.avatar}</div>
                        <div className="profile-name">{profile.name}</div>
                        {profile.education && <div className="profile-edu">{profile.education}</div>}
                        {profile.institution && <div className="profile-inst">🏫 {profile.institution}</div>}
                        <div className="profile-rating">⭐ {profile.rating > 0 ? profile.rating : 'New'} &nbsp;•&nbsp; {profile.total_sessions || 0} sessions</div>
                    </div>

                    <div className={`match-score-banner ${mc}`}>
                        <div className="match-pct">{matchPct}%</div>
                        <div className="match-desc">
                            <strong>Match Score</strong><br />
                            {mc === 'high' ? 'Excellent compatibility! You two should study great together.' : mc === 'mid' ? 'Good match — try a session and see!' : 'Some differences, but that can be a good thing.'}
                        </div>
                    </div>

                    <div className="profile-section">
                        <div className="profile-section-label">Subjects</div>
                        <div className="profile-subjects">
                            {(profile.subjects || []).map(s => {
                                const shared = (user?.subjects || []).includes(s);
                                return <span key={s} className="profile-subject-tag" style={shared ? { background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.2)' } : {}}>{s} {shared && '✓'}</span>;
                            })}
                        </div>
                    </div>
                    <div className="profile-section">
                        <div className="profile-section-label">Goal</div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{profile.goal || 'Not specified'}</div>
                    </div>
                    <div className="profile-section">
                        <div className="profile-section-label">Availability & Modes</div>
                        <div className="profile-avail-pills">{(profile.availability || []).map(a => <span key={a} className="avail-pill">{a}</span>)}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)' }}>
                            {(profile.modes || []).map(modeLabel).join(' • ') || 'Not specified'}
                        </div>
                    </div>
                    {profile.bio && (
                        <div className="profile-section">
                            <div className="profile-section-label">About</div>
                            <div className="profile-bio">{profile.bio}</div>
                        </div>
                    )}
                    <div className="profile-section">
                        <div className="profile-section-label">Stats</div>
                        <div className="profile-stats-row">
                            <div className="pstat"><div className="pstat-num">{profile.total_sessions || 0}</div><div className="pstat-lbl">Sessions</div></div>
                            <div className="pstat"><div className="pstat-num">{profile.streak || 0}🔥</div><div className="pstat-lbl">Streak</div></div>
                            <div className="pstat"><div className="pstat-num">{profile.rating > 0 ? profile.rating : '—'}</div><div className="pstat-lbl">Rating</div></div>
                        </div>
                    </div>
                </div>

                {/* CTA Bar */}
                <div className="buddy-profile-actions">
                    {relationship.status === 'none' && (
                        <button className="btn btn-primary btn-block" onClick={() => setShowRequest(true)}>
                            ✉️ Send Study Buddy Request
                        </button>
                    )}
                    {relationship.status === 'pending' && relationship.isSender && (
                        <div style={{ textAlign: 'center', padding: 8 }}>
                            <span className="req-status-chip pending">⏳ Request Pending</span>
                            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>Waiting for {profile.name} to accept</div>
                        </div>
                    )}
                    {relationship.status === 'pending' && !relationship.isSender && (
                        <button className="btn btn-primary btn-block" onClick={() => navigate('/app/requests')}>View Request →</button>
                    )}
                    {relationship.status === 'accepted' && (
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate(`/app/chats/${id}`)}>💬 Chat</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/app/session/create?partnerId=${id}`)}>📅 Schedule Session</button>
                        </div>
                    )}
                </div>
            </div>

            {showRequest && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setShowRequest(false)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setShowRequest(false)}>✕</button>
                        <div className="modal-logo">✉️</div>
                        <h2 className="modal-title">Send Buddy Request</h2>
                        <p className="modal-sub">to {profile.name}</p>
                        <div className="form-group">
                            <label>Subject to study together *</label>
                            <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                                <option value="">Select a subject</option>
                                {['Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'GATE Prep', 'CAT Prep', 'UPSC', 'JEE / NEET', 'English / IELTS', 'Business'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Study Mode</label>
                            <div className="radio-stack">
                                {['silent', 'discussion', 'doubt'].map(m => (
                                    <label key={m} className="radio-card">
                                        <input type="radio" checked={form.mode === m} onChange={() => setForm(f => ({ ...f, mode: m }))} />
                                        <span>{modeLabel(m)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Message (optional)</label>
                            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={3} maxLength={500} placeholder={`Hey ${profile.name.split(' ')[0]}! I'm looking for a study partner for DSA prep — interested in studying together evenings?`} />
                        </div>
                        {error && <div className="form-error">{error}</div>}
                        <button className="btn btn-primary btn-block" onClick={sendRequest} disabled={sending}>{sending ? 'Sending...' : 'Send Request 🤝'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
