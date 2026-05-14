import { useState } from 'react';
import { useToast } from '../../context/ToastContext';

interface CreateTemplateModalProps {
  onCreate: (template: { name: string; content: string; category?: string }) => Promise<void>;
  onClose: () => void;
}

export default function CreateTemplateModal({ onCreate, onClose }: CreateTemplateModalProps) {
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
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to create template', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-card bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full relative animate-fade-in">
        <h3 className="text-xl font-bold mb-1 text-slate-800">New Template</h3>
        <p className="text-slate-500 text-sm mb-6">Create a reusable message template</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="welcome_message"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="marketing"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Hello {{name}}, welcome to our service!"
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">Use {"{{variable}}"} for dynamic values</p>
          </div>
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
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
