import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function ProtectedRoute() {
    const { token, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full mb-4" />
                <p className="text-slate-400 font-mono text-sm tracking-widest">VERIFYING SESSION...</p>
            </div>
        );
    }

    // If we have a token (or active session), render the nested routes
    return token ? <Outlet /> : <Navigate to="/login" replace />;
}
