import { createContext, use, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
    undefined,
);

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
    );

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia(
                '(prefers-color-scheme: dark)',
            ).matches
                ? 'dark'
                : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }
    }, [theme]);

    // Listen to system preference changes when in "system" mode
    useEffect(() => {
        if (theme !== 'system') return;

        const mql = window.matchMedia('(prefers-color-scheme: dark)');

        // Apply current system theme immediately when entering system mode
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mql.matches ? 'dark' : 'light');

        const handler = () => {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(mql.matches ? 'dark' : 'light');
        };

        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, [theme]);

    const setThemeValue = (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme);
        setTheme(newTheme);
    };

    return (
        // eslint-disable-next-line @eslint-react/no-context-provider
        <ThemeProviderContext.Provider
            value={{ theme, setTheme: setThemeValue }}
        >
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = use(ThemeProviderContext);
    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');
    return context;
};
