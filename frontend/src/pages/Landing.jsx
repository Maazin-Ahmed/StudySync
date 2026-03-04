import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AVATARS = ['👩‍💻', '🧑‍💻', '👨‍🔬', '👩‍🎓', '🎓', '🧠', '📖', '🚀', '⚡', '🌟'];
const SUBJECTS = ['Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'GATE Prep', 'CAT Prep', 'UPSC', 'JEE / NEET', 'English / IELTS', 'Business'];

export default function Landing() {
    const { login, register, user } = useAuth();
    const navigate = useNavigate();
    const [modal, setModal] = useState(null); // 'login' | 'signup'
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ name: '', email: '', password: '', subjects: [], goal: '', availability: [], modes: [], avatar: AVATARS[0] });
    const [err, setErr] = useState('');
    const [loading, setLoading] = useState(false);

    if (user) { navigate('/app/home'); return null; }

    const toggleSubject = (s) => {
        setForm(f => ({
            ...f,
            subjects: f.subjects.includes(s) ? f.subjects.filter(x => x !== s) : f.subjects.length < 3 ? [...f.subjects, s] : f.subjects
        }));
    };
    const toggleArr = (key, val) => setForm(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val] }));

    const doLogin = async (e) => {
        e.preventDefault(); setErr(''); setLoading(true);
        try { await login(form.email, form.password); navigate('/app/home'); }
        catch (e) { setErr(e.response?.data?.error || 'Login failed'); }
        finally { setLoading(false); }
    };

    const doRegister = async () => {
        setErr(''); setLoading(true);
        try {
            const av = AVATARS[Math.floor(Math.random() * AVATARS.length)];
            await register({ ...form, avatar: av });
            navigate('/app/find');
        } catch (e) { setErr(e.response?.data?.error || 'Registration failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page" id="page-landing">
            <nav className="nav">
                <div className="nav-logo">
                    <span className="logo-icon">📚</span>
                    <span className="logo-text">StudySync</span>
                </div>
                <div className="nav-actions">
                    <button className="btn btn-ghost" onClick={() => { setModal('login'); setErr(''); }}>Sign In</button>
                    <button className="btn btn-primary" onClick={() => { setModal('signup'); setStep(1); setErr(''); }}>Get Started Free</button>
                </div>
            </nav>

            <section className="hero">
                <div className="hero-badge">🎯 Your study buddy is one tap away</div>
                <h1 className="hero-title">Never Study<br /><span className="gradient-text">Alone Again</span></h1>
                <p className="hero-subtitle">Find compatible study partners, coordinate focused sessions, and stay accountable.</p>
                <div className="hero-cta">
                    <button className="btn btn-primary btn-lg" onClick={() => { setModal('signup'); setStep(1); }}>Find My Study Buddy</button>
                    <button className="btn btn-outline btn-lg" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>How It Works</button>
                </div>
                <div className="hero-visual">
                    <div className="match-preview-card">
                        <div className="mp-header">
                            <div className="mp-avatar">👩‍💻</div>
                            <div className="mp-info"><div className="mp-name">Anjali Reddy</div><div className="mp-sub">DSA · Placement Prep</div></div>
                            <div className="mp-match">89%<span>match</span></div>
                        </div>
                        <div className="mp-tags"><span className="tag">Discussion</span><span className="tag">Evenings</span><span className="tag">⭐ 4.9</span></div>
                        <div className="mp-actions">
                            <button className="btn btn-primary btn-sm" onClick={() => setModal('signup')}>Send Request</button>
                        </div>
                    </div>
                </div>
                <div className="hero-stats">
                    <div className="stat"><span className="stat-num">12+</span><span className="stat-label">Demo Users</span></div>
                    <div className="stat-divider"></div>
                    <div className="stat"><span className="stat-num">5</span><span className="stat-label">Subjects</span></div>
                    <div className="stat-divider"></div>
                    <div className="stat"><span className="stat-num">100%</span><span className="stat-label">Real DB</span></div>
                </div>
            </section>

            <section className="features" id="features">
                <h2 className="section-title">Quiet. Focused. <span className="gradient-text">Effective.</span></h2>
                <div className="feature-grid">
                    {[['🎯', 'Smart Matching', 'Matched by subject, skill level, study goal, and availability.'], ['💬', 'Focused Chat', 'Coordinate sessions with smart templates.'], ['⏱️', 'Study Sessions', 'Pomodoro-synced co-study with accountability nudges.'], ['🔥', 'Accountability', 'Streaks, session history, and partner ratings.']].map(([icon, h, p]) => (
                        <div key={h} className="feature-card"><div className="feature-icon">{icon}</div><h3>{h}</h3><p>{p}</p></div>
                    ))}
                </div>
            </section>

            {/* LOGIN MODAL */}
            {modal === 'login' && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setModal(null)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        <div className="modal-logo">📚</div>
                        <h2 className="modal-title">Welcome Back</h2>
                        <p className="modal-sub">Sign in to StudySync</p>
                        <form onSubmit={doLogin}>
                            <div className="form-group"><label>Email</label><input required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" /></div>
                            <div className="form-group"><label>Password</label><input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" /></div>
                            {err && <div className="form-error">{err}</div>}
                            <button className="btn btn-primary btn-block" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
                        </form>
                        <div className="modal-footer-link">New here? <a href="#" onClick={e => { e.preventDefault(); setModal('signup'); setStep(1); }}>Create Account</a></div>
                        <div className="modal-footer-link" style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>Demo: any seeded user's email + "demo1234"</div>
                    </div>
                </div>
            )}

            {/* SIGNUP MODAL */}
            {modal === 'signup' && (
                <div className="modal-overlay" onClick={e => e.target.className === 'modal-overlay' && setModal(null)}>
                    <div className="modal-box">
                        <button className="modal-close" onClick={() => setModal(null)}>✕</button>
                        <div className="step-indicator">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className={`step-dot ${i < step ? 'done' : i === step ? 'active' : ''}`}></div>)}
                        </div>

                        {step === 1 && (<>
                            <div className="modal-logo">📚</div>
                            <h2 className="modal-title">Create Your Account</h2>
                            <p className="modal-sub">Join StudySync for free</p>
                            <div className="form-group"><label>Full Name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" /></div>
                            <div className="form-group"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" /></div>
                            <div className="form-group"><label>Password</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></div>
                            {err && <div className="form-error">{err}</div>}
                            <button className="btn btn-primary btn-block" onClick={() => { if (!form.name || !form.email || !form.password) { setErr('All fields required'); return; } if (form.password.length < 6) { setErr('Password too short'); return; } setErr(''); setStep(2); }}>Continue →</button>
                            <div className="modal-footer-link">Already have an account? <a href="#" onClick={e => { e.preventDefault(); setModal('login'); }}>Sign In</a></div>
                        </>)}

                        {step === 2 && (<>
                            <h2 className="modal-title">What are you studying?</h2>
                            <p className="modal-sub">Select up to 3 subjects</p>
                            <div className="subject-chips-grid">
                                {SUBJECTS.map(s => <div key={s} className={`subj-chip ${form.subjects.includes(s) ? 'selected' : ''}`} onClick={() => toggleSubject(s)}>{s}</div>)}
                            </div>
                            <div className="step-nav">
                                <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                                <button className="btn btn-primary" onClick={() => { if (!form.subjects.length) { setErr('Pick at least one'); return; } setErr(''); setStep(3); }}>Continue →</button>
                            </div>
                            {err && <div className="form-error">{err}</div>}
                        </>)}

                        {step === 3 && (<>
                            <h2 className="modal-title">What's your goal?</h2>
                            <div className="radio-stack">
                                {['Placement Preparation', 'Exam Preparation', 'College Studies', 'Online Course', 'Just Learning'].map(g => (
                                    <label key={g} className="radio-card">
                                        <input type="radio" name="goal" checked={form.goal === g} onChange={() => setForm(f => ({ ...f, goal: g }))} /><span>{g}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="step-nav">
                                <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                                <button className="btn btn-primary" onClick={() => { if (!form.goal) { setErr('Pick a goal'); return; } setErr(''); setStep(4); }}>Continue →</button>
                            </div>
                        </>)}

                        {step === 4 && (<>
                            <h2 className="modal-title">When do you study?</h2>
                            <div className="checkbox-stack">
                                {['Morning', 'Afternoon', 'Evening', 'Night'].map(a => (
                                    <label key={a} className="check-card">
                                        <input type="checkbox" checked={form.availability.includes(a)} onChange={() => toggleArr('availability', a)} />{a}
                                    </label>
                                ))}
                            </div>
                            <p style={{ marginTop: 14, marginBottom: 6, fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Study mode preference</p>
                            <div className="checkbox-stack">
                                {['silent', 'discussion', 'doubt'].map(m => (
                                    <label key={m} className="check-card">
                                        <input type="checkbox" checked={form.modes.includes(m)} onChange={() => toggleArr('modes', m)} />{m.charAt(0).toUpperCase() + m.slice(1)}
                                    </label>
                                ))}
                            </div>
                            {err && <div className="form-error">{err}</div>}
                            <div className="step-nav">
                                <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
                                <button className="btn btn-primary" disabled={loading} onClick={async () => { if (!form.availability.length) { setErr('Pick at least one time'); return; } await doRegister(); }}>{loading ? 'Creating...' : 'Start Using →'}</button>
                            </div>
                        </>)}
                    </div>
                </div>
            )}
        </div>
    );
}
