import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';
import API from '../api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function RoomRequests() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [requests, setRequests] = useState([]);
    const [roomName, setRoomName] = useState('');
    const [loading, setLoading] = useState(true);
    const [acting, setActing] = useState({}); // reqId → 'approving' | 'denying'

    const load = async () => {
        try {
            const [roomRes, reqRes] = await Promise.all([
                API.get(`/rooms/${id}`),
                API.get(`/rooms/${id}/requests`),
            ]);
            setRoomName(roomRes.data.name);
            setRequests(reqRes.data);
        } catch (e) {
            if (e.response?.status === 403) navigate('/app/rooms');
        } finally { setLoading(false); }
    };

    useEffect(() => {
        load();
        const socket = io(API_URL);
        socket.emit('join', user.id);
        socket.on('room_request_new', ({ roomId }) => {
            if (roomId === id) load(); // refresh when new request arrives
        });
        socketRef.current = socket;
        return () => socket.disconnect();
    }, [id]);

    const approve = async (reqId, userId) => {
        setActing(a => ({ ...a, [reqId]: 'approving' }));
        try {
            await API.put(`/rooms/requests/${reqId}/approve`);
            setRequests(prev => prev.filter(r => r.id !== reqId));
            // Real-time: notify via socket (the API already does it, but also emit for host room)
            socketRef.current?.emit('room_settings_changed', { roomId: id, settings: {} });
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
        setActing(a => { const n = { ...a }; delete n[reqId]; return n; });
    };

    const deny = async (reqId) => {
        setActing(a => ({ ...a, [reqId]: 'denying' }));
        try {
            await API.put(`/rooms/requests/${reqId}/deny`);
            setRequests(prev => prev.filter(r => r.id !== reqId));
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
        setActing(a => { const n = { ...a }; delete n[reqId]; return n; });
    };

    const approveAll = async () => {
        if (!window.confirm(`Approve all ${requests.length} requests?`)) return;
        for (const r of requests) await approve(r.id, r.user_id);
    };

    if (loading) return <div className="loading-full"><div className="spinner" /></div>;

    return (
        <div className="page">
            <div className="app-layout">
                <header className="app-header">
                    <button className="back-btn" onClick={() => navigate(`/app/rooms/${id}/lobby`)}>← Lobby</button>
                    <span className="page-title">Join Requests</span>
                    {requests.length > 1 && (
                        <button className="btn btn-primary btn-sm" onClick={approveAll}>Approve All</button>
                    )}
                </header>

                <div className="page-content">
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
                        {requests.length === 0
                            ? `No pending requests for "${roomName}"`
                            : `${requests.length} pending request${requests.length > 1 ? 's' : ''} for "${roomName}"`}
                    </div>

                    {requests.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">🚪</div>
                            <div className="empty-title">All clear!</div>
                            <div className="empty-sub">No pending join requests at the moment.</div>
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/rooms/${id}/lobby`)}>Back to Lobby</button>
                        </div>
                    )}

                    {requests.map(r => {
                        const isActing = acting[r.id];
                        return (
                            <div key={r.id} className="partner-card" style={{ cursor: 'default' }}>
                                {/* Requester info */}
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                                    <span style={{ fontSize: 38, flexShrink: 0 }}>{r.avatar}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{r.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{r.institution}</div>
                                        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>⭐ {parseFloat(r.rating || 0).toFixed(1)}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>📚 {r.total_sessions} sessions</span>
                                            {r.subjects && JSON.parse(r.subjects || '[]').slice(0, 2).map(s => (
                                                <span key={s} style={{ fontSize: 11, background: 'var(--surface-2)', borderRadius: 12, padding: '1px 8px', color: 'var(--text-3)' }}>{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Request message */}
                                {r.message && (
                                    <div className="req-message" style={{ marginBottom: 12 }}>"{r.message}"</div>
                                )}

                                {/* Timestamp */}
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12 }}>
                                    Requested {Math.floor((Date.now() - new Date(r.created_at)) / 60000)}m ago
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => approve(r.id, r.user_id)}
                                        disabled={!!isActing}
                                        style={{ flex: 1 }}>
                                        {isActing === 'approving' ? 'Approving...' : '✓ Approve'}
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={() => deny(r.id)}
                                        disabled={!!isActing}
                                        style={{ flex: 1 }}>
                                        {isActing === 'denying' ? 'Denying...' : '✕ Deny'}
                                    </button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/partner/${r.user_id}`)}>
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
