import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function TemplatesPanel({ templates, onCreate, onTestSend, onDelete }) {
    const [confirmDelete, setConfirmDelete] = useState(null);
    const handleDelete = (name) => {
        if (confirmDelete === name) {
            onDelete(name);
            setConfirmDelete(null);
        }
        else {
            setConfirmDelete(name);
            setTimeout(() => setConfirmDelete(null), 3000);
        }
    };
    return (_jsxs("div", { className: "glass-card rounded-2xl p-6 sticky top-24 animate-fade-in delay-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h2", { className: "text-lg font-bold text-slate-900", children: "Templates" }), _jsx("button", { onClick: onCreate, className: "bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm", children: _jsx("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }) })] }), _jsxs("div", { className: "space-y-4 max-h-[70vh] overflow-y-auto pr-1", children: [templates.map((template) => (_jsxs("div", { className: "p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-200 hover:shadow-md transition-all group relative", children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600", children: template.category || 'General' }), _jsxs("div", { className: "flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsx("button", { onClick: () => onTestSend(template), className: "p-1.5 text-orange-600 hover:bg-orange-50 rounded-md", title: "Test Send", children: _jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 10V3L4 14h7v7l9-11h-7z" }) }) }), _jsx("button", { onClick: () => handleDelete(template.name), className: `p-1.5 rounded-md transition-colors ${confirmDelete === template.name
                                                    ? 'text-white bg-red-500 hover:bg-red-600'
                                                    : 'text-red-500 hover:bg-red-50'}`, title: "Delete", children: _jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" }) }) })] })] }), _jsx("h3", { className: "font-bold text-slate-800 text-sm mb-1", children: template.name }), _jsx("p", { className: "text-xs text-slate-500 bg-slate-50 p-2 rounded-lg font-mono line-clamp-3", children: template.content })] }, template.name))), templates.length === 0 && (_jsx("div", { className: "text-center py-6 text-slate-400 text-sm italic", children: "No templates yet." }))] })] }));
}
