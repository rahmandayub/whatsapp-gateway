import { useState, useMemo } from 'react';
import type { Template, Session } from '../../types/api';
import { useToast } from '../../context/ToastContext';

interface TestSendModalProps {
  template: Template;
  sessions: Session[];
  onSend: (sessionId: string, to: string, templateName: string, variables: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

export default function TestSendModal({ template, sessions, onSend, onClose }: TestSendModalProps) {
  const { addToast } = useToast();
  const [sessionId, setSessionId] = useState('');
  const [to, setTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const variables = useMemo(() => {
    const matches = [...template.content.matchAll(/\{\{(.*?)\}\}/g)];
    const vars: Record<string, string> = {};
    matches.forEach((m) => {
      const key = m[1].trim();
      if (!(key in vars)) vars[key] = '';
    });
    return vars;
  }, [template]);

  const [varValues, setVarValues] = useState<Record<string, string>>(variables);

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
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full relative animate-fade-in">
        <h3 className="text-xl font-bold mb-1 text-slate-800">Test Send</h3>
        <p className="text-slate-500 text-sm mb-2">Template: <span className="font-medium text-slate-700">{template.name}</span></p>

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Session</label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
            >
              <option value="">Select a session...</option>
              {sessions
                .filter((s) => s.status === 'CONNECTED')
                .map((s) => (
                  <option key={s.sessionId} value={s.sessionId}>
                    {s.sessionId}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="628123456789"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          {Object.keys(varValues).length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">Variables</label>
              {Object.keys(varValues).map((key) => (
                <div key={key}>
                  <span className="text-xs text-slate-500 font-mono">{"{{" + key + "}}"}</span>
                  <input
                    type="text"
                    value={varValues[key]}
                    onChange={(e) =>
                      setVarValues((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={`Value for ${key}`}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              ))}
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
