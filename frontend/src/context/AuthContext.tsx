import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react';

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const abortController = new AbortController();
        fetch('/api/v1/admin/me', {
            credentials: 'include',
            signal: abortController.signal,
        })
            .then((res) => {
                if (res.ok) setIsAuthenticated(true);
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
        return () => abortController.abort();
    }, []);

    const login = useCallback(async (username: string, password: string) => {
        const abortController = new AbortController();
        const res = await fetch('/api/v1/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password }),
            signal: abortController.signal,
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || 'Login failed');
        }
        setIsAuthenticated(true);
    }, []);

    const logout = useCallback(async () => {
        const abortController = new AbortController();
        await fetch('/api/v1/admin/logout', {
            method: 'POST',
            credentials: 'include',
            signal: abortController.signal,
        }).catch(() => {});
        setIsAuthenticated(false);
    }, []);

    return (
        // eslint-disable-next-line @eslint-react/no-context-provider
        <AuthContext.Provider
            value={{ isAuthenticated, isLoading, login, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    // eslint-disable-next-line @eslint-react/no-use-context
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
