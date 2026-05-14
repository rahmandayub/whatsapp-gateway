import { type ReactNode } from 'react';
interface AuthContextType {
    apiKey: string;
    isAuthenticated: boolean;
    login: (key: string) => void;
    logout: () => void;
}
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextType;
export {};
