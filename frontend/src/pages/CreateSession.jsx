import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function CreateSession() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const [buddies, setBuddies] = useState([]);
    const [form, setForm] = useState({ partnerId: params.get('partnerId') || '', subject: '', topic: '', mode: 'silent', durationHrs: 1, scheduledAt: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        API.get('/connections').then(r => setBuddies(r.data)).catch(() => { });
        const now = new Date(); now.setHours(19, 0, 0, 0);
        setForm(f => ({ ...f, scheduledAt: now.toISOString().slice(0, 16) }));
    }, []);

    const submit = async () => {
        if (!form.subject) { alert('Please select a subject'); return; }
        setCreating(true);
        try {
            const r = await API.post('/sessions', { ...form, durationHrs: parseFloat(form.durationHrs) });
            navigate(`/app/session/${r.data.id}/lobby`);
        } catch (e) { alert(e.response?.data?.error || 'Failed to create session'); }
        finally { setCreating(false); }
    };

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
                    <span className="page-title">New Session</span>
                </header>
                <div className="page-content">
                    {buddies.length > 0 && (
                        <div className="form-group">
                            <label>Study Partner (optional)</label>
                            <select value={form.partnerId} onChange={e => setForm(f => ({ ...f, partnerId: e.target.value }))}>
                                <option value="">Solo session</option>
                                {buddies.map(b => {
                                    const pid = b.partner_id === user?.id ? b.user_id : b.partner_id;
                                    return <option key={pid} value={pid}>{b.avatar} {b.name}</option>;
                                })}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label>Subject</label>
                        <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                            <option value="">Select subject</option>
                            {['Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'GATE Prep', 'CAT Prep', 'Other'].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Topic (optional)</label>
                        <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. Trees and Graphs" />
                    </div>
                    <div className="form-group">
                        <label>Study Mode</label>
                        <div className="radio-stack">
                            {['silent', 'discussion', 'doubt'].map(m => (
                                <label key={m} className="radio-card">
                                    <input type="radio" checked={form.mode === m} onChange={() => setForm(f => ({ ...f, mode: m }))} />
                                    <span>{{ silent: '🤫 Silent Co-study', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m]}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="filter-row">
                        <div className="form-group half">
                            <label>When</label>
                            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
                        </div>
                        <div className="form-group half">
                            <label>Duration (hrs)</label>
                            <select value={form.durationHrs} onChange={e => setForm(f => ({ ...f, durationHrs: e.target.value }))}>
                                <option value={1}>1 hour</option>
                                <option value={1.5}>1.5 hours</option>
                                <option value={2}>2 hours</option>
                                <option value={3}>3 hours</option>
                            </select>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-block" onClick={submit} disabled={creating}>{creating ? 'Creating...' : 'Create Session 🚀'}</button>
                </div>
            </div>
        </div>
    );
}
