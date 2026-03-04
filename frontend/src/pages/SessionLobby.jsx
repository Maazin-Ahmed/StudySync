import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

export default function SessionLobby() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [session, setSession] = useState(null);
    const [partnerReady, setPartnerReady] = useState(false);

    useEffect(() => {
        API.get('/sessions').then(r => {
            const s = r.data.find(x => x.id === id);
            setSession(s);
        }).catch(() => { });
        const t = setTimeout(() => setPartnerReady(true), 2500);
        return () => clearTimeout(t);
    }, [id]);

    const modeLabel = m => ({ silent: '🤫 Silent', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' }[m] || m);

    return (
        <div className="page">
            <div className="lobby-layout">
                <h2 className="lobby-title">Session Starting Soon</h2>
                {session && <div className="lobby-session-info">{session.subject}{session.topic ? ` — ${session.topic}` : ''} • {modeLabel(session.mode)} • {session.duration_hrs}h</div>}
                <div className="lobby-timer" style={{ margin: '20px 0' }}>Ready to start!</div>

                <div className="lobby-readycheck">
                    <div className="ready-item"><span>✅</span> <span>{user?.name || 'You'}</span> (Ready)</div>
                    <div className="ready-item">
                        <span>{partnerReady ? '✅' : '⏳'}</span>
                        <span>{session?.partner_name || 'Partner'}</span>
                        <span style={{ marginLeft: 6, color: 'var(--text3)', fontSize: 12 }}>{partnerReady ? '(Ready)' : '(Joining...)'}</span>
                    </div>
                </div>

                <div className="lobby-setup">
                    <div className="setup-row"><span>Camera</span> <span className="toggle-simple">📷 On</span></div>
                    <div className="setup-row"><span>Mic</span> <span className="toggle-simple">🎤 On</span></div>
                </div>

                <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 24 }} onClick={() => navigate(`/app/session/${id}/active`)}>
                    Join Session →
                </button>
                <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/app/home')}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
