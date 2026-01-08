
import { useState } from "react";
import Modal from "../ui/Modal";

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (sessionId: string, webhookUrl?: string) => Promise<void>;
}

export default function CreateSessionModal({
  isOpen,
  onClose,
  onCreate,
}: CreateSessionModalProps) {
  const [sessionId, setSessionId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!sessionId) return;
    setLoading(true);
    await onCreate(sessionId, webhookUrl);
    setLoading(false);
    setSessionId("");
    setWebhookUrl("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Session">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Session ID
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="e.g. marketing-1"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Webhook URL (Optional)
          </label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="https://your-api.com/webhook"
          />
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
          disabled={loading || !sessionId}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Session"}
        </button>
      </div>
    </Modal>
  );
}
