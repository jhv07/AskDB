import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
    {
        id: 'schema',
        title: 'Schema Analysis',
        desc: 'Detecting collections & fields',
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M9 9v11" />
            </svg>
        ),
    },
    {
        id: 'generate',
        title: 'AI Generation',
        desc: 'Pattern match + Ollama llama3',
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
    },
    {
        id: 'validate',
        title: 'Security Check',
        desc: 'Read-only validation enforced',
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
    },
    {
        id: 'execution',
        title: 'MongoDB Execute',
        desc: 'Query executed on local DB',
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
        ),
    },
    {
        id: 'formatting',
        title: 'Format Response',
        desc: 'SQL, JSON & explanation ready',
        icon: (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
    },
];

const CheckIcon = () => (
    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
);

export default function QueryPipelineVisualizer({ currentStep, isComplete, stepTimings = {}, isDark = true }) {
    const activeIndex = isComplete
        ? STEPS.length
        : STEPS.findIndex((s) => s.id === currentStep);

    const cardBg    = isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-200/80 shadow-sm';
    const footerBg  = isDark ? 'border-slate-800/60' : 'border-slate-100';
    const labelClr  = isDark ? 'text-slate-500' : 'text-slate-400';
    const connClr   = isDark ? 'bg-slate-800' : 'bg-slate-100';

    return (
        <div className={`rounded-2xl border p-5 ${cardBg}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isComplete ? 'bg-emerald-500' : activeIndex >= 0 ? 'bg-blue-500 animate-pulse' : (isDark ? 'bg-slate-700' : 'bg-slate-300')}`} />
                    <span className={`text-[11px] font-bold uppercase tracking-[0.08em] ${labelClr}`}>AI Pipeline</span>
                </div>
                <AnimatePresence>
                    {isComplete && (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.75 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.75 }}
                            className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full"
                        >
                            ✓ Done
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-0">
                {STEPS.map((step, idx) => {
                    const isPassed  = idx < activeIndex;
                    const isActive  = idx === activeIndex;
                    const isPending = idx > activeIndex;
                    const timing    = stepTimings[step.id];

                    return (
                        <div key={step.id} className="flex gap-3">
                            {/* Left: dot + connector */}
                            <div className="flex flex-col items-center">
                                {/* Dot */}
                                <div className="relative w-7 h-7 shrink-0 flex items-center justify-center">
                                    {isPassed ? (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                            className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.35)]"
                                        >
                                            <CheckIcon />
                                        </motion.div>
                                    ) : isActive ? (
                                        <div className="w-6 h-6 rounded-full bg-blue-500/15 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_14px_rgba(59,130,246,0.3)] ring-4 ring-blue-500/10">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                                className="w-2.5 h-2.5 border-[1.5px] border-blue-400/40 border-t-blue-400 rounded-full"
                                            />
                                        </div>
                                    ) : (
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                            isDark ? 'border-slate-700/80 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
                                        }`}>
                                            <div className={`${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                                                {step.icon}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Connector line */}
                                {idx < STEPS.length - 1 && (
                                    <div className="w-px flex-1 my-1 overflow-hidden rounded-full" style={{ minHeight: 14 }}>
                                        <motion.div
                                            className="w-full h-full"
                                            style={{ background: isPassed ? '#3b82f6' : (isDark ? '#1e293b' : '#e2e8f0') }}
                                            initial={false}
                                            animate={{ background: isPassed ? '#3b82f6' : (isDark ? '#1e293b' : '#e2e8f0') }}
                                            transition={{ duration: 0.4 }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Right: text */}
                            <div className={`pb-4 min-w-0 pt-0.5 ${idx === STEPS.length - 1 ? 'pb-0' : ''}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[13px] font-semibold transition-colors duration-200 ${
                                        isActive ? 'text-blue-400' : isPassed ? (isDark ? 'text-slate-200' : 'text-slate-700') : (isDark ? 'text-slate-600' : 'text-slate-400')
                                    }`}>
                                        {step.title}
                                    </span>
                                    {timing && isPassed && (
                                        <span className={`text-[10px] font-mono shrink-0 tabular-nums ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {timing}ms
                                        </span>
                                    )}
                                </div>
                                <p className={`text-[11px] mt-0.5 leading-snug transition-colors duration-200 ${
                                    isActive ? 'text-blue-400/60' : (isDark ? 'text-slate-600' : 'text-slate-400')
                                }`}>
                                    {step.desc}
                                </p>
                                {isActive && (
                                    <motion.div
                                        initial={{ width: '15%', opacity: 0.4 }}
                                        animate={{ width: ['15%', '75%', '15%'], opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                        className="h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 mt-2 rounded-full"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className={`mt-4 pt-3.5 border-t flex items-center justify-between ${footerBg}`}>
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.9)] bg-emerald-500`} />
                    <span className={`text-[10px] font-medium ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        Ollama · llama3
                    </span>
                </div>
                <span className={`text-[10px] font-mono ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>
                    :11434
                </span>
            </div>
        </div>
    );
}
