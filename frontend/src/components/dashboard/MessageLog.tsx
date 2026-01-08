
import { Message } from "@/services/api";
import { Send, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { clsx } from "clsx";

interface MessageLogProps {
  messages: Message[];
  onQuickSend: () => void;
}

export default function MessageLog({ messages, onQuickSend }: MessageLogProps) {
  return (
    <div className="bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Live Message Log</h2>
          <p className="text-sm text-slate-500">
            Real-time incoming and outgoing messages
          </p>
        </div>
        <button
          onClick={onQuickSend}
          className="text-orange-600 bg-orange-50 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-all flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Quick Send
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/80 backdrop-blur text-slate-500 font-medium">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">Direction</th>
              <th className="px-4 py-3 text-left">Details</th>
              <th className="px-4 py-3 text-left">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {messages.map((msg) => (
              <tr
                key={msg.id}
                className="hover:bg-slate-50/80 transition-colors group"
              >
                <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={clsx(
                      "px-2 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center w-max gap-1",
                      msg.direction === "incoming"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-orange-50 text-orange-600"
                    )}
                  >
                    {msg.direction === "incoming" ? <ArrowDownLeft className="w-3 h-3"/> : <ArrowUpRight className="w-3 h-3"/>}
                    {msg.direction === "incoming" ? "Incoming" : "Outgoing"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-slate-900">
                    {msg.from || msg.to}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {msg.sessionId}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-700 line-clamp-2 max-w-sm">
                    {msg.text}
                  </p>
                </td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-400 text-sm"
                >
                  Waiting for messages...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
