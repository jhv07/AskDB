import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchHistory, toggleFavorite as toggleFavAPI, deleteHistoryEntry, clearHistory } from '../services/api';

const TYPE_COLORS = {
    find:      'text-blue-500 bg-blue-50 border-blue-200',
    aggregate: 'text-violet-500 bg-violet-50 border-violet-200',
    count:     'text-cyan-500 bg-cyan-50 border-cyan-200',
};
const TYPE_COLORS_DARK = {
    find:      'text-blue-400 bg-blue-400/10 border-blue-400/25',
    aggregate: 'text-violet-400 bg-violet-400/10 border-violet-400/25',
    count:     'text-cyan-400 bg-cyan-400/10 border-cyan-400/25',
};

function TimeAgo({ ts }) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    if (mins < 1)  return <span>just now</span>;
    if (mins < 60) return <span>{mins}m ago</span>;
    if (hrs < 24)  return <span>{hrs}h ago</span>;
    return <span>{new Date(ts).toLocaleDateString()}</span>;
}

export default function QueryHistoryPanel({ localHistory = [], activeQueryId, onSelectQuery, onReplayQuery, onEditQuery, onToggleStar, onDelete, isDark = true }) {
    const [dbHistory, setDbHistory]       = useState([]);
    const [search, setSearch]             = useState('');
    const [filter, setFilter]             = useState('all');
    const [isLoading, setIsLoading]       = useState(false);
    const [clearConfirm, setClearConfirm] = useState(false);
    const [editingId, setEditingId]       = useState(null);
    const [editText, setEditText]         = useState('');

    const loadHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchHistory({ limit: 60, search });
            setDbHistory(res.data.entries || []);
        } catch { /* fallback to localHistory */ }
        finally { setIsLoading(false); }
    }, [search]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    const getId    = (h) => h._id?.toString() || h.id;
    const getQuery = (h) => h.userQuery || h.query || '';
    const getTime  = (h) => h.createdAt  || h.timestamp;
    const getQType = (h) => h.generatedQuery?.query_type || h.queryObject?.query_type || 'find';
    const getExecT = (h) => h.executionTime ?? h.mongoExecutionTime;

    const merged = React.useMemo(() => {
        const dbIds = new Set(dbHistory.map(getId));
        return [...localHistory.filter((h) => !dbIds.has(getId(h))), ...dbHistory];
    }, [localHistory, dbHistory]);

    const filtered = filter === 'favorites' ? merged.filter((h) => h.isFavorite) : merged;

    const handleToggleFav = async (e, id) => {
        e.stopPropagation();
        const isCurrentlyFav = merged.find(h => getId(h) === id)?.isFavorite;
        
        // Log based on the new state we are moving to
        if (!isCurrentlyFav) {
            console.log('✅ QUERY STARRED', id);
        } else {
            console.log('✅ QUERY UNSTARRED', id);
        }

        // 1. Update local state immediately via prop
        if (onToggleStar) onToggleStar(id);

        try {
            // 2. Update local dbHistory state immediately
            setDbHistory((prev) => prev.map((h) => getId(h) === id ? { ...h, isFavorite: !h.isFavorite } : h));
            
            // 3. If it looks like a Mongo _id (24 hex chars), hit the backend API
            if (id && id.length === 24) {
                await toggleFavAPI(id);
            }
        } catch {}
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        const confirmDelete = window.confirm('Remove this query from history?');
        if (!confirmDelete) return;
        
        console.log('✅ QUERY REMOVED', id);

        // 1. Remove from local history via prop
        if (onDelete) onDelete(id);

        try { 
            // 2. Remove from local dbHistory state
            setDbHistory((prev) => prev.filter((h) => getId(h) !== id)); 
            
            // 3. If it looks like a Mongo _id, hit the backend API
            if (id && id.length === 24) {
                await deleteHistoryEntry(id); 
            }
        } catch {}
    };
    const handleClearAll = async () => {
        if (!clearConfirm) { setClearConfirm(true); setTimeout(() => setClearConfirm(false), 3000); return; }
        try { await clearHistory(); setDbHistory([]); setClearConfirm(false); } catch {}
    };
    const handleStartEdit = (e, item) => { e.stopPropagation(); setEditingId(getId(item)); setEditText(getQuery(item)); };
    const handleConfirmEdit = (e) => { e.stopPropagation(); if (editText.trim() && onEditQuery) onEditQuery(editText.trim()); setEditingId(null); setEditText(''); };

    // Theme classes
    const sideBg      = isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-200/80';
    const headerBg    = isDark ? 'bg-slate-900/90 border-slate-800/60 backdrop-blur-md' : 'bg-white/95 border-slate-100 shadow-sm';
    const titleClr    = isDark ? 'text-slate-200' : 'text-slate-700';
    const searchCls   = isDark
        ? 'bg-slate-800 border-slate-700 text-slate-300 placeholder-slate-500 focus:border-blue-500/50'
        : 'bg-slate-50 border-slate-200 text-slate-700 placeholder-slate-400 focus:border-blue-400/60';
    const footerClr   = isDark ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-400';

    return (
        <div className={`flex flex-col h-full border-r w-72 xl:w-80 shrink-0 shadow-lg ${sideBg}`}>

            {/* Header */}
            <div className={`p-4 border-b sticky top-0 z-10 space-y-3 ${headerBg}`}>
                <div className="flex items-center justify-between">
                    <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${titleClr}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History
                    </h2>
                    <div className="flex items-center gap-1.5">
                        <button onClick={loadHistory} title="Refresh"
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-slate-500 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-50'}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <motion.button onClick={handleClearAll} whileTap={{ scale: 0.95 }}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wider ${
                                clearConfirm
                                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-500 animate-pulse'
                                    : isDark
                                        ? 'bg-slate-800 border-slate-700 text-slate-500 hover:border-rose-500/40 hover:text-rose-400'
                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-rose-400/60 hover:text-rose-500'
                            }`}>
                            {clearConfirm ? '⚠ Confirm' : 'Clear'}
                        </motion.button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search history…" value={search} onChange={(e) => setSearch(e.target.value)}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/15 transition-all ${searchCls}`} />
                </div>

                {/* Tabs */}
                <div className={`flex gap-1 p-0.5 rounded-xl ${isDark ? 'bg-slate-800/60' : 'bg-slate-100'}`}>
                    {['all', 'favorites'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all capitalize ${
                                filter === f
                                    ? isDark
                                        ? 'bg-slate-700 text-slate-200 shadow-sm'
                                        : 'bg-white text-slate-700 shadow-sm'
                                    : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                            }`}>
                            {f === 'favorites' ? '★ Starred' : '⊞ All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ scrollbarWidth: 'thin', scrollbarColor: isDark ? '#334155 transparent' : '#cbd5e1 transparent' }}>
                {isLoading ? (
                    <div className="space-y-2 pt-1">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={`h-[72px] rounded-xl animate-pulse ${isDark ? 'bg-slate-800/50' : 'bg-slate-100'}`} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className={`text-center py-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <svg className="w-8 h-8 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm font-medium">{filter === 'favorites' ? 'No starred queries' : 'No history yet'}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                            {filter === 'favorites' ? 'Star queries to save here' : 'Ask something to get started'}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {filtered.map((item, idx) => {
                            const id = getId(item);
                            const isActive = activeQueryId === id || activeQueryId === item.id;
                            const qType = getQType(item);
                            const typeColor = isDark ? (TYPE_COLORS_DARK[qType] || TYPE_COLORS_DARK.find) : (TYPE_COLORS[qType] || TYPE_COLORS.find);
                            const isEditing = editingId === id;

                            return (
                                <motion.div key={id || idx}
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14, scale: 0.96 }}
                                    transition={{ duration: 0.18, delay: idx * 0.01 }}
                                    onClick={() => !isEditing && onSelectQuery(item)}
                                    className={`relative p-3 rounded-xl cursor-pointer transition-all border group ${
                                        isActive
                                            ? isDark
                                                ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                                                : 'bg-blue-50 border-blue-300/60 shadow-sm'
                                            : isDark
                                                ? 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                    }`}>
                                    {/* Top row */}
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${typeColor}`}>{qType.toUpperCase()}</span>
                                        <span className={`text-[9px] ml-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`}><TimeAgo ts={getTime(item)} /></span>
                                        {/* Actions (hover) */}
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {id && (
                                                <button onClick={(e) => handleToggleFav(e, id)} title={item.isFavorite ? "Unstar" : "Star"}
                                                    className={`p-1 rounded text-xs transition-transform transform active:scale-90 ${item.isFavorite ? 'text-amber-400 drop-shadow-md scale-110' : isDark ? 'text-slate-600 hover:text-amber-400' : 'text-slate-300 hover:text-amber-500'}`}>
                                                    {item.isFavorite ? '★' : '☆'}
                                                </button>
                                            )}
                                            <button onClick={(e) => handleStartEdit(e, item)}
                                                className={`p-1 rounded text-xs transition-colors ${isDark ? 'text-slate-600 hover:text-blue-400' : 'text-slate-300 hover:text-blue-500'}`}>
                                                ✏
                                            </button>
                                            {id && (
                                                <button onClick={(e) => handleDelete(e, id)}
                                                    className={`p-1 rounded text-xs transition-colors ${isDark ? 'text-slate-600 hover:text-rose-400' : 'text-slate-300 hover:text-rose-500'}`}>
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                            <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit(e); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }}
                                                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${isDark ? 'bg-slate-700 border-blue-500/50 text-slate-200 focus:border-blue-400' : 'bg-white border-blue-400 text-slate-800'}`} />
                                            <div className="flex gap-1.5">
                                                <button onClick={handleConfirmEdit} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs py-1.5 rounded-lg font-bold transition-colors">↺ Run</button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                                                    className={`px-3 text-xs py-1.5 rounded-lg transition-colors ${isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className={`text-xs font-medium line-clamp-2 leading-snug mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                "{getQuery(item)}"
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {getExecT(item) !== undefined && (
                                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'text-emerald-400 bg-emerald-400/10' : 'text-emerald-600 bg-emerald-50'}`}>
                                                        ⚡ {getExecT(item)}ms
                                                    </span>
                                                )}
                                                {onReplayQuery && (
                                                    <button onClick={(e) => { e.stopPropagation(); onReplayQuery(getQuery(item)); }}
                                                        className={`text-[10px] font-bold uppercase tracking-wider ml-auto opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600'}`}>
                                                        ↺ Replay
                                                    </button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Footer */}
            <div className={`px-4 py-3 border-t flex items-center justify-between text-[11px] ${footerClr}`}>
                <span>{filtered.length} {filter === 'favorites' ? 'starred' : 'queries'}</span>
                <span className={isDark ? 'text-slate-700' : 'text-slate-300'}>AskDB · MongoDB</span>
            </div>
        </div>
    );
}
