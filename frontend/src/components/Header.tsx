
import { MessageSquare, Signal } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              WhatsApp Gateway
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-medium text-slate-500">
                System Operational
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="text-sm text-slate-500 hover:text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
