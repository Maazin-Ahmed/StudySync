import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import API from '../api';

export default function OwnProfile() {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) setForm({ name: user.name || '', institution: user.institution || '', education: user.education || '', bio: user.bio || '' });
    }, [user]);

    const save = async () => {
        setSaving(true);
        try {
            const r = await API.put('/users/me', form);
            updateUser(r.data);
            setEditing(false);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);

    if (!user) return null;
    return (
        <div className="page" id="page-profile">
            <div className="app-layout">
                <header className="app-header">
                    <span className="page-title">Profile</span>
                    <button className="text-btn" onClick={() => setEditing(true)}>Edit</button>
                </header>
                <div className="page-content">
                    <div className="profile-hero">
                        <div className="profile-avatar">{user.avatar}</div>
                        <div className="profile-name">{user.name}</div>
                        {user.education && <div className="profile-edu">{user.education}</div>}
                        {user.institution && <div className="profile-inst">{user.institution}</div>}
                        <div className="profile-rating">⭐ {user.rating > 0 ? user.rating : 'New'} &nbsp;•&nbsp; {user.total_sessions || 0} sessions</div>
                    </div>

                    <div className="profile-section">
                        <div className="profile-section-label">Studying</div>
                        <div className="profile-subjects">{(user.subjects || []).map(s => <span key={s} className="profile-subject-tag">{s}</span>)}</div>
                    </div>
                    <div className="profile-section">
                        <div className="profile-section-label">Goal</div>
                        <div>{user.goal || 'Not set'}</div>
                    </div>
                    <div className="profile-section">
                        <div className="profile-section-label">Availability & Modes</div>
                        <div className="profile-avail-pills">{(user.availability || []).map(a => <span key={a} className="avail-pill">{a}</span>)}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text2)' }}>Modes: {(user.modes || []).map(modeLabel).join(', ') || 'Not set'}</div>
                    </div>
                    {user.bio && <div className="profile-section"><div className="profile-section-label">About</div><div className="profile-bio">{user.bio}</div></div>}
                    <div className="profile-section">
                        <div className="profile-section-label">Activity</div>
                        <div className="profile-stats-row">
                            <div className="pstat"><div className="pstat-num">{user.total_sessions || 0}</div><div className="pstat-lbl">Sessions</div></div>
                            <div className="pstat"><div className="pstat-num">{user.streak || 0}🔥</div><div className="pstat-lbl">Streak</div></div>
                            <div className="pstat"><div className="pstat-num">{user.rating || 0}</div><div className="pstat-lbl">Rating</div></div>
                        </div>
                    </div>
                    <button className="btn btn-danger btn-block" style={{ marginTop: 24 }} onClick={() => { logout(); navigate('/'); }}>Log Out</button>
                </div>
                <BottomNav />
            </div>

            {editing && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setEditing(false)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setEditing(false)}>✕</button>
                        <h2 className="modal-title">Edit Profile</h2>
                        <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div className="form-group"><label>Institution</label><input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="College / School" /></div>
                        <div className="form-group"><label>Education</label><input value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} placeholder="e.g. Final Year, CS" /></div>
                        <div className="form-group"><label>About You</label><textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} maxLength={150} /></div>
                        <button className="btn btn-primary btn-block" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </div>
            )}
        </div>
    );
}
