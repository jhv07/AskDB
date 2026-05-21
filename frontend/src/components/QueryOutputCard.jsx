import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Terminal, Copy, Check, Zap, ChevronDown, ChevronUp, Code2, Braces } from 'lucide-react';

function buildMongoshCommand(collection, queryType, mongoQuery, sort, skip, limit) {
    const col = collection || 'yourCollection';
    const type = (queryType || 'find').toLowerCase();
    const queryStr = JSON.stringify(mongoQuery, null, 2);
    if (type === 'aggregate') return `db.${col}.aggregate(${queryStr})`;
    if (type === 'count' || type === 'countdocuments') return `db.${col}.countDocuments(${queryStr})`;
    
    let command = `db.${col}.find(${queryStr})`;

    // SORT
    if (sort && Object.keys(sort).length > 0) {
        command += `\n.sort(${JSON.stringify(sort, null, 2)})`;
    }

    // SKIP
    if (typeof skip === "number" && skip > 0) {
        command += `\n.skip(${skip})`;
    }

    // LIMIT
    if (typeof limit === "number" && limit > 0) {
        command += `\n.limit(${limit})`;
    }

    return command;
}

function JsonHighlight({ code, isDark }) {
    if (!code) return null;
    const highlighted = code
        .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
        .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
        .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
        .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
        .replace(/: (null)/g, ': <span class="json-null">$1</span>')
        .replace(/"(\$[a-zA-Z]+)"/g, '<span class="json-op">"$1"</span>');
    return (
        <code
            className={`json-highlighted block text-sm leading-7 font-mono ${isDark ? '' : 'json-light'}`}
            dangerouslySetInnerHTML={{ __html: highlighted }}
        />
    );
}

function SqlHighlight({ code, isDark }) {
    if (!code) return <code className={`text-sm font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{code}</code>;
    const SQL_KEYWORDS = ['SELECT','FROM','WHERE','AND','OR','NOT','IN','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','JOIN','LEFT','RIGHT','INNER','OUTER','ON','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','AS','DISTINCT','COUNT','SUM','AVG','MIN','MAX','ASC','DESC','NULL','IS'];
    let highlighted = code;
    SQL_KEYWORDS.forEach((kw) => {
        highlighted = highlighted.replace(new RegExp(`\\b(${kw})\\b`, 'gi'), `<span class="sql-kw">$1</span>`);
    });
    highlighted = highlighted.replace(/'([^']*)'/g, `<span class="sql-str">'$1'</span>`);
    highlighted = highlighted.replace(/\b(\d+)\b/g, `<span class="sql-num">$1</span>`);
    return <code className={`block text-sm leading-7 font-mono ${isDark ? '' : 'sql-light'}`} dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

function CopyButton({ text, label = 'Copy', isDark }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try { await navigator.clipboard.writeText(text); }
        catch { const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-200 ${
                copied
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                    : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
            }`}>
            <AnimatePresence mode="wait">
                {copied
                    ? <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1"><Check size={11} /> Copied!</motion.span>
                    : <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-1"><Copy size={11} /> {label}</motion.span>
                }
            </AnimatePresence>
        </motion.button>
    );
}

