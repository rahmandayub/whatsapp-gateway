
import { Template } from "@/services/api";
import { Plus, Play, Trash2 } from "lucide-react";

interface TemplatesListProps {
  templates: Template[];
  onTestSend: (template: Template) => void;
  onDelete: (name: string) => void;
  onCreateOpen: () => void;
}

export default function TemplatesList({
  templates,
  onTestSend,
  onDelete,
  onCreateOpen,
}: TemplatesListProps) {
  return (
    <div className="bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl p-6 sticky top-24 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-900">Templates</h2>
        <button
          onClick={onCreateOpen}
          className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {templates.map((template) => (
          <div
            key={template.name}
            className="p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-200 hover:shadow-md transition-all group relative"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                {template.category || "General"}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onTestSend(template)}
                  className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md"
                  title="Test Send"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(template.name)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-sm mb-1">
              {template.name}
            </h3>
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg font-mono line-clamp-3 break-all">
              {template.content}
            </p>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm italic">
            No templates yet.
          </div>
        )}
      </div>
    </div>
  );
}
