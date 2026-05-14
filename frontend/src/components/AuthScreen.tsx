import { useState } from 'react';

export default function AuthScreen({
    onLogin,
}: {
    onLogin: (key: string) => void;
}) {
    const [inputKey, setInputKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!inputKey.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/v1/sessions', {
                headers: { 'x-api-key': inputKey.trim() },
            });
            if (res.ok) {
                onLogin(inputKey.trim());
            } else if (res.status === 401 || res.status === 403) {
                setError('Invalid API Key.');
            } else {
                setError(`Server error (status ${res.status})`);
            }
        } catch {
            setError('Server unreachable. Is the backend running?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            {/* Background blobs */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100 blur-[120px] opacity-60" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[100px] opacity-60" />
            </div>

            <div className="glass-card p-10 rounded-2xl shadow-2xl w-full max-w-md animate-fade-in relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-orange-500 to-yellow-600" />
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-orange-600">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.66C14.25 3.66 16.31 4.51 17.87 6.07C19.42 7.63 20.28 9.69 20.28 11.91C20.28 16.32 16.59 19.89 12.05 19.89C10.57 19.89 9.17 19.5 7.96 18.79L7.68 18.63L4.54 19.45L5.38 16.39L5.2 16.11C4.42 14.86 4 13.41 4 11.91C4 7.5 8.1 3.66 12.05 3.66Z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                        Welcome Back
                    </h2>
                    <p className="text-slate-500 mt-2">
                        Enter your API Key to access the gateway
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
                        {error}
                    </div>
                )}

                <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="sk_live_..."
                    disabled={isLoading}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                    {isLoading ? (
                        <span className="animate-pulse">Connecting...</span>
                    ) : (
                        <>
                            Access Dashboard
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                            </svg>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
