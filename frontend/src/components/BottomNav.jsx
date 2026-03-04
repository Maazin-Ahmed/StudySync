import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './BottomNav.css';

export default function BottomNav({ active }) {
    const { user } = useAuth();
    const nav = useNavigate();

    const tabs = [
        { to: '/app/home', icon: '🏠', label: 'Home' },
        { to: '/app/find', icon: '🔍', label: 'Find' },
        { to: '/app/chats', icon: '💬', label: 'Chats' },
        { to: '/app/profile', icon: '👤', label: 'Profile' },
    ];

    return (
        <nav className="bottom-nav">
            {tabs.map(t => (
                <NavLink key={t.to} to={t.to} className={({ isActive }) => `bnav-item ${isActive ? 'active' : ''}`}>
                    <span className="bnav-icon">{t.icon}</span>
                    <span className="bnav-label">{t.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
