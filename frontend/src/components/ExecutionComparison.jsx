import React from 'react';
import { motion } from 'framer-motion';

export default function ExecutionComparison({ mongoTime, sqlTime }) {
    if (mongoTime === undefined || sqlTime === undefined) return null;

    const mongoWinner = mongoTime <= sqlTime;
    const maxTime = Math.max(mongoTime, sqlTime) || 1;

    // Calculate delta percentage
    // Example user request: ( (sql - mongo) / sql ) * 100
    const delta = sqlTime > 0 ? (((sqlTime - mongoTime) / sqlTime) * 100).toFixed(0) : 0;

    return (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">⏱️ Performance Comparison</span>
                {delta > 0 && (
                    <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                        Mongo is {delta}% faster
                    </span>
                )}
            </h3>

            <div className="space-y-4">
                {/* MongoDB Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5"><span className="text-emerald-400">🍃</span> MongoDB Native</span>
                        <span className={mongoWinner ? "text-emerald-400 font-bold font-mono" : "font-mono"}>{mongoTime}ms</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(mongoTime / maxTime) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${mongoWinner ? 'bg-emerald-500' : 'bg-slate-500'}`}
                        />
                    </div>
                </div>

                {/* SQL Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5"><span className="text-blue-400">🗄</span> SQL Equivalent</span>
                        <span className={!mongoWinner ? "text-blue-400 font-bold font-mono" : "font-mono"}>{sqlTime}ms</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(sqlTime / maxTime) * 100}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${!mongoWinner ? 'bg-blue-500' : 'bg-slate-600'}`}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}
