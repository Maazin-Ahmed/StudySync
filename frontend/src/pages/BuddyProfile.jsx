import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

function calcMatch(p, user) {
    if (!user) return 50;
    let score = 0;
    const sub = (p.subjects || []).filter(s => (user.subjects || []).includes(s)).length;
    score += Math.min(40, sub * 20);
    if (p.goal === user.goal) score += 25; else score += 10;
    const mo = (p.modes || []).filter(m => (user.modes || []).includes(m)).length;
    score += Math.min(20, mo * 10);
    const av = (p.availability || []).filter(a => (user.availability || []).includes(a)).length;
    score += Math.min(10, av * 5);
    score += Math.min(5, Math.round(p.rating || 0));
    return Math.min(99, Math.max(30, score));
}

const TMPL = {
    intro: (n, s) => `Hey ${n}! I saw your profile and think we'd make great study partners for ${s}. Would you like to connect?`,
    doubt: (n, s) => `Hi ${n}! I'm struggling with some ${s} concepts. Could you help with a doubt-clearing session?`,
    regular: (n, s) => `Hey ${n}! Looking for a consistent study partner for ${s}. Want to try a session?`,
};

export default function BuddyProfile() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [partner, setPartner] = useState(null);
    const [showReq, setShowReq] = useState(false);
    const [req, setReq] = useState({ subject: '', mode: 'discussion', scheduledWhen: 'Flexible', duration: '2 hours', message: '' });
    const [sending, setSending] = useState(false);
    const [reqStatus, setReqStatus] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        API.get(`/users/${id}`).then(r => {
            setPartner(r.data);
            setReq(f => ({ ...f, subject: (r.data.subjects || [])[0] || '' }));
        }).catch(() => navigate('/app/find'));
        API.get('/connections/requests/sent').then(r => {
            const ex = r.data.find(x => x.partner_id === id);
            if (ex) setReqStatus(ex.status);
        }).catch(() => { });
        API.get('/connections').then(r => {
            if (r.data.find(c => c.partner_id === id || c.user_id === id)) setIsConnected(true);
        }).catch(() => { });
    }, [id]);

    const sendRequest = async () => {
        setSending(true);
        try {
            await API.post('/connections', { partnerId: id, ...req });
            setReqStatus('pending');
            setShowReq(false);
        } catch (e) {
            if (e.response?.data?.status) setReqStatus(e.response.data.status);
        } finally { setSending(false); }
    };

    if (!partner) return <div className="loading-full"><div className="spinner" /></div>;

    const match = calcMatch(partner, user);
    const mc = match >= 80 ? 'high' : match >= 65 ? 'mid' : 'low';
    const shared = (partner.subjects || []).filter(s => (user?.subjects || []).includes(s));
    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);

    return (
        <div className="page" id="page-buddy-profile">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                    <span className="page-title">{partner.name}</span>
                </header>
                <div className="page-content" style={{ paddingBottom: 120 }}>
                    <div className="profile-hero">
                        <div className="profile-avatar">{partner.avatar}</div>
                        <div className="profile-name">{partner.name}</div>
                        {partner.education && <div className="profile-edu">{partner.education}</div>}
                        {partner.institution && <div className="profile-inst">{partner.institution}</div>}
                        <div className="profile-rating">⭐ {partner.rating} &nbsp;•&nbsp; {partner.total_sessions} sessions</div>
                    </div>

                    <div className={`match-score-banner ${mc}`}>
                        <div className="match-pct">{match}% Match</div>
                        {shared.length > 0 ? <div className="match-desc">Shared: {shared.join(', ')}</div> : <div className="match-desc">Similar study patterns</div>}
                    </div>

                    <div className="profile-section">
                        <div className="profile-section-label">Studying</div>
                        <div className="profile-subjects">{(partner.subjects || []).map(s => <span key={s} className="profile-subject-tag">{s}</span>)}</div>
                    </div>
                    <div className="profile-section">
                        <div className="profile-section-label">Goal</div>
                        <div>{partner.goal || '—'}</div>
                    </div>
                    <div className="profile-section">
                        <div className="profile-section-label">Available</div>
                        <div className="profile-avail-pills">{(partner.availability || []).map(a => <span key={a} className="avail-pill">{a}</span>)}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text2)' }}>Modes: {(partner.modes || []).map(modeLabel).join(', ') || '—'}</div>
                    </div>
                    {partner.bio && <div className="profile-section"><div className="profile-section-label">About</div><div className="profile-bio">{partner.bio}</div></div>}
                </div>

                <div className="buddy-profile-actions">
                    {isConnected
                        ? <button className="btn btn-primary btn-block" style={{ margin: 0 }} onClick={() => navigate(`/app/chats/${id}`)}>💬 Chat with {partner.name.split(' ')[0]}</button>
                        : reqStatus
                            ? <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text2)' }}>Request {reqStatus === 'pending' ? '⏳ Pending...' : reqStatus === 'accepted' ? '✅ Accepted' : reqStatus}</div>
                            : <button className="btn btn-primary btn-block" style={{ margin: 0 }} onClick={() => setShowReq(true)}>Send Study Request ✉️</button>
                    }
                </div>
            </div>

            {showReq && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setShowReq(false)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setShowReq(false)}>✕</button>
                        <h2 className="modal-title">Send Study Request</h2>
                        <p className="modal-sub">to {partner.name}</p>
                        <div className="form-group"><label>Subject</label>
                            <select value={req.subject} onChange={e => setReq(f => ({ ...f, subject: e.target.value }))}>
                                {(partner.subjects || []).concat(['Other']).map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label>Mode</label>
                            <select value={req.mode} onChange={e => setReq(f => ({ ...f, mode: e.target.value }))}>
                                <option value="silent">Silent Pomodoro</option>
                                <option value="discussion">Discussion</option>
                                <option value="doubt">Doubt Clearing</option>
                            </select>
                        </div>
                        <div className="filter-row">
                            <div className="form-group half"><label>When</label>
                                <select value={req.scheduledWhen} onChange={e => setReq(f => ({ ...f, scheduledWhen: e.target.value }))}>
                                    <option>Today evening</option><option>Tomorrow</option><option>This weekend</option><option>Flexible</option>
                                </select>
                            </div>
                            <div className="form-group half"><label>Duration</label>
                                <select value={req.duration} onChange={e => setReq(f => ({ ...f, duration: e.target.value }))}>
                                    <option>1 hour</option><option>2 hours</option><option>3 hours</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Message</label>
                            <textarea value={req.message} onChange={e => setReq(f => ({ ...f, message: e.target.value }))} placeholder="Why do you want to study together?" rows={3} />
                            <div className="template-pills">
                                {Object.entries(TMPL).map(([k, fn]) => (
                                    <span key={k} className="tpill" onClick={() => setReq(f => ({ ...f, message: fn(partner.name.split(' ')[0], req.subject || 'your subject') }))}>{k}</span>
                                ))}
                            </div>
                        </div>
                        <button className="btn btn-primary btn-block" disabled={sending} onClick={sendRequest}>{sending ? 'Sending...' : 'Send Request ✉️'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
