import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('ss_token');
        if (token) {
            API.get('/users/me')
                .then(r => setUser(r.data))
                .catch(() => { localStorage.removeItem('ss_token'); })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const r = await API.post('/auth/login', { email, password });
        localStorage.setItem('ss_token', r.data.token);
        setUser(r.data.user);
        return r.data;
    };

    const register = async (data) => {
        const r = await API.post('/auth/register', data);
        localStorage.setItem('ss_token', r.data.token);
        setUser(r.data.user);
        return r.data;
    };

    const logout = () => {
        localStorage.removeItem('ss_token');
        setUser(null);
    };

    const updateUser = (updated) => setUser(u => ({ ...u, ...updated }));

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
