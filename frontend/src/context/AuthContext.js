import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, use, useState, useCallback, } from 'react';
const AuthContext = createContext(null);
const STORAGE_KEY = 'WA_GATEWAY_API_KEY';
export function AuthProvider({ children }) {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
    const [isAuthenticated, setIsAuthenticated] = useState(!!apiKey);
    const login = useCallback((key) => {
        localStorage.setItem(STORAGE_KEY, key);
        setApiKey(key);
        setIsAuthenticated(true);
    }, []);
    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setApiKey('');
        setIsAuthenticated(false);
    }, []);
    return (_jsx(AuthContext, { value: { apiKey, isAuthenticated, login, logout }, children: children }));
}
export function useAuth() {
    const ctx = use(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
