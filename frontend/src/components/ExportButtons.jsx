import React from 'react';
import { motion } from 'framer-motion';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Export Utilities ─────────────────────────────────────────────────────────

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function exportCSV(data, filename = 'askdb_results') {
    if (!Array.isArray(data) || data.length === 0) {
        alert('No data to export');
        return;
    }
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filename}_${Date.now()}.csv`);
}

function exportPDF(data, filename = 'askdb_results') {
    if (!Array.isArray(data) || data.length === 0) {
        alert('No data to export');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });

    // Header
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246); // blue
    doc.text('AskDB — Query Results', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total records: ${data.length}`, 14, 36);

    // Table
    const columns = Object.keys(data[0]);
    const rows = data.map((row) => columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    }));

    autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 44,
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [30, 41, 59],
        },
        headStyles: {
            fillColor: [59, 130, 246],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 44 },
    });

    doc.save(`${filename}_${Date.now()}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ExportButtons({ data, disabled = false }) {
    const hasData = Array.isArray(data) && data.length > 0;

    const buttons = [
        {
            label: 'CSV',
            icon: '📥',
            onClick: () => exportCSV(data),
            color: 'hover:border-emerald-500/50 hover:text-emerald-400',
        },
        {
            label: 'PDF',
            icon: '📄',
            onClick: () => exportPDF(data),
            color: 'hover:border-rose-500/50 hover:text-rose-400',
        },
    ];

    if (!hasData && !disabled) return null;

    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Export</span>
            {buttons.map((btn) => (
                <motion.button
                    key={btn.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={btn.onClick}
                    disabled={disabled || !hasData}
                    title={`Export as ${btn.label}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                        bg-slate-800 border border-slate-700 text-slate-400 rounded-lg
                        transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                        ${btn.color}`}
                >
                    <span>{btn.icon}</span>
                    <span>{btn.label}</span>
                </motion.button>
            ))}
        </div>
    );
}
