import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Prism from '../components/Prism';
import TextType from '../components/TextType';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await login(formData.email, formData.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to login');
            setIsLoading(false);
        }
    };

    return (
        <div className="relative w-screen h-screen overflow-hidden flex items-center justify-center">

            {/* Prism Background */}
            <div className="absolute inset-0 z-0">
                <Prism
                    animationType="rotate"
                    timeScale={0.6}
                    height={3.5}
                    baseWidth={5.5}
                    scale={3.8}
                    hueShift={0}
                    colorFrequency={1.2}
                    glow={3}
                    noise={0.15}
                />
            </div>

            {/* Light Cinematic Vignette (NOT heavy black overlay) */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60 pointer-events-none z-10" />

            {/* Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md relative z-20"
            >
                <div className="text-center mb-8">
                    <TextType
                        text="AskDB"
                        typingSpeed={100}
                        deletingSpeed={70}
                        pauseDuration={1200}
                        loop={true}
                        showCursor={false}
                        className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 tracking-tight drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]"
                    />
                    <p className="mt-3 text-slate-300 text-base font-medium tracking-wide">
                        Sign in to your dashboard
                    </p>
                </div>

                <div className="bg-slate-900/75 backdrop-blur-lg border border-slate-700/40 p-8 rounded-2xl shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2"
                                >
                                    <span>⚠</span> {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                                placeholder="name@company.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all text-sm flex items-center justify-center h-12"
                        >
                            {isLoading ? (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                />
                            ) : (
                                "Authenticate to Dashboard"
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-400">
                        New to AskDB?{" "}
                        <Link
                            to="/register"
                            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Create an account
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}