import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Find from './pages/Find';
import BuddyProfile from './pages/BuddyProfile';
import ChatList from './pages/ChatList';
import Chat from './pages/Chat';
import OwnProfile from './pages/OwnProfile';
import Requests from './pages/Requests';
import Buddies from './pages/Buddies';
import CreateSession from './pages/CreateSession';
import SessionLobby from './pages/SessionLobby';
import ActiveSession from './pages/ActiveSession';
import Notifications from './pages/Notifications';

function RequireAuth({ children }) {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="loading-full"><div className="spinner" /></div>
    );
    return user ? children : <Navigate to="/" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/app" element={<RequireAuth><Navigate to="/app/home" replace /></RequireAuth>} />
                    <Route path="/app/home" element={<RequireAuth><Home /></RequireAuth>} />
                    <Route path="/app/find" element={<RequireAuth><Find /></RequireAuth>} />
                    <Route path="/app/partner/:id" element={<RequireAuth><BuddyProfile /></RequireAuth>} />
                    <Route path="/app/chats" element={<RequireAuth><ChatList /></RequireAuth>} />
                    <Route path="/app/chats/:id" element={<RequireAuth><Chat /></RequireAuth>} />
                    <Route path="/app/profile" element={<RequireAuth><OwnProfile /></RequireAuth>} />
                    <Route path="/app/requests" element={<RequireAuth><Requests /></RequireAuth>} />
                    <Route path="/app/buddies" element={<RequireAuth><Buddies /></RequireAuth>} />
                    <Route path="/app/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
                    <Route path="/app/session/create" element={<RequireAuth><CreateSession /></RequireAuth>} />
                    <Route path="/app/session/:id/lobby" element={<RequireAuth><SessionLobby /></RequireAuth>} />
                    <Route path="/app/session/:id/active" element={<RequireAuth><ActiveSession /></RequireAuth>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
