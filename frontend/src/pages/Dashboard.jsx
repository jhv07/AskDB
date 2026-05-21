import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../index.css';
import { useAuth } from '../context/AuthContext';
import { executeQuery } from '../services/api';

import QueryHistoryPanel       from '../components/QueryHistoryPanel';
import QueryPipelineVisualizer from '../components/QueryPipelineVisualizer';
import ExplanationCard         from '../components/ExplanationCard';
import ExportButtons           from '../components/ExportButtons';
import QuerySuggestions        from '../components/QuerySuggestions';
import QueryOutputCard         from '../components/QueryOutputCard';
import ResultRenderer          from '../components/ResultRenderer';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function Toast({ message, type = 'error', onDismiss }) {
    const styles = {
        error:   { bg: 'bg-rose-500/15 border-rose-500/25 text-rose-400', icon: '✕' },
        success: { bg: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400', icon: '✓' },
        warning: { bg: 'bg-amber-500/15 border-amber-500/25 text-amber-400', icon: '!' },
        info:    { bg: 'bg-blue-500/15 border-blue-500/25 text-blue-400', icon: 'i' },
    };
    const s = styles[type];
    return (
        <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl border backdrop-blur-xl shadow-xl max-w-sm text-sm font-medium ${s.bg}`}
        >
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">{s.icon}</span>
            <span className="flex-1 leading-snug">{message}</span>
            <button onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity ml-1 text-base leading-none">✕</button>
        </motion.div>
    );
}

function EmptyState({ onSelect, isDark }) {
    const examples = [
        { q: 'Find the second highest salary',           icon: '🏅' },
        { q: 'Top 5 employees by salary',                icon: '💰' },
        { q: 'Total revenue grouped by category',        icon: '📊' },
        { q: 'Find employees with salary above average', icon: '📈' },
        { q: 'Count employees department wise',          icon: '🏢' },
        { q: 'Find employees who joined last 30 days',   icon: '📅' },
        { q: 'Find duplicate employee names',            icon: '🔍' },
        { q: 'Show all students with marks above 80',    icon: '🎓' },
    ];
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col items-center justify-center py-12 rounded-2xl text-center px-6 border ${
                isDark ? 'bg-slate-900/40 border-slate-800/50' : 'bg-white border-slate-200/80 shadow-sm'
            }`}
        >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 ${
                isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-200'
            }`}>💬</div>
            <h3 className={`text-base font-bold mb-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Ask your database anything
            </h3>
            <p className={`text-sm leading-relaxed max-w-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Type a question in plain English — AskDB converts it to a precise MongoDB query.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
                {examples.map(({ q, icon }) => (
                    <button key={q} onClick={() => onSelect(q)}
                        className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition-all border group ${
                            isDark
                                ? 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-blue-500/40 text-slate-400 hover:text-slate-200'
                                : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-blue-400/60 hover:shadow-sm text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span className="text-sm shrink-0">{icon}</span>
                        <span className="leading-snug truncate">"{q}"</span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

export default function Dashboard() {
    const { user, logout } = useAuth();
    const inputRef = useRef(null);

    const [inputText, setInputText]           = useState('');
    const [isProcessing, setIsProcessing]     = useState(false);
    const [currentStep, setCurrentStep]       = useState(null);
    const [pipelineComplete, setPipelineComplete] = useState(true);
    const [stepTimings, setStepTimings]       = useState({});
    const [activeQuery, setActiveQuery]       = useState(null);
    const [localHistory, setLocalHistory]     = useState(() => {
        try {
            const saved = localStorage.getItem('queryHistory');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [toast, setToast]                   = useState(null);
    const [showSidebar, setShowSidebar]       = useState(false);

    useEffect(() => {
        localStorage.setItem('queryHistory', JSON.stringify(localHistory));
    }, [localHistory]);

    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('askdb-theme');
        return saved ? saved === 'dark' : true;
    });

    useEffect(() => {
        localStorage.setItem('askdb-theme', isDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        const queryText = inputText.trim();
        if (!queryText || isProcessing) return;

        setIsProcessing(true);
        setPipelineComplete(false);
        setActiveQuery(null);
        setStepTimings({});

        const advanceStep = async (id, delayMs = 0) => {
            setCurrentStep(id);
            if (delayMs > 0) await sleep(delayMs);
        };

        try {
            await advanceStep('schema', 350);
            await advanceStep('generate');
            const t0 = Date.now();
            const response = await executeQuery(queryText);
            const aiDur = Date.now() - t0;
            const data = response.data;

            setStepTimings((p) => ({ ...p, schema: 320, generate: aiDur }));
            await advanceStep('validate', 250);
            setStepTimings((p) => ({ ...p, validate: 240 }));
            await advanceStep('execution', 160);
            setStepTimings((p) => ({ ...p, execution: data.execution_time || 0 }));
            await advanceStep('formatting', 120);
            setStepTimings((p) => ({ ...p, formatting: 110 }));

            const result = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                userQuery: queryText,
                queryObject: data.generated_query,
                result: data.result,
                mongoExecutionTime: data.execution_time,
                explanation: data.generated_query?.explanation,
                complexity: data.generated_query?.complexity || 'Simple',
                resultCount: data.result_count,
                aiSource: data.ai_source,
                isFavorite: false,
            };

            setLocalHistory((prev) => [result, ...prev].slice(0, 60));
            setActiveQuery(result);
            setPipelineComplete(true);
            setInputText('');

            const count = data.result_count ?? '?';
            showToast(`${count} result${count !== 1 ? 's' : ''} · ${data.execution_time}ms · ${data.ai_source}`, 'success');
        } catch (err) {
            setPipelineComplete(true);
            setCurrentStep(null);
            showToast(err.response?.data?.error || err.message || 'Query failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSuggestionSelect = (text) => {
        setInputText(text);
        inputRef.current?.focus();
    };

    const handleSelectHistory = (item) => {
        setActiveQuery(item);
        setPipelineComplete(true);
        setCurrentStep(null);
        setShowSidebar(false);
    };

    const handleToggleStar = (id) => {
        setLocalHistory(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
    };

    const handleDeleteHistory = (id) => {
        setLocalHistory(prev => prev.filter(item => item.id !== id));
    };

    // ── theme classes ──
    const bg = isDark ? 'bg-[#020817] text-slate-200' : 'bg-[#f8fafc] text-slate-900';
    const headerBg = isDark ? 'bg-slate-950/90 border-slate-800/60' : 'bg-white/95 border-slate-200/80 shadow-sm';

    return (
        <div className={`flex h-screen w-full overflow-hidden ${bg}`} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            <AnimatePresence>{toast && <Toast key="toast" message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}</AnimatePresence>

            {/* subtle bg glow dark only */}
            {isDark && (
                <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-blue-600/8 blur-[180px] rounded-full" />
                    <div className="absolute bottom-0 right-0 w-[500px] h-[350px] bg-violet-600/5 blur-[150px] rounded-full" />
                </div>
            )}

            {/* Mobile overlay */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowSidebar(false)}
                        className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div className={`lg:relative fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <QueryHistoryPanel isDark={isDark} localHistory={localHistory} activeQueryId={activeQuery?.id}
                    onSelectQuery={handleSelectHistory} onReplayQuery={handleSuggestionSelect} onEditQuery={handleSuggestionSelect}
                    onToggleStar={handleToggleStar} onDelete={handleDeleteHistory} />
            </div>

            {/* Main panel */}
            <div className="flex-1 flex flex-col h-full relative z-10 overflow-hidden min-w-0">

                {/* Header */}
                <header className={`px-4 md:px-6 py-3 shrink-0 flex items-center justify-between border-b backdrop-blur-md ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        {/* Mobile toggle */}
                        <button onClick={() => setShowSidebar((v) => !v)}
                            className={`lg:hidden flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
                                isDark ? 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:border-blue-500/50 hover:text-blue-300' : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-blue-400/60 hover:text-blue-500'
                            }`}>
                            {showSidebar ? (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                            )}
                        </button>

                        <div className="flex items-center gap-2">
                            <h1 className="text-[17px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 tracking-tight leading-none select-none">
                                AskDB
                            </h1>
                            <p className={`text-[10px] font-medium hidden sm:block ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Natural Language → MongoDB</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Live dot */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-emerald-500/8 border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                        </div>

                        {/* Theme toggle */}
                        <button onClick={() => setIsDark((v) => !v)} title={isDark ? 'Light mode' : 'Dark mode'}
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                                isDark ? 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:border-blue-500/50' : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-blue-400/60'
                            }`}>
                            {isDark ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            )}
                        </button>

                        {/* User */}
                        <div className={`hidden md:flex items-center gap-2.5 pl-2 border-l ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="text-right hidden lg:block">
                                <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{user?.username || 'Analyst'}</p>
                                <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>MongoDB User</p>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow ring-2 ring-blue-500/20">
                                {user?.username ? user.username[0].toUpperCase() : 'A'}
                            </div>
                        </div>

                        <button onClick={logout}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                isDark ? 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:border-rose-500/40 hover:text-rose-400' : 'bg-white border-slate-200 text-slate-500 hover:border-rose-400/60 hover:text-rose-500'
                            }`}>
                            Sign out
                        </button>
                    </div>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 md:px-5 pb-10 pt-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start max-w-7xl mx-auto w-full">

                        {/* Left col */}
                        <div className="lg:col-span-2 flex flex-col gap-4">

                            {/* Query input */}
                            <form onSubmit={handleSubmit}>
                                <div className={`flex items-stretch gap-2 rounded-2xl border p-1.5 transition-all ${
                                    isDark
                                        ? 'bg-slate-900/80 border-slate-800/80 focus-within:border-blue-500/40 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]'
                                        : 'bg-white border-slate-200 shadow-sm focus-within:border-blue-400/60 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.06)]'
                                }`}>
                                    {/* DB icon */}
                                    <div className={`flex items-center justify-center w-9 shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth="2" />
                                            <path strokeLinecap="round" strokeWidth="2" d="M3 5v14c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
                                            <path strokeLinecap="round" strokeWidth="2" d="M3 12c0 1.657 4.03 3 9 3s9-1.343 9-3" />
                                        </svg>
                                    </div>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
                                        placeholder="Ask anything — e.g. Find the second highest salary…"
                                        disabled={isProcessing}
                                        className={`flex-1 bg-transparent py-2.5 text-sm md:text-[15px] font-medium placeholder-slate-500 focus:outline-none disabled:opacity-50 ${
                                            isDark ? 'text-slate-100' : 'text-slate-800'
                                        }`}
                                    />
                                    <motion.button
                                        type="submit"
                                        disabled={isProcessing || !inputText.trim()}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.96 }}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                                                   text-white px-4 md:px-5 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold
                                                   transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 shrink-0"
                                    >
                                        {isProcessing ? (
                                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                                                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                <span className="hidden sm:inline">Ask</span>
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                                {inputText && (
                                    <p className={`text-xs mt-2 px-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                        Press <kbd className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>Enter</kbd> or click <strong>Ask</strong>
                                    </p>
                                )}
                            </form>

                            {/* Suggestions */}
                            <QuerySuggestions onSelect={handleSuggestionSelect} disabled={isProcessing} isDark={isDark} />

                            {/* Results */}
                            <AnimatePresence mode="wait">
                                {isProcessing && (
                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className={`flex flex-col items-center justify-center py-14 rounded-2xl gap-4 border ${
                                            isDark ? 'bg-slate-900/50 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
                                        }`}>
                                        <div className="relative w-12 h-12">
                                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                                className="w-12 h-12 rounded-full border-[3px] border-blue-500/15 border-t-blue-500 absolute inset-0" />
                                            <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                                                className="w-8 h-8 rounded-full border-[2px] border-indigo-500/15 border-t-indigo-400 absolute inset-2" />
                                        </div>
                                        <div className="text-center">
                                            <p className={`font-semibold text-sm ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Processing your query…</p>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Pattern matching + Ollama AI</p>
                                        </div>
                                    </motion.div>
                                )}

                                {!isProcessing && activeQuery && (
                                    <motion.div key={activeQuery.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4 pb-6">
                                        {/* Result header */}
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                                <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Results for</p>
                                                <p className={`text-sm font-semibold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>"{activeQuery.userQuery}"</p>
                                            </div>
                                            <ExportButtons data={activeQuery.result} disabled={isProcessing} />
                                        </div>

                                        <ExplanationCard explanation={activeQuery.explanation} complexity={activeQuery.complexity}
                                            queryType={activeQuery.queryObject?.query_type} executionTime={activeQuery.mongoExecutionTime}
                                            resultCount={activeQuery.resultCount} isDark={isDark} />

                                        <QueryOutputCard mongoQuery={activeQuery.queryObject?.mongo_query}
                                            sqlQuery={activeQuery.queryObject?.sql_query} queryType={activeQuery.queryObject?.query_type}
                                            collection={activeQuery.queryObject?.collection} confidence={activeQuery.queryObject?.confidence}
                                            explanation={activeQuery.explanation} aiSource={activeQuery.aiSource}
                                            sort={activeQuery.queryObject?.sort} skip={activeQuery.queryObject?.skip} limit={activeQuery.queryObject?.limit}
                                            isDark={isDark} />

                                        <ResultRenderer data={{ generated_query: activeQuery.queryObject, result: activeQuery.result, execution_time: activeQuery.mongoExecutionTime }} />

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 flex-wrap pt-1">
                                            {[
                                                { label: 'Run Again', icon: '↺', action: () => handleSuggestionSelect(activeQuery.userQuery), accent: 'blue' },
                                                { label: 'Edit Query', icon: '✏', action: () => { setInputText(activeQuery.userQuery); inputRef.current?.focus(); }, accent: 'violet' },
                                            ].map(({ label, icon, action, accent }) => (
                                                <button key={label} onClick={action}
                                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                                                        isDark
                                                            ? `bg-slate-800/80 border-slate-700/80 text-slate-400 hover:border-${accent}-500/40 hover:text-${accent}-300`
                                                            : `bg-white border-slate-200 text-slate-500 hover:border-${accent}-400/60 hover:text-${accent}-600 shadow-sm`
                                                    }`}>
                                                    <span>{icon}</span>{label}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {!isProcessing && !activeQuery && <EmptyState key="empty" onSelect={handleSuggestionSelect} isDark={isDark} />}
                            </AnimatePresence>
                        </div>

                        {/* Right col: Pipeline */}
                        <div className="lg:col-span-1 lg:sticky lg:top-0">
                            <QueryPipelineVisualizer currentStep={currentStep} isComplete={pipelineComplete} stepTimings={stepTimings} isDark={isDark} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
