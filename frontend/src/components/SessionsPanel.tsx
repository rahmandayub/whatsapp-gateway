import { useState } from 'react';
import type { Session } from '../types/api';

interface SessionsPanelProps {
  sessions: Session[];
  onCreateSession: () => void;
  onViewQR: (sessionId: string) => void;
  onResume: (sessionId: string) => void;
  onStop: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const colorMap: Record<string, string> = {
    CONNECTED: 'bg-green-50 text-green-700 border-green-200',
    SCANNING_QR: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    CONNECTING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    STOPPED: 'bg-red-50 text-red-700 border-red-200',
    DISCONNECTED: 'bg-red-50 text-red-700 border-red-200',
  };
  const dotMap: Record<string, string> = {
    CONNECTED: 'bg-green-500',
    SCANNING_QR: 'bg-yellow-500',
    CONNECTING: 'bg-yellow-500',
    STOPPED: 'bg-red-500',
    DISCONNECTED: 'bg-red-500',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide inline-flex items-center gap-1 ${colorMap[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotMap[status] || 'bg-slate-400'}`} />
      {status}
    </span>
  );
}

export default function SessionsPanel({ sessions, onCreateSession, onViewQR, onResume, onStop, onDelete }: SessionsPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDelete = (sessionId: string) => {
    if (confirmDelete === sessionId) {
      onDelete(sessionId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(sessionId);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in delay-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Active Sessions</h2>
          <p className="text-sm text-slate-500">Manage your connected WhatsApp instances</p>
        </div>
        <button
          onClick={onCreateSession}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <div
            key={session.sessionId}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 truncate" title={session.sessionId}>
                  {session.sessionId}
                </h3>
                {session.whatsappId && (
                  <p className="text-xs text-slate-500 font-mono truncate mb-2" title={session.whatsappId}>
                    {session.whatsappId.split(':')[0].split('@')[0]}
                  </p>
                )}
                <StatusBadge status={session.status} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-2">
              {session.status === 'SCANNING_QR' && (
                <button
                  onClick={() => onViewQR(session.sessionId)}
                  className="flex-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  View QR
                </button>
              )}
              {(session.status === 'STOPPED' || session.status === 'DISCONNECTED') && (
                <button
                  onClick={() => onResume(session.sessionId)}
                  className="flex-1 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Start Session
                </button>
              )}
              {session.status !== 'STOPPED' && session.status !== 'DISCONNECTED' && (
                <button
                  onClick={() => onStop(session.sessionId)}
                  className="flex-1 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Stop
                </button>
              )}
              <button
                onClick={() => handleDelete(session.sessionId)}
                className={`p-2 rounded-lg transition-colors ${
                  confirmDelete === session.sessionId
                    ? 'text-white bg-red-500 hover:bg-red-600'
                    : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 mt-4 bg-slate-50/50">
          <p className="text-slate-500">No active sessions found. Start by creating one.</p>
        </div>
      )}
    </div>
  );
}