function MongoQueryCard({ mongoQuery, sort, skip, limit, queryType, collection, isDark }) {
    const [expanded, setExpanded] = useState(true);
    const prettyJson = JSON.stringify(mongoQuery, null, 2);
    const mongoshCmd = buildMongoshCommand(collection, queryType, mongoQuery, sort, skip, limit);

    // Dark: deep green theme. Light: clean white with slate/green accents
    const cardBg   = isDark ? 'bg-[#0a1a12] border-emerald-500/20 shadow-[0_4px_40px_rgba(16,185,129,0.07)]' : 'bg-white border-slate-200 shadow-sm';
    const headerBg = isDark ? 'border-emerald-500/10 bg-emerald-500/5' : 'border-slate-100 bg-slate-50/80';
    const titleClr = isDark ? 'text-emerald-300' : 'text-slate-800';
    const subClr   = isDark ? 'text-emerald-600' : 'text-slate-400';
    const codeBg   = isDark ? 'bg-[#071210] border-emerald-500/10' : 'bg-slate-50 border-slate-200';
    const termBg   = isDark ? 'bg-[#040d09] border-emerald-500/15' : 'bg-slate-900 border-slate-700';
    const iconBg   = isDark ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600';
    const badgeCls = isDark ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
    const chevClr  = isDark ? 'text-emerald-600 hover:text-emerald-400' : 'text-slate-400 hover:text-slate-600';
    const labelClr = isDark ? 'text-emerald-600' : 'text-slate-400';
    const lineNumClr = isDark ? 'text-emerald-900' : 'text-slate-300';
    const glowBar  = isDark ? 'bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent';

    return (
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
            className={`relative rounded-2xl border overflow-hidden transition-shadow duration-300 ${cardBg}`}>
            <div className={`absolute top-0 left-0 right-0 h-px ${glowBar}`} />
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${headerBg}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconBg}`}>
                        <Database size={14} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-bold tracking-wide ${titleClr}`}>MongoDB Query</h3>
                        <p className={`text-[10px] font-mono uppercase tracking-widest ${subClr}`}>
                            {(queryType || 'find').toUpperCase()} · {collection || 'collection'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${badgeCls}`}>
                        {queryType || 'find'}
                    </span>
                    <button onClick={() => setExpanded((v) => !v)} className={`transition-colors ${chevClr}`}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                        {/* JSON */}
                        <div className="px-5 pt-4 pb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Braces size={11} className={labelClr} />
                                <span className={`text-[10px] uppercase tracking-widest font-bold ${labelClr}`}>Filter / Pipeline</span>
                                <div className="flex-1" />
                                <CopyButton text={prettyJson} label="Copy JSON" isDark={isDark} />
                            </div>
                            <div className={`relative rounded-xl border p-4 overflow-auto max-h-52 custom-scrollbar ${codeBg}`}>
                                <div className="absolute left-0 top-0 bottom-0 w-9 flex flex-col items-end pr-2 pt-4 select-none pointer-events-none">
                                    {prettyJson.split('\n').map((_, i) => (
                                        <span key={i} className={`text-xs font-mono leading-7 ${lineNumClr}`}>{i + 1}</span>
                                    ))}
                                </div>
                                <div className="pl-10">
                                    <JsonHighlight code={prettyJson} isDark={isDark} />
                                </div>
                            </div>
                        </div>
                        {/* mongosh */}
                        <div className="px-5 pb-5 pt-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Terminal size={11} className={labelClr} />
                                <span className={`text-[10px] uppercase tracking-widest font-bold ${labelClr}`}>mongosh Command</span>
                                <div className="flex-1" />
                                <CopyButton text={mongoshCmd} label="Copy mongosh" isDark={isDark} />
                            </div>
                            <div className={`relative rounded-xl border p-4 overflow-auto max-h-40 custom-scrollbar ${termBg}`}>
                                <div className="flex gap-1.5 mb-3">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-emerald-500 font-mono text-sm select-none shrink-0">$</span>
                                    <pre className="text-emerald-300 text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">{mongoshCmd}</pre>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function SqlQueryCard({ sqlQuery, isDark }) {
    const [expanded, setExpanded] = useState(true);
    if (!sqlQuery) return null;

    const cardBg   = isDark ? 'bg-[#070f1a] border-cyan-500/20 shadow-[0_4px_40px_rgba(6,182,212,0.06)]' : 'bg-white border-slate-200 shadow-sm';
    const headerBg = isDark ? 'border-cyan-500/10 bg-cyan-500/5' : 'border-slate-100 bg-slate-50/80';
    const titleClr = isDark ? 'text-cyan-300' : 'text-slate-800';
    const subClr   = isDark ? 'text-cyan-600' : 'text-slate-400';
    const codeBg   = isDark ? 'bg-[#040a12] border-cyan-500/10' : 'bg-slate-50 border-slate-200';
    const iconBg   = isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-600';
    const badgeCls = isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-700';
    const chevClr  = isDark ? 'text-cyan-600 hover:text-cyan-400' : 'text-slate-400 hover:text-slate-600';
    const labelClr = isDark ? 'text-cyan-600' : 'text-slate-400';
    const lineNumClr = isDark ? 'text-cyan-900' : 'text-slate-300';
    const glowBar  = isDark ? 'bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-300/60 to-transparent';

    return (
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.1 } } }}
            className={`relative rounded-2xl border overflow-hidden transition-shadow duration-300 ${cardBg}`}>
            <div className={`absolute top-0 left-0 right-0 h-px ${glowBar}`} />
            <div className={`flex items-center justify-between px-5 py-4 border-b ${headerBg}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconBg}`}>
                        <Code2 size={14} />
                    </div>
                    <div>
                        <h3 className={`text-sm font-bold tracking-wide ${titleClr}`}>SQL Equivalent</h3>
                        <p className={`text-[10px] font-mono uppercase tracking-widest ${subClr}`}>SELECT · Translated</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest ${badgeCls}`}>SQL</span>
                    <button onClick={() => setExpanded((v) => !v)} className={`transition-colors ${chevClr}`}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>
            <AnimatePresence>
                {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Terminal size={11} className={labelClr} />
                            <span className={`text-[10px] uppercase tracking-widest font-bold ${labelClr}`}>SQL Statement</span>
                            <div className="flex-1" />
                            <CopyButton text={sqlQuery} label="Copy SQL" isDark={isDark} />
                        </div>
                        <div className={`relative rounded-xl border p-4 overflow-auto max-h-48 custom-scrollbar ${codeBg}`}>
                            <div className="absolute left-0 top-0 bottom-0 w-9 flex flex-col items-end pr-2 pt-4 select-none pointer-events-none">
                                {sqlQuery.split('\n').map((_, i) => (
                                    <span key={i} className={`text-xs font-mono leading-7 ${lineNumClr}`}>{i + 1}</span>
                                ))}
                            </div>
                            <div className="pl-10">
                                <SqlHighlight code={sqlQuery} isDark={isDark} />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function QueryOutputCard({ mongoQuery, sqlQuery, queryType = 'find', collection = 'collection', confidence, explanation, aiSource, sort, skip, limit, isDark = true }) {
    if (!mongoQuery && !sqlQuery) return null;
    const titleClr = isDark ? 'text-slate-100' : 'text-slate-800';
    const subClr   = isDark ? 'text-slate-500' : 'text-slate-400';

    return (
        <>
            <style>{`
                /* Dark mode syntax */
                .json-key     { color: #86efac; }
                .json-string  { color: #fbbf24; }
                .json-number  { color: #fb923c; }
                .json-bool    { color: #60a5fa; }
                .json-null    { color: #94a3b8; }
                .json-op      { color: #c084fc; }
                .sql-kw       { color: #60a5fa; font-weight: 700; }
                .sql-str      { color: #fbbf24; }
                .sql-num      { color: #fb923c; }
                .sql-comment  { color: #475569; font-style: italic; }
                /* Light mode syntax overrides */
                .json-light .json-key    { color: #059669; }
                .json-light .json-string { color: #d97706; }
                .json-light .json-number { color: #ea580c; }
                .json-light .json-bool   { color: #2563eb; }
                .json-light .json-null   { color: #64748b; }
                .json-light .json-op     { color: #7c3aed; }
                .sql-light .sql-kw       { color: #1d4ed8; font-weight: 700; }
                .sql-light .sql-str      { color: #d97706; }
                .sql-light .sql-num      { color: #ea580c; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
            `}</style>

            <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }}
                initial="hidden" animate="visible" className="w-full space-y-4">

                {/* Section label */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className={`text-sm font-bold tracking-tight ${titleClr}`}>Generated Queries</h2>
                        <p className={`text-xs mt-0.5 ${subClr}`}>MongoDB & SQL Equivalent</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {confidence !== undefined && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                                confidence > 0.9 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                                confidence > 0.7 ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                                'border-rose-500/30 bg-rose-500/10 text-rose-400'
                            }`}>
                                Confidence: {Math.round(confidence * 100)}%
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                            isDark ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' : 'border-orange-300 bg-orange-50 text-orange-600'
                        }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            {aiSource === 'pattern' ? 'Pattern Match' : aiSource === 'ollama' ? 'Ollama AI' : 'NLP Fallback'}
                        </div>
                        
                        {(sort || limit) && queryType !== 'aggregate' && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                                isDark ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' : 'border-purple-300 bg-purple-50 text-purple-600'
                            }`}>
                                👑 Ranking
                            </div>
                        )}
                        
                        {queryType === 'aggregate' && (
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                                isDark ? 'border-pink-500/30 bg-pink-500/10 text-pink-400' : 'border-pink-300 bg-pink-50 text-pink-600'
                            }`}>
                                📊 Aggregation
                            </div>
                        )}
                    </div>
                </div>

                {explanation && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-4 ${isDark ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100 shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">📘</span>
                            <h3 className={`text-sm font-bold tracking-wide ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>Query Explanation</h3>
                        </div>
                        <p className={`text-sm leading-relaxed font-medium pl-8 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {explanation}
                        </p>
                    </motion.div>
                )}

                {mongoQuery && <MongoQueryCard mongoQuery={mongoQuery} sort={sort} skip={skip} limit={limit} queryType={queryType} collection={collection} isDark={isDark} />}
                {sqlQuery && <SqlQueryCard sqlQuery={sqlQuery} isDark={isDark} />}
            </motion.div>
        </>
    );
}
