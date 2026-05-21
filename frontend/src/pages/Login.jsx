import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const INPUT_BASE = `w-full rounded-xl px-4 py-3 text-sm font-medium border
  bg-slate-800/80 border-slate-700/80 text-slate-100 placeholder-slate-500
  focus:outline-none focus:border-blue-500/70 focus:ring-2 focus:ring-blue-500/15
  transition-all duration-200 hover:border-slate-600`;

const INPUT_LIGHT = `w-full rounded-xl px-4 py-3 text-sm font-medium border
  bg-white border-slate-200 text-slate-900 placeholder-slate-400
  focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10
  transition-all duration-200 hover:border-slate-300 shadow-sm`;

export default function Login() {
    const navigate      = useNavigate();
    const { login }     = useAuth();
    const [form, setForm]       = useState({ username: '', password: '' });
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw]   = useState(false);

    // Detect theme
    const isDark = document.documentElement.classList.contains('dark');
    const inputCls = isDark ? INPUT_BASE : INPUT_LIGHT;

    const handleChange = (e) => {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username.trim() || !form.password) {
            setError('Please enter your email and password.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/auth/login', { email: form.username.trim(), password: form.password });
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        try {
            const res = await api.post('/auth/google', { credential: credentialResponse.credential });
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Google login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Google login failed. Please try again.');
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
            style={{
                background: isDark
                    ? 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12) 0%, #020817 60%)'
                    : 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.06) 0%, #f8fafc 60%)',
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {/* Subtle grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: 'linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)', backgroundSize: '40px 40px' }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="relative w-full max-w-[400px]"
            >
                {/* Card */}
                <div className={`rounded-2xl px-8 py-9 shadow-2xl border ${
                    isDark
                        ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-2xl shadow-black/50'
                        : 'bg-white border-slate-200/80 shadow-slate-200/80'
                }`}>

                    {/* Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 mb-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                            Sign in to AskDB
                        </h1>
                        <p className="text-sm mt-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                            Query your MongoDB with plain English
                        </p>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -6, height: 0 }}
                                className="flex items-center gap-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl px-4 py-3 text-sm font-medium mb-5 overflow-hidden"
                            >
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                                    <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01"/>
                                </svg>
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                Email or Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                autoFocus
                                autoComplete="email"
                                className={inputCls}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className={inputCls + ' pr-11'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: isDark ? '#64748b' : '#94a3b8' }}
                                >
                                    {showPw ? (
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.985 }}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                                       text-white py-3 rounded-xl font-semibold text-sm transition-all
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 mt-1"
                        >
                            {loading ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                    <span>Signing in…</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    <span>Sign In</span>
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        <span className="text-xs font-medium" style={{ color: isDark ? '#475569' : '#94a3b8' }}>or</span>
                        <div className={`flex-1 h-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    </div>

                    {/* Google */}
                    <div className="w-full flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            theme={isDark ? "filled_black" : "outline"}
                            size="large"
                            text="continue_with_google"
                            width="100%"
                        />
                    </div>

                    <p className="text-center text-sm mt-6" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                        No account?{' '}
                        <Link to="/register" className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
                            Create one →
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}