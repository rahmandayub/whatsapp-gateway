import { useState } from 'react';
import type { MessageLogEntry } from '../types/api';

interface MessageLogProps {
  messages: MessageLogEntry[];
  onSendMessage: () => void;
}

export default function MessageLog({ messages, onSendMessage }: MessageLogProps) {
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');

  const filtered = messages.filter((m) => (filter === 'all' ? true : m.direction === filter));

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in delay-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Live Message Log</h2>
          <p className="text-sm text-slate-500">Real-time incoming and outgoing messages</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['all', 'incoming', 'outgoing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={onSendMessage}
            className="text-orange-600 bg-orange-50 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-all flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Quick Send
          </button>
        </div>
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
            {filtered.map((msg) => (
              <tr key={msg.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      msg.direction === 'incoming' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                    }`}
                  >
                    {msg.direction === 'incoming' ? 'Incoming' : 'Outgoing'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-medium text-slate-900">{msg.from || msg.to}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{msg.sessionId}</div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-700 line-clamp-2 max-w-sm">{msg.text}</p>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                  {messages.length === 0 ? 'Waiting for messages...' : 'No messages match this filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
