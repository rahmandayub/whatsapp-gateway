import { useAuth } from '../context/AuthContext';

export default function Header() {
    const { logout } = useAuth();

    return (
        <header className="sticky top-0 z-40 glass border-b border-slate-200/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-linear-to-br from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20C7.6 20 4 16.4 4 12C4 7.6 7.6 4 12 4C16.4 4 20 7.6 20 12C20 16.4 16.4 20 12.05 20Z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-slate-900 to-slate-700">
                            WhatsApp Gateway
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-slate-500">
                                System Operational
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="text-sm text-slate-500 hover:text-red-600 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                    Sign Out
                </button>
            </div>
        </header>
    );
}
