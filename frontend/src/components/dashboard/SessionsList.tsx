
import { Session } from "@/services/api";
import { Plus, Trash2, StopCircle, PlayCircle, QrCode, MonitorSmartphone } from "lucide-react";
import { clsx } from "clsx";

interface SessionsListProps {
  sessions: Session[];
  onViewQR: (sessionId: string) => void;
  onStop: (sessionId: string) => void;
  onResume: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onCreateOpen: () => void;
}

export default function SessionsList({
  sessions,
  onViewQR,
  onStop,
  onResume,
  onDelete,
  onCreateOpen,
}: SessionsListProps) {
  return (
    <div className="bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Active Sessions</h2>
          <p className="text-sm text-slate-500">
            Manage your connected WhatsApp instances
          </p>
        </div>
        <button
          onClick={onCreateOpen}
          className="bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-700 shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
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
                <MonitorSmartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="font-bold text-slate-900 truncate"
                  title={session.sessionId}
                >
                  {session.sessionId}
                </h3>
                <p
                  className="text-xs text-slate-500 font-mono truncate mb-2"
                  title={session.whatsappId}
                >
                  {session.whatsappId
                    ? session.whatsappId.split(":")[0].split("@")[0]
                    : ""}
                </p>

                <div className="flex">
                  <span
                    className={clsx(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide flex items-center",
                      {
                        "bg-green-50 text-green-700 border-green-200":
                          session.status === "CONNECTED",
                        "bg-yellow-50 text-yellow-700 border-yellow-200":
                          session.status === "SCANNING_QR" ||
                          session.status === "CONNECTING",
                        "bg-red-50 text-red-700 border-red-200":
                          session.status === "STOPPED" ||
                          session.status === "DISCONNECTED",
                      }
                    )}
                  >
                    <span
                      className={clsx("w-1.5 h-1.5 rounded-full inline-block mr-1", {
                        "bg-green-500": session.status === "CONNECTED",
                        "bg-yellow-500":
                          session.status === "SCANNING_QR" ||
                          session.status === "CONNECTING",
                        "bg-red-500":
                          session.status === "STOPPED" ||
                          session.status === "DISCONNECTED",
                      })}
                    ></span>
                    {session.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-2">
              {session.status === "SCANNING_QR" && (
                <button
                  onClick={() => onViewQR(session.sessionId)}
                  className="flex-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                  <QrCode className="w-3 h-3" /> View QR
                </button>
              )}
              {(session.status === "STOPPED" ||
                session.status === "DISCONNECTED") && (
                <button
                  onClick={() => onResume(session.sessionId)}
                  className="flex-1 py-2 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                >
                  <PlayCircle className="w-3 h-3" /> Start
                </button>
              )}
              {session.status !== "STOPPED" &&
                session.status !== "DISCONNECTED" && (
                  <button
                    onClick={() => onStop(session.sessionId)}
                    className="flex-1 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <StopCircle className="w-3 h-3" /> Stop
                  </button>
                )}
              <button
                onClick={() => onDelete(session.sessionId)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-200 mt-4 bg-slate-50/50">
          <p className="text-slate-500">
            No active sessions found. Start by creating one.
          </p>
        </div>
      )}
    </div>
  );
}
