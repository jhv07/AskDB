import React from 'react';
import { motion } from 'framer-motion';

const COMPLEXITY = {
    Simple:   { dark: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', light: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: '⚡' },
    Moderate: { dark: 'text-amber-400 bg-amber-400/10 border-amber-400/30',       light: 'text-amber-600 bg-amber-50 border-amber-200',       icon: '◆' },
    Complex:  { dark: 'text-purple-400 bg-purple-400/10 border-purple-400/30',    light: 'text-purple-600 bg-purple-50 border-purple-200',    icon: '✦' },
};

const QUERY_TYPE = {
    find:           { label: 'FIND',      dark: 'text-blue-400 bg-blue-400/10 border-blue-400/30',     light: 'text-blue-600 bg-blue-50 border-blue-200' },
    aggregate:      { label: 'AGGREGATE', dark: 'text-violet-400 bg-violet-400/10 border-violet-400/30', light: 'text-violet-600 bg-violet-50 border-violet-200' },
    count:          { label: 'COUNT',     dark: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',     light: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    countdocuments: { label: 'COUNT',     dark: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',     light: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
};

export default function ExplanationCard({ explanation, complexity = 'Simple', queryType = 'find', executionTime, resultCount, isDark = true }) {
    const cx  = COMPLEXITY[complexity] || COMPLEXITY.Simple;
    const qt  = QUERY_TYPE[queryType?.toLowerCase()] || QUERY_TYPE.find;

    const cardBg  = isDark ? 'bg-slate-900/80 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm';
    const labelClr= isDark ? 'text-slate-500' : 'text-slate-400';
    const textClr = isDark ? 'text-slate-200' : 'text-slate-700';
    const divClr  = isDark ? 'border-slate-800' : 'border-slate-100';

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`rounded-xl border p-5 ${cardBg}`}>
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${labelClr}`}>Explanation</span>
                <div className="flex-1" />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDark ? qt.dark : qt.light}`}>{qt.label}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${isDark ? cx.dark : cx.light}`}>
                    <span>{cx.icon}</span>{complexity}
                </span>
            </div>

            {/* Text */}
            <p className={`text-sm leading-relaxed font-medium ${textClr}`}>
                {explanation || 'Query executed successfully.'}
            </p>

            {/* Metrics */}
            {(executionTime !== undefined || resultCount !== undefined) && (
                <div className={`flex flex-wrap items-center gap-3 mt-4 pt-4 border-t ${divClr}`}>
                    {executionTime !== undefined && (
                        <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg ${isDark ? 'text-emerald-400 bg-emerald-400/10' : 'text-emerald-600 bg-emerald-50'}`}>
                            <span>⚡</span><span>{executionTime}ms execution</span>
                        </div>
                    )}
                    {resultCount !== undefined && (
                        <div className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg ${isDark ? 'text-blue-400 bg-blue-400/10' : 'text-blue-600 bg-blue-50'}`}>
                            <span>◎</span><span>{resultCount} doc{resultCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
