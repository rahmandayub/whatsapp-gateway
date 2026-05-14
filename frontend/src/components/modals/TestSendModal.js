import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
export default function TestSendModal({ template, sessions, onSend, onClose }) {
    const { addToast } = useToast();
    const [sessionId, setSessionId] = useState('');
    const [to, setTo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const variables = useMemo(() => {
        const matches = [...template.content.matchAll(/\{\{(.*?)\}\}/g)];
        const vars = {};
        matches.forEach((m) => {
            const key = m[1].trim();
            if (!(key in vars))
                vars[key] = '';
        });
        return vars;
    }, [template]);
    const [varValues, setVarValues] = useState(variables);
    const handleSubmit = async () => {
        if (!sessionId) {
            addToast('Please select a session', 'error');
            return;
        }
        if (!to.trim()) {
            addToast('Recipient is required', 'error');
            return;
        }
        const recipient = to.includes('@') ? to.trim() : `${to.trim()}@s.whatsapp.net`;
        setIsSubmitting(true);
        try {
            await onSend(sessionId, recipient, template.name, varValues);
            onClose();
            addToast('Message sent!', 'success');
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full relative animate-fade-in", children: [_jsx("h3", { className: "text-xl font-bold mb-1 text-slate-800", children: "Test Send" }), _jsxs("p", { className: "text-slate-500 text-sm mb-2", children: ["Template: ", _jsx("span", { className: "font-medium text-slate-700", children: template.name })] }), _jsxs("div", { className: "space-y-4 mt-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Session" }), _jsxs("select", { value: sessionId, onChange: (e) => setSessionId(e.target.value), className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm", children: [_jsx("option", { value: "", children: "Select a session..." }), sessions
                                                .filter((s) => s.status === 'CONNECTED')
                                                .map((s) => (_jsx("option", { value: s.sessionId, children: s.sessionId }, s.sessionId)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "To" }), _jsx("input", { type: "text", value: to, onChange: (e) => setTo(e.target.value), placeholder: "628123456789", className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" })] }), Object.keys(varValues).length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-medium text-slate-700", children: "Variables" }), Object.keys(varValues).map((key) => (_jsxs("div", { children: [_jsx("span", { className: "text-xs text-slate-500 font-mono", children: "{{" + key + "}}" }), _jsx("input", { type: "text", value: varValues[key], onChange: (e) => setVarValues((prev) => ({ ...prev, [key]: e.target.value })), placeholder: `Value for ${key}`, className: "w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" })] }, key)))] }))] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: onClose, className: "flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleSubmit, disabled: isSubmitting, className: "flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-70", children: isSubmitting ? 'Sending...' : 'Send' })] })] })] }));
}
