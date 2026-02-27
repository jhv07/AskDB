import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSQL, analyzeQueryRisk, generateOptimizationSuggestions } from '../utils/sqlGenerator';

const CodeBlock = ({ code, language, title }) => (
    <div className="relative bg-slate-950 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-full shadow-lg">
        <div className="flex justify-between items-center px-4 py-3 bg-slate-900/80 border-b border-slate-700/50">
            <span className="text-xs font-semibold text-slate-300 tracking-wider flex items-center gap-2">
                {title}
            </span>
            <button
                onClick={() => {
                    navigator.clipboard.writeText(code);
                    // could add a toast here
                }}
                className="text-xs text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-md border border-slate-700"
            >
                Copy Code
            </button>
        </div>
        <pre className="p-5 text-sm text-slate-300 font-mono overflow-auto flex-1 leading-relaxed">
            <code>{code}</code>
        </pre>
    </div>
);

export default function ResultRenderer({ data }) {
    if (!data) return null;

    const { queryObject, result, execution_time, breakdownSteps } = data;
    const [viewMode, setViewMode] = useState('both'); // 'mongo', 'sql', 'both'
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(true);

    const mongoStr = JSON.stringify(queryObject, null, 2);
    const sqlStr = generateSQL(queryObject);
    const risk = analyzeQueryRisk(queryObject);
    const optimization = generateOptimizationSuggestions(queryObject);

    const simulatedBefore = execution_time || 120;
    const isRisky = risk.level === 'expensive' || risk.level === 'complex' || optimization.risk !== 'SAFE';
    // Dummy simulate a dramatic improvement if risky
    const simulatedAfter = isRisky ? Math.round(simulatedBefore * 0.15) || 12 : simulatedBefore;

    const formatExecutionTime = (ms) => {
        if (!ms) return "N/A";
        return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-6xl mx-auto space-y-6"
        >
            {/* Top Header: Risk & Performance Toggles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm ${risk.color}`}>
                        {risk.label}
                    </div>
                    <div className="text-slate-400 text-sm flex items-center gap-2">
                        <span className="opacity-70">Execution Time:</span>
                        <span className="text-white font-mono bg-slate-900/50 px-2 py-0.5 rounded border border-slate-700">{formatExecutionTime(execution_time)}</span>
                    </div>
                </div>

                {/* View Toggles */}
                <div className="flex bg-slate-900/80 p-1.5 rounded-lg border border-slate-700/60 shadow-inner">
                    {['mongo', 'both', 'sql'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 capitalize ${viewMode === mode
                                ? 'bg-blue-500/20 text-blue-300 shadow-sm border border-blue-500/20'
                                : 'text-slate-400 hover:text-slate-200 border border-transparent'
                                }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Performance Suggestions Copilot */}
            <AnimatePresence>
                {optimization.risk !== 'SAFE' && optimization.risk !== 'NONE' && optimization.suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="overflow-hidden"
                    >
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-amber-500/20 pb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">⚙️</span>
                                    <h3 className="text-sm font-bold text-amber-400">Performance Suggestions</h3>
                                </div>
                                <div className="sm:ml-auto flex items-center gap-3 text-xs bg-black/20 px-3 py-1.5 rounded-md border border-amber-500/10 w-fit">
                                    <span className="text-slate-400">Est. Impact:</span>
                                    <div className="flex items-center gap-2 font-mono">
                                        <span className="text-rose-400 line-through">{simulatedBefore}ms</span>
                                        <span className="text-slate-500">→</span>
                                        <span className="text-emerald-400 font-bold">{simulatedAfter}ms</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {optimization.suggestions.map((sug, idx) => (
                                    <div key={idx} className="space-y-2">
                                        <div className="flex gap-2 text-sm text-slate-200">
                                            <span className="text-amber-500 mt-0.5 font-bold">⚠</span>
                                            <p className="leading-relaxed">{sug.message}</p>
                                        </div>
                                        {sug.code && (
                                            <div className="pl-6 pt-1">
                                                <div className="bg-slate-950/80 border border-slate-700/50 rounded-lg p-3 font-mono text-xs text-blue-300 shadow-inner overflow-x-auto relative group">
                                                    <span className="absolute top-0 right-0 px-2 py-1 text-[10px] bg-slate-800 text-slate-400 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
                                                    <code>{sug.code}</code>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Code Viewer Section */}
            <div className={`grid gap-6 ${viewMode === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {(viewMode === 'mongo' || viewMode === 'both') && (
                    <motion.div layout transition={{ duration: 0.3 }} className="h-full">
                        <CodeBlock code={mongoStr} language="json" title="🍃 MongoDB Query" />
                    </motion.div>
                )}

                {(viewMode === 'sql' || viewMode === 'both') && (
                    <motion.div layout transition={{ duration: 0.3 }} className="h-full">
                        <CodeBlock code={sqlStr} language="sql" title="🗄 Auto-Generated SQL" />
                    </motion.div>
                )}
            </div>

            {/* Query Breakdown Panel */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden backdrop-blur-md shadow-sm">
                <button
                    onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-700/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🧠</span>
                        <h3 className="text-sm font-semibold text-slate-200">How this query works</h3>
                    </div>
                    <div className="text-slate-400 text-xs flex items-center gap-2">
                        <span>{isBreakdownOpen ? 'Hide Breakdown' : 'View Explanation'}</span>
                        <svg className={`w-4 h-4 transition-transform duration-300 ${isBreakdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>

                <AnimatePresence>
                    {isBreakdownOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="px-5 pb-5 border-t border-slate-700/50"
                        >
                            <div className="mt-5 space-y-4">
                                {breakdownSteps && breakdownSteps.length > 0 ? (
                                    breakdownSteps.map((step, idx) => (
                                        <div key={idx} className="flex gap-4 group">
                                            <div className="flex flex-col items-center">
                                                <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/20 shadow-sm group-hover:bg-blue-500/20 transition-colors">
                                                    {idx + 1}
                                                </div>
                                                {idx !== breakdownSteps.length - 1 && <div className="w-px h-full bg-slate-700 mt-2"></div>}
                                            </div>
                                            <div className="pb-4 text-sm text-slate-300 pt-1">
                                                {step}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-slate-300 space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                        <div className="flex items-start gap-2">
                                            <span className="text-slate-500 w-24">Target:</span>
                                            <span className="font-mono text-blue-300">Collection `{queryObject?.collection}`</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-slate-500 w-24">Operation:</span>
                                            <span className="font-mono text-emerald-300">{queryObject?.query_type}</span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="text-slate-500 w-24">Insight:</span>
                                            <span className="text-slate-300">{risk?.reason}</span>
                                        </div>

                                        {risk?.level === 'expensive' && (
                                            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-md flex gap-3 text-rose-300">
                                                <span className="text-lg">💡</span>
                                                <p className="pt-0.5">Consider adding an index to optimize this structure.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </motion.div>
    );
}
