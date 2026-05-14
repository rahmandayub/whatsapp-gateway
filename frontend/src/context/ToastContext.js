import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, use, useState, useCallback, } from 'react';
const ToastContext = createContext(null);
let toastCounter = 0;
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'info') => {
        const id = ++toastCounter;
        const toast = { id, message, type, show: true };
        setToasts((prev) => [...prev, toast]);
        setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, show: false } : t)));
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 200);
        }, 4000);
    }, []);
    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    return (_jsx(ToastContext, { value: { toasts, addToast, removeToast }, children: children }));
}
export function useToast() {
    const ctx = use(ToastContext);
    if (!ctx)
        throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
