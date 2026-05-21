import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const INPUT_DARK = `w-full rounded-xl px-4 py-3 text-sm font-medium border
  bg-slate-800/80 border-slate-700/80 text-slate-100 placeholder-slate-500
  focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15
  transition-all duration-200 hover:border-slate-600`;

const INPUT_LIGHT = `w-full rounded-xl px-4 py-3 text-sm font-medium border
  bg-white border-slate-200 text-slate-900 placeholder-slate-400
  focus:outline-none focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/10
  transition-all duration-200 hover:border-slate-300 shadow-sm`;

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [form, setForm]       = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw]   = useState(false);

    const isDark = document.documentElement.classList.contains('dark');
    const inputCls = isDark ? INPUT_DARK : INPUT_LIGHT;

    const handleChange = (e) => {
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username.trim() || !form.email.trim() || !form.password) {
            setError('All fields are required.'); return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.'); return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.'); return;
        }
        setLoading(true);
        try {
            await register(form.username.trim(), form.email.trim(), form.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const pwMatch = form.confirmPassword && form.password !== form.confirmPassword;

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
            style={{
                background: isDark
                    ? 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, #020817 60%)'
                    : 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.06) 0%, #f8fafc 60%)',
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
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
                <div className={`rounded-2xl px-8 py-9 shadow-2xl border ${
                    isDark
                        ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-2xl shadow-black/50'
                        : 'bg-white border-slate-200/80 shadow-slate-200/80'
                }`}>

                    {/* Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 mb-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                            Create your account
                        </h1>
                        <p className="text-sm mt-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                            Start querying MongoDB in plain English
                        </p>
                    </div>

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
                                Username
                            </label>
                            <input type="text" name="username" value={form.username} onChange={handleChange}
                                placeholder="Choose a username" autoFocus autoComplete="username" className={inputCls} />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                Email
                            </label>
                            <input type="email" name="email" value={form.email} onChange={handleChange}
                                placeholder="you@example.com" autoComplete="email" className={inputCls} />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                Password
                            </label>
                            <div className="relative">
                                <input type={showPw ? 'text' : 'password'} name="password" value={form.password}
                                    onChange={handleChange} placeholder="Min 6 characters" autoComplete="new-password"
                                    className={inputCls + ' pr-11'} />
                                <button type="button" onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                                    {showPw ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                                Confirm Password
                            </label>
                            <input type={showPw ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword}
                                onChange={handleChange} placeholder="Repeat your password" autoComplete="new-password"
                                className={`${inputCls} ${pwMatch ? '!border-rose-500/50 !ring-rose-500/15' : ''}`} />
                            <AnimatePresence>
                                {pwMatch && (
                                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }} className="text-xs text-rose-400 mt-1.5 font-medium">
                                        Passwords don't match
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </div>

                        <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                                       text-white py-3 rounded-xl font-semibold text-sm transition-all
                                       disabled:opacity-50 disabled:cursor-not-allowed
                                       shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2.5 mt-1"
                        >
                            {loading ? (
                                <>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.75, ease: 'linear' }}
                                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                    <span>Creating account…</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <span>Create Account</span>
                                </>
                            )}
                        </motion.button>
                    </form>

                    <p className="text-center text-sm mt-6" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                        Already have an account?{' '}
                        <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                            Sign in →
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
