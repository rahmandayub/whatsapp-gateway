
import { useState } from "react";
import Modal from "../ui/Modal";
import { Session } from "@/services/api";
import { clsx } from "clsx";
import { Paperclip, X } from "lucide-react";

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  onSendText: (sessionId: string, to: string, message: string) => Promise<void>;
  onSendFile: (sessionId: string, to: string, formData: FormData) => Promise<void>;
}

interface FileItem {
    rawFile: File;
    caption: string;
}

export default function SendMessageModal({
  isOpen,
  onClose,
  sessions,
  onSendText,
  onSendFile
}: SendMessageModalProps) {
  const [sessionId, setSessionId] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<"text" | "file">("text");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          const newFiles = Array.from(e.target.files).map(f => ({
              rawFile: f,
              caption: ""
          }));
          setFiles([...files, ...newFiles]);
          e.target.value = ""; // Reset
      }
  }

  const removeFile = (idx: number) => {
      setFiles(files.filter((_, i) => i !== idx));
  }

  const handleCaptionChange = (idx: number, val: string) => {
      const newFiles = [...files];
      newFiles[idx].caption = val;
      setFiles(newFiles);
  }

  const handleSubmit = async () => {
    if (!sessionId || !to) return;

    setLoading(true);
    try {
        if (type === "text") {
            if (!text) return;
            await onSendText(sessionId, to, text);
        } else {
            if (files.length === 0) return;
            const formData = new FormData();
            formData.append('to', to.includes('@') ? to : `${to}@s.whatsapp.net`);

            files.forEach(f => {
                formData.append('files', f.rawFile);
                formData.append('captions', f.caption);
            });

            await onSendFile(sessionId, to, formData);
        }

        // Reset form
        setText("");
        setFiles([]);
        onClose();
    } catch (e) {
        console.error("Send failed", e);
        alert("Failed to send message");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Message">
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
            Recipient Number
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
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Message Type
          </label>
          <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
            <button
              onClick={() => setType("text")}
              className={clsx(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                type === "text"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Text
            </button>
            <button
              onClick={() => setType("file")}
              className={clsx(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                type === "file"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              File
            </button>
          </div>
        </div>

        {type === "text" ? (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Message
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              placeholder="Type your message here..."
            ></textarea>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Attachments
            </label>
            <div className="space-y-3 mb-3">
                {files.map((file, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span className="text-sm text-slate-700 truncate font-medium">
                                    {file.rawFile.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                    ({(file.rawFile.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                            <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <input
                            type="text"
                            value={file.caption}
                            onChange={(e) => handleCaptionChange(idx, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-orange-300 transition-colors"
                            placeholder="Caption for this file..."
                        />
                    </div>
                ))}
            </div>

             <div className="flex gap-2">
                <label className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-semibold hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 cursor-pointer">
                    <PlusIcon /> Add Attachment
                    <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
            </div>
          </div>
        )}
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
          {loading ? "Sending..." : "Send Message"}
        </button>
      </div>
    </Modal>
  );
}

function PlusIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
    )
}
