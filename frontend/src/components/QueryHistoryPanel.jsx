import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateSQL } from '../utils/sqlGenerator';

export default function QueryHistoryPanel({ history = [], activeQueryId, onSelectQuery }) {
    return (
        <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 w-full sm:w-80 shadow-2xl">
            <div className="p-5 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <h2 className="text-sm font-bold text-slate-200 tracking-wider uppercase flex items-center gap-2">
                    <span>🕒</span> Recent Queries
                </h2>
                <div className="text-xs text-slate-500 mt-1">Last {history.length} operations</div>
            </div>

            <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-3 space-y-3">
                <AnimatePresence>
                    {history.length === 0 ? (
                        <div className="text-center p-6 text-slate-500 text-sm">
                            No query history yet. Ask a question to begin.
                        </div>
                    ) : (
                        history.map((item, idx) => {
                            const isActive = activeQueryId === item.id;
                            return (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    key={item.id || idx}
                                    className={`relative p-4 rounded-xl cursor-pointer transition-all border block text-left group
                    ${isActive
                                            ? 'bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                            : 'bg-slate-800/60 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                        }`}
                                    onClick={() => onSelectQuery(item)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${item.risk.color}`}>
                                            {item.risk.level.split(' ')[0]}
                                        </span>
                                        <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                                    </div>

                                    <p className="text-slate-300 text-sm font-medium line-clamp-2 mb-3">
                                        "{item.userQuery}"
                                    </p>

                                    <div className="flex items-center gap-3 text-xs">
                                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                            <span>🍃</span> {item.mongoExecutionTime}ms
                                        </div>
                                        <div className="flex items-center gap-1.5 text-blue-400 font-mono bg-blue-400/10 px-1.5 py-0.5 rounded">
                                            <span>🗄</span> {item.sqlExecutionTime}ms
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
