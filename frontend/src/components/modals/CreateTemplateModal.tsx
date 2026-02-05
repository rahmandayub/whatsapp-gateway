
import { useState } from "react";
import Modal from "../ui/Modal";
import { Template } from "@/services/api";

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (template: Template) => Promise<void>;
}

export default function CreateTemplateModal({
  isOpen,
  onClose,
  onCreate,
}: CreateTemplateModalProps) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name || !content) return;
    setLoading(true);
    await onCreate({ name, content, category });
    setLoading(false);
    setName("");
    setContent("");
    setCategory("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Template">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Template Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="e.g. welcome_msg"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="Hello {{name}}, welcome to..."
          ></textarea>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            placeholder="marketing"
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
          disabled={loading || !name || !content}
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Template"}
        </button>
      </div>
    </Modal>
  );
}
