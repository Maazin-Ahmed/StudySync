import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/BottomNav';
import API from '../api';

function calcMatch(partner, user) {
    if (!user) return 50;
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

export default function Find() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [subject, setSubject] = useState('');
    const [mode, setMode] = useState('');
    const [results, setResults] = useState([]);
    const [searched, setSearched] = useState(false);
    const [loading, setLoading] = useState(false);

    const doSearch = async () => {
        setLoading(true);
        try {
            const r = await API.get('/users/search', { params: { subject, mode } });
            const withMatch = r.data.map(p => ({ ...p, matchPct: calcMatch(p, user) })).sort((a, b) => b.matchPct - a.matchPct);
            setResults(withMatch);
            setSearched(true);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);

    return (
        <div className="page" id="page-find">
            <div className="app-layout">
                <header className="app-header">
                    <span className="page-title">Find Partners</span>
                </header>
                <div className="page-content">
                    <div className="find-filters">
                        <div className="form-group">
                            <label>What are you studying?</label>
                            <select value={subject} onChange={e => setSubject(e.target.value)}>
                                <option value="">All Subjects</option>
                                {['Data Structures & Algorithms', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Operating Systems', 'Computer Networks', 'Machine Learning', 'GATE Prep', 'CAT Prep', 'UPSC', 'JEE / NEET', 'English / IELTS', 'Business'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Study mode</label>
                            <select value={mode} onChange={e => setMode(e.target.value)}>
                                <option value="">Any Mode</option>
                                <option value="silent">🤫 Silent Co-study</option>
                                <option value="discussion">💬 Discussion</option>
                                <option value="doubt">❓ Doubt Clearing</option>
                            </select>
                        </div>
                        <button className="btn btn-primary btn-block" onClick={doSearch} disabled={loading}>
                            {loading ? 'Searching...' : '🔍 Find Partners'}
                        </button>
                    </div>

                    {searched && <div className="section-label">{results.length} partner{results.length !== 1 ? 's' : ''} found{subject ? ' studying ' + subject : ''}</div>}

                    {results.map(p => {
                        const mc = p.matchPct >= 80 ? 'high' : p.matchPct >= 65 ? 'mid' : 'low';
                        return (
                            <div key={p.id} className="partner-card">
                                <div className="pc-top">
                                    <div className="pc-avatar">{p.avatar}</div>
                                    <div className="pc-info">
                                        <div className="pc-name">{p.name}</div>
                                        <div className="pc-edu">{p.education || ''}{p.education && p.institution ? ' • ' : ''}{p.institution || ''}</div>
                                        <div className="pc-rating">⭐ {p.rating} • {p.total_sessions} sessions</div>
                                    </div>
                                    <div className={`pc-match ${mc}`}>{p.matchPct}%<span>match</span></div>
                                </div>
                                <div className="pc-tags">{(p.subjects || []).map(s => <span key={s} className="pc-tag">{s}</span>)}</div>
                                <div className="pc-avail">⏰ {(p.availability || []).join(', ')} &nbsp;•&nbsp; {(p.modes || []).map(modeLabel).join(', ')}</div>
                                <div className="pc-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/partner/${p.id}`)}>View Profile</button>
                                    <button className="btn btn-primary btn-sm" onClick={() => navigate(`/app/partner/${p.id}`)}>Send Request</button>
                                </div>
                            </div>
                        );
                    })}

                    {searched && !results.length && (
                        <div className="empty-state">
                            <div className="empty-icon">🔍</div>
                            <div className="empty-title">No partners found</div>
                            <div className="empty-sub">Try different filters</div>
                        </div>
                    )}
                </div>
                <BottomNav />
            </div>
        </div>
    );
}
