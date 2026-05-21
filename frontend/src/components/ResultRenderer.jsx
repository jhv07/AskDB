import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ROWS_PER_PAGE = 10;

// ─── Sortable Table ───────────────────────────────────────────────────────────
function SortableTable({ data }) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage]       = useState(0);

    const columns = useMemo(() => {
        if (!data?.length) return [];
        return Object.keys(data[0]);
    }, [data]);

    const sorted = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            const va = a[sortKey], vb = b[sortKey];
            if (typeof va === 'number' && typeof vb === 'number') {
                return sortDir === 'asc' ? va - vb : vb - va;
            }
            return sortDir === 'asc'
                ? String(va).localeCompare(String(vb))
                : String(vb).localeCompare(String(va));
        });
    }, [data, sortKey, sortDir]);

    const paginated  = sorted.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
    const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const formatCell = (val) => {
        if (val === null || val === undefined) return <span className="text-slate-600">—</span>;
        if (val instanceof Date || (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val))) {
            return <span className="text-blue-300 font-mono text-xs">{new Date(val).toLocaleDateString()}</span>;
        }
        if (typeof val === 'object') return <span className="text-violet-400 font-mono text-xs">{JSON.stringify(val)}</span>;
        if (typeof val === 'boolean') return <span className={val ? 'text-emerald-400' : 'text-rose-400'}>{String(val)}</span>;
        if (typeof val === 'number') return <span className="text-orange-300 font-mono">{val.toLocaleString()}</span>;
        return <span>{String(val)}</span>;
    };

    if (!data?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <span className="text-3xl mb-2">📭</span>
                <p className="text-sm">No results returned</p>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-800/80 border-b border-slate-700">
                            {columns.map((col) => (
                                <th
                                    key={col}
                                    onClick={() => handleSort(col)}
                                    className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-blue-400 transition-colors select-none whitespace-nowrap"
                                >
                                    {col}
                                    {sortKey === col && (
                                        <span className="ml-1 text-blue-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map((row, i) => (
                            <motion.tr
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className="border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors"
                            >
                                {columns.map((col) => (
                                    <td key={col} className="px-4 py-2.5 text-slate-300 max-w-[200px] truncate">
                                        {formatCell(row[col])}
                                    </td>
                                ))}
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 px-1">
                    <span className="text-xs text-slate-500">
                        {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, data.length)} of {data.length}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="px-3 py-1 text-xs bg-slate-800 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
                        >← Prev</button>
                        <span className="px-2 py-1 text-xs text-slate-400">{page + 1} / {totalPages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="px-3 py-1 text-xs bg-slate-800 rounded-lg border border-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-colors"
                        >Next →</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ResultRenderer({ data }) {
    const [activeTab, setActiveTab] = useState('table');

    if (!data) return null;

    const { result } = data;

    const tabs = [
        { id: 'table', label: '📋 Results' },
        { id: 'json',  label: '{ } JSON'  },
    ];

    return (
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl overflow-hidden">
            {/* Tab Bar */}
            <div className="flex border-b border-slate-800 px-4 pt-3 gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all duration-200 ${
                            activeTab === tab.id
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 border-b-transparent -mb-px'
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
                {/* Result count badge */}
                {Array.isArray(result) && (
                    <span className="ml-auto self-center text-[10px] text-slate-500 font-mono">
                        {result.length} row{result.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="p-4"
                >
                    {activeTab === 'table' && (
                        <SortableTable data={Array.isArray(result) ? result : []} />
                    )}

                    {activeTab === 'json' && (
                        <div className="relative">
                            <button
                                onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                                className="absolute top-2 right-2 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-lg transition-colors"
                            >
                                Copy
                            </button>
                            <pre className="text-xs text-slate-300 overflow-auto max-h-96 font-mono leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}