import React from 'react';
import { motion } from 'framer-motion';

const steps = [
    { id: 'intent', title: 'Intent Detection', icon: '🧠' },
    { id: 'schema', title: 'Schema Mapping', icon: '🗺️' },
    { id: 'generate', title: 'Query Generation', icon: '⚙️' },
    { id: 'validate', title: 'Validation', icon: '🛡️' },
    { id: 'risk', title: 'Risk Analysis', icon: '🚨' },
    { id: 'optimization', title: 'Optimization Engine', icon: '💡' },
    { id: 'execution', title: 'Execution Engine', icon: '⚡' }
];

export default function QueryPipelineVisualizer({ currentStep, isComplete }) {
    // Find current active index
    const activeIndex = isComplete ? steps.length : steps.findIndex(s => s.id === currentStep);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-inner">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Execution Pipeline</h3>

            <div className="relative flex flex-col gap-1 pl-2">
                {steps.map((step, idx) => {
                    const isPassed = idx < activeIndex;
                    const isActive = idx === activeIndex;

                    return (
                        <div key={step.id} className="relative flex items-center gap-4 py-3">
                            {/* Connecting line connecting icons vertically */}
                            {idx !== steps.length - 1 && (
                                <div
                                    className={`absolute left-[15px] top-[30px] w-px h-[calc(100%+8px)] transition-colors duration-500
                    ${idx < activeIndex ? 'bg-blue-500' : 'bg-slate-800'}`}
                                />
                            )}

                            {/* Icon / Status indicator */}
                            <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mt-0.5">
                                {isPassed ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute inset-0 bg-blue-500 rounded-full flex items-center justify-center border border-blue-400"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </motion.div>
                                ) : (
                                    <div
                                        className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-500 text-sm
                       ${isActive
                                                ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] ring-2 ring-blue-500/20'
                                                : 'bg-slate-800 border-slate-700 text-slate-500'}`
                                        }
                                    >
                                        {step.icon}
                                    </div>
                                )}
                            </div>

                            {/* Step Title */}
                            <div className="flex-1">
                                <span className={`text-sm tracking-wide transition-colors duration-300 font-medium
                    ${isActive ? 'text-blue-300' : isPassed ? 'text-slate-200' : 'text-slate-500'}`}
                                >
                                    {step.title}
                                </span>
                                {isActive && (
                                    <motion.div
                                        key="pulse"
                                        initial={{ opacity: 0.5, width: 0 }}
                                        animate={{ opacity: 1, width: "30%" }}
                                        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                                        className="h-0.5 bg-blue-500/50 mt-1 rounded-full"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
