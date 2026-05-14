import { useToast } from '../context/ToastContext';

export default function ToastContainer() {
    const { toasts, removeToast } = useToast();

    return (
        <div className="fixed top-4 right-4 z-60 flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    onClick={() => removeToast(toast.id)}
                    className={`pointer-events-auto min-w-[280px] max-w-sm rounded-xl shadow-lg border p-4 cursor-pointer transition-all duration-200 ${
                        toast.show ? 'animate-toast-in' : 'animate-toast-out'
                    } ${
                        toast.type === 'success'
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : toast.type === 'error'
                              ? 'bg-red-50 border-red-200 text-red-800'
                              : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                            {toast.type === 'success' && (
                                <svg
                                    className="w-5 h-5 text-green-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            )}
                            {toast.type === 'error' && (
                                <svg
                                    className="w-5 h-5 text-red-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            )}
                            {toast.type === 'info' && (
                                <svg
                                    className="w-5 h-5 text-blue-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            )}
                        </div>
                        <p className="text-sm font-medium flex-1">
                            {toast.message}
                        </p>
                    </div>
                    {toast.show && (
                        <div className="mt-2 h-0.5 bg-current opacity-20 rounded-full overflow-hidden">
                            <div className="h-full bg-current animate-progress" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
