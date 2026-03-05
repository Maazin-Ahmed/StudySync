import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api';

const MODE_LABEL = { silent: '🤫 Silent Co-Study', discussion: '💬 Discussion', doubt: '❓ Doubt Clearing' };

export default function JoinViaLink() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        if (!token) { setError('Invalid link'); setLoading(false); return; }
        API.get(`/rooms/join/${token}`)
            .then(r => setRoom(r.data))
            .catch(e => setError(e.response?.data?.error || 'Invalid or expired link'))
            .finally(() => setLoading(false));
    }, [token]);

    const joinNow = async () => {
        if (!room) return;
        setJoining(true);
        try {
            await API.post(`/rooms/${room.id}/join`);
            navigate(`/app/rooms/${room.id}/lobby`);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to join');
            setJoining(false);
        }
    };

    const fmtCapacity = (room) => {
        const count = parseInt(room.participant_count) || 0;
        if (room.capacity) return `${count} / ${room.capacity} participants`;
        return `${count} participants`;
    };

    if (loading) return <div className="loading-full"><div className="spinner" /></div>;

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate('/app/rooms')}>← Browse Rooms</button>
                    <span className="page-title">Join via Link</span>
                </header>
                <div className="page-content" style={{ paddingTop: 32 }}>

                    {error ? (
                        <div style={{ textAlign: 'center', paddingTop: 32 }}>
                            <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
                            <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Link Problem</div>
                            <div style={{ fontSize: 14, color: 'var(--error)', fontWeight: 600, marginBottom: 24 }}>{error}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>This link may have expired, reached its use limit, or been revoked by the host.</div>
                            <button className="btn btn-primary" onClick={() => navigate('/app/rooms')}>Browse Public Rooms</button>
                        </div>
                    ) : room && (
                        <>
                            {/* Room card preview */}
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div style={{ fontSize: 56, marginBottom: 8 }}>🔗</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 4 }}>You've been invited via link</div>
                            </div>

                            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: 20 }}>
                                <div style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>{room.name}</div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 22 }}>{room.host_avatar}</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Hosted by {room.host_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>⭐ {parseFloat(room.host_rating || 0).toFixed(1)} rating</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                        ['📚 Subject', room.subject || 'General'],
                                        ['🎯 Mode', MODE_LABEL[room.mode]],
                                        ['👥 Students', fmtCapacity(room)],
                                        ['⏱️ Duration', `${room.duration_hrs}h`],
                                    ].map(([label, val]) => (
                                        <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 12px' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{val}</div>
                                        </div>
                                    ))}
                                </div>

                                {room.status === 'active' && (
                                    <div style={{ marginTop: 12, background: 'var(--success-bg)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                                        🟢 Session is currently live
                                    </div>
                                )}
                            </div>

                            {room.link_expires_at && (
                                <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 16 }}>
                                    ⏰ Link expires {new Date(room.link_expires_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                            )}

                            {room.capacity && parseInt(room.participant_count) >= room.capacity ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: 'var(--error)', fontWeight: 600, marginBottom: 12 }}>This room is full ({room.capacity} / {room.capacity})</div>
                                    <button className="btn btn-ghost" onClick={() => navigate('/app/rooms')}>Browse Other Rooms</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate('/app/rooms')}>← Browse Rooms</button>
                                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={joinNow} disabled={joining}>
                                        {joining ? 'Joining...' : '→ Join Room'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
