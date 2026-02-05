
import { useState } from "react";
import Modal from "../ui/Modal";
import { Session, Template } from "@/services/api";

interface TestSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
  sessions: Session[];
  onSend: (sessionId: string, to: string, templateName: string, variables: Record<string, string>) => Promise<void>;
}

export default function TestSendModal({
  isOpen,
  onClose,
  template,
  sessions,
  onSend,
}: TestSendModalProps) {
  const [sessionId, setSessionId] = useState("");
  const [to, setTo] = useState("");
  const [variables, setVariables] = useState("{}");
  const [loading, setLoading] = useState(false);

  // Parse variables from template content on open?
  // We can't easily do it here unless we use useEffect when template changes.
  // For simplicity, we assume the user knows or it's pre-filled if logic was lifted.
  // But let's try to pre-fill if empty.
  // Actually, we can leave it empty JSON for now.

  const handleSubmit = async () => {
    if (!sessionId || !to || !template) return;
    setLoading(true);
    try {
        let vars = {};
        try {
            vars = JSON.parse(variables);
        } catch (e) {
            alert("Invalid JSON variables");
            setLoading(false);
            return;
        }

        await onSend(sessionId, to, template.name, vars);
        onClose();
    } catch (e) {
        console.error("Test send failed", e);
        alert("Failed to send test message");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Test Template">
      <div className="mb-6">
        <span className="text-sm font-medium text-slate-500">Sending: </span>
        <span className="inline-block bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-sm font-mono">
          {template?.name}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            From Session
          </label>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          >
            <option value="">Select a connected session</option>
            {sessions.map((s) => (
              <option
                key={s.sessionId}
                value={s.sessionId}
                disabled={s.status !== "CONNECTED"}
              >
                {s.sessionId}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            To WhatsApp Number
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="1234567890"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Variables (JSON)
          </label>
          <textarea
            value={variables}
            onChange={(e) => setVariables(e.target.value)}
            rows={3}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none font-mono text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="{}"
          ></textarea>
        </div>
      </div>
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-slate-500 hover:text-slate-700 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !sessionId || !to}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Test"}
        </button>
      </div>
    </Modal>
  );
}
