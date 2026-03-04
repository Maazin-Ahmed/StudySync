import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const TABS = [
    { to: '/app/home', icon: '🏠', label: 'Home' },
    { to: '/app/find', icon: '🔍', label: 'Find' },
    { to: '/app/rooms', icon: '🏛️', label: 'Rooms' },
    { to: '/app/chats', icon: '💬', label: 'Chats' },
    { to: '/app/profile', icon: '👤', label: 'Profile' },
];

export default function BottomNav() {
    return (
        <nav className="bottom-nav">
            {TABS.map(t => (
                <NavLink key={t.to} to={t.to} className={({ isActive }) => `bnav-item${isActive ? ' active' : ''}`}>
                    <span className="bnav-icon">{t.icon}</span>
                    <span className="bnav-label">{t.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
