import {
    createContext,
    use,
    useState,
    useCallback,
    type ReactNode,
} from 'react';

interface AuthContextType {
    apiKey: string;
    isAuthenticated: boolean;
    login: (key: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'WA_GATEWAY_API_KEY';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [apiKey, setApiKey] = useState(
        () => localStorage.getItem(STORAGE_KEY) || '',
    );
    const [isAuthenticated, setIsAuthenticated] = useState(!!apiKey);

    const login = useCallback((key: string) => {
        localStorage.setItem(STORAGE_KEY, key);
        setApiKey(key);
        setIsAuthenticated(true);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setApiKey('');
        setIsAuthenticated(false);
    }, []);

    return (
        <AuthContext value={{ apiKey, isAuthenticated, login, logout }}>
            {children}
        </AuthContext>
    );
}

export function useAuth() {
    const ctx = use(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
