import { useState } from 'react';
import type { Template } from '../types/api';

interface TemplatesPanelProps {
  templates: Template[];
  onCreate: () => void;
  onTestSend: (template: Template) => void;
  onDelete: (name: string) => void;
}

export default function TemplatesPanel({ templates, onCreate, onTestSend, onDelete }: TemplatesPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (name: string) => {
    if (confirmDelete === name) {
      onDelete(name);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(name);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 sticky top-24 animate-fade-in delay-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">Templates</h2>
        <button
          onClick={onCreate}
          className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {templates.map((template) => (
          <div
            key={template.name}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-200 hover:shadow-md transition-all group relative"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                {template.category || 'General'}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onTestSend(template)}
                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md"
                  title="Test Send"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(template.name)}
                  className={`p-1.5 rounded-md transition-colors ${
                    confirmDelete === template.name
                      ? 'text-white bg-red-500 hover:bg-red-600'
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                  title="Delete"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">{template.name}</h3>
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg font-mono line-clamp-3">
              {template.content}
            </p>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm italic">No templates yet.</div>
        )}
      </div>
    </div>
  );
}
