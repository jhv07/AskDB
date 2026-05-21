import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser]     = useState(null);
    const [token, setToken]   = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    // On mount or token change — validate the token and load user profile
    useEffect(() => {
        if (token) {
            const loadUser = async () => {
                try {
                    const res = await api.get('/auth/me');
                    setUser(res.data);
                } catch (error) {
                    console.error('Session expired or invalid token:', error.message);
                    // Clear stale token
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                } finally {
                    setLoading(false);
                }
            };
            loadUser();
        } else {
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    // Called after successful login
    const login = (receivedToken, receivedUser) => {
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
    };

    // Register and auto-login
    const register = async (username, email, password) => {
        const res = await api.post('/auth/register', { username, email, password });
        const receivedToken = res.data.token;
        if (receivedToken) {
            localStorage.setItem('token', receivedToken);
            setToken(receivedToken);
            setUser(res.data.user);
        }
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);