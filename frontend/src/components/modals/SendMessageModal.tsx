import { useState, useRef } from 'react';
import type { Session } from '../../types/api';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';

interface SendMessageModalProps {
    sessions: Session[];
    onClose: () => void;
    onSent: () => void;
}

interface FileItem {
    rawFile: File;
    caption: string;
    id: string;
}

export default function SendMessageModal({
    sessions,
    onClose,
    onSent,
}: SendMessageModalProps) {
    const { addToast } = useToast();
    const apiCall = useApi();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [sessionId, setSessionId] = useState('');
    const [to, setTo] = useState('');
    const [msgType, setMsgType] = useState<'text' | 'file'>('text');
    const [text, setText] = useState('');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        const newFiles = selected.map((f) => ({
            rawFile: f,
            caption: '',
            id: `${Date.now()}-${Math.random()}`,
        }));
        setFiles((prev) => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const updateCaption = (id: string, caption: string) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, caption } : f)),
        );
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
                await apiCall(
                    `/sessions/${sessionId}/message/send/text`,
                    'POST',
                    {
                        to: recipient,
                        message: text,
                    },
                );
            } else {
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
                await apiCall(
                    `/sessions/${sessionId}/message/send/file`,
                    'POST',
                    formData,
                );
            }

            addToast('Message sent!', 'success');
            onSent();
            onClose();
        } catch (err) {
            addToast(
                err instanceof Error ? err.message : 'Failed to send message',
                'error',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-lg w-full relative animate-fade-in max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-1 text-slate-800">
                    Send Message
                </h3>
                <p className="text-slate-500 text-sm mb-6">
                    Send a message via an active session
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Session
                        </label>
                        <select
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                        >
                            <option value="">Select a session...</option>
                            {sessions
                                .filter((s) => s.status === 'CONNECTED')
                                .map((s) => (
                                    <option
                                        key={s.sessionId}
                                        value={s.sessionId}
                                    >
                                        {s.sessionId}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            To
                        </label>
                        <input
                            type="text"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="628123456789"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setMsgType('text')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                msgType === 'text'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Text
                        </button>
                        <button
                            onClick={() => setMsgType('file')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                msgType === 'file'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            File
                        </button>
                    </div>

                    {msgType === 'text' ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Message
                            </label>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={4}
                                placeholder="Type your message..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm resize-none"
                            />
                        </div>
                    ) : (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-600 transition-colors text-sm font-medium"
                            >
                                + Select Files
                            </button>

                            {files.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {files.map((f) => (
                                        <div
                                            key={f.id}
                                            className="flex items-center gap-2 bg-slate-50 rounded-lg p-2"
                                        >
                                            <span className="text-xs text-slate-600 truncate flex-1">
                                                {f.rawFile.name}
                                            </span>
                                            <input
                                                type="text"
                                                value={f.caption}
                                                onChange={(e) =>
                                                    updateCaption(
                                                        f.id,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Caption"
                                                className="w-32 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                                            />
                                            <button
                                                onClick={() => removeFile(f.id)}
                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                                            >
                                                <svg
                                                    className="h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-70"
                    >
                        {isSubmitting ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
        </div>
    );
}
