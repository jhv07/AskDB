import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchSuggestions } from '../services/api';

const FALLBACK = [
    'Show all documents',
    'Count total records',
    'Show top 5 by salary',
    'Total amount by category',
    'Find records from last month',
];

export default function QuerySuggestions({ onSelect, disabled = false, isDark = true }) {
    const [suggestions, setSuggestions] = useState(FALLBACK);
    const [isLoading, setIsLoading]     = useState(true);

    useEffect(() => {
        fetchSuggestions()
            .then((res) => { if (res.data.suggestions?.length) setSuggestions(res.data.suggestions); })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    const labelClr = isDark ? 'text-slate-600' : 'text-slate-400';
    const chipCls  = isDark
        ? 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:bg-blue-500/10 hover:border-blue-500/40 hover:text-blue-300'
        : 'bg-white border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 shadow-sm';

    if (isLoading) {
        return (
            <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-7 w-28 rounded-full animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                ))}
            </div>
        );
    }

    return (
        <div>
            <p className={`text-[10px] uppercase tracking-wider mb-2 font-semibold ${labelClr}`}>Try asking</p>
            <div className="flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                    <motion.button key={i}
                        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.035 }}
                        onClick={() => !disabled && onSelect(s)} disabled={disabled}
                        className={`text-xs px-3 py-1.5 border rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap font-medium ${chipCls}`}>
                        {s}
                    </motion.button>
                ))}
            </div>
        </div>
    );
}
