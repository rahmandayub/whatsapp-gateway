import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
export default function CreateTemplateModal({ onCreate, onClose }) {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async () => {
        if (!name.trim() || !content.trim()) {
            addToast('Name and Content are required', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            await onCreate({ name: name.trim(), content: content.trim(), category: category.trim() || undefined });
            setName('');
            setContent('');
            setCategory('');
            onClose();
            addToast('Template created', 'success');
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to create template', 'error');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full relative animate-fade-in", children: [_jsx("h3", { className: "text-xl font-bold mb-1 text-slate-800", children: "New Template" }), _jsx("p", { className: "text-slate-500 text-sm mb-6", children: "Create a reusable message template" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), onKeyDown: (e) => e.key === 'Enter' && handleSubmit(), placeholder: "welcome_message", className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Category" }), _jsx("input", { type: "text", value: category, onChange: (e) => setCategory(e.target.value), placeholder: "marketing", className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Content" }), _jsx("textarea", { value: content, onChange: (e) => setContent(e.target.value), placeholder: "Hello {{name}}, welcome to our service!", rows: 4, className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm resize-none" }), _jsxs("p", { className: "text-xs text-slate-400 mt-1", children: ["Use ", "{{variable}}", " for dynamic values"] })] })] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: onClose, className: "flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleSubmit, disabled: isSubmitting, className: "flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-70", children: isSubmitting ? 'Creating...' : 'Create' })] })] })] }));
}
