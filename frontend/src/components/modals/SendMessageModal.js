import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
export default function SendMessageModal({ sessions, onClose, onSent, }) {
    const { addToast } = useToast();
    const apiCall = useApi();
    const fileInputRef = useRef(null);
    const [sessionId, setSessionId] = useState('');
    const [to, setTo] = useState('');
    const [msgType, setMsgType] = useState('text');
    const [text, setText] = useState('');
    const [files, setFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleFileSelect = (e) => {
        const selected = Array.from(e.target.files || []);
        const newFiles = selected.map((f) => ({
            rawFile: f,
            caption: '',
            id: `${Date.now()}-${Math.random()}`,
        }));
        setFiles((prev) => [...prev, ...newFiles]);
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    };
    const removeFile = (id) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };
    const updateCaption = (id, caption) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, caption } : f)));
    };
    const handleSubmit = async () => {
        if (!sessionId) {
            addToast('Please select a session', 'error');
            return;
        }
        if (!to.trim()) {
            addToast('Recipient is required', 'error');
            return;
        }
        const recipient = to.includes('@')
            ? to.trim()
            : `${to.trim()}@s.whatsapp.net`;
        setIsSubmitting(true);
        try {
            if (msgType === 'text') {
                if (!text.trim()) {
                    addToast('Message text is required', 'error');
                    setIsSubmitting(false);
                    return;
                }
                await apiCall(`/sessions/${sessionId}/message/send/text`, 'POST', {
                    to: recipient,
                    message: text,
                });
            }
            else {
                if (files.length === 0) {
                    addToast('Please select files', 'error');
                    setIsSubmitting(false);
                    return;
                }
                const formData = new FormData();
                formData.append('to', recipient);
                files.forEach((f) => {
                    formData.append('files', f.rawFile);
                    formData.append('captions', f.caption);
                });
                await apiCall(`/sessions/${sessionId}/message/send/file`, 'POST', formData);
            }
            addToast('Message sent!', 'success');
            onSent();
            onClose();
        }
        catch (err) {
            addToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full relative animate-fade-in max-h-[90vh] overflow-y-auto", children: [_jsx("h3", { className: "text-xl font-bold mb-1 text-slate-800", children: "Send Message" }), _jsx("p", { className: "text-slate-500 text-sm mb-6", children: "Send a message via an active session" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Session" }), _jsxs("select", { value: sessionId, onChange: (e) => setSessionId(e.target.value), className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm", children: [_jsx("option", { value: "", children: "Select a session..." }), sessions
                                                .filter((s) => s.status === 'CONNECTED')
                                                .map((s) => (_jsx("option", { value: s.sessionId, children: s.sessionId }, s.sessionId)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "To" }), _jsx("input", { type: "text", value: to, onChange: (e) => setTo(e.target.value), placeholder: "628123456789", className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setMsgType('text'), className: `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${msgType === 'text'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: "Text" }), _jsx("button", { onClick: () => setMsgType('file'), className: `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${msgType === 'file'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`, children: "File" })] }), msgType === 'text' ? (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-slate-700 mb-1", children: "Message" }), _jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), rows: 4, placeholder: "Type your message...", className: "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm resize-none" })] })) : (_jsxs("div", { children: [_jsx("input", { ref: fileInputRef, type: "file", multiple: true, onChange: handleFileSelect, className: "hidden" }), _jsx("button", { onClick: () => fileInputRef.current?.click(), className: "w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 transition-colors text-sm font-medium", children: "+ Select Files" }), files.length > 0 && (_jsx("div", { className: "mt-3 space-y-2", children: files.map((f) => (_jsxs("div", { className: "flex items-center gap-2 bg-slate-50 rounded-lg p-2", children: [_jsx("span", { className: "text-xs text-slate-600 truncate flex-1", children: f.rawFile.name }), _jsx("input", { type: "text", value: f.caption, onChange: (e) => updateCaption(f.id, e.target.value), placeholder: "Caption", className: "w-32 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500" }), _jsx("button", { onClick: () => removeFile(f.id), className: "p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md", children: _jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }, f.id))) }))] }))] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: onClose, className: "flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleSubmit, disabled: isSubmitting, className: "flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-70", children: isSubmitting ? 'Sending...' : 'Send' })] })] })] }));
}
