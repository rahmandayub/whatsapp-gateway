import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ThemeProvider } from './components/theme-provider.tsx';
import { Toaster } from './components/ui/sonner.tsx';

createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
        <ThemeProvider
            defaultTheme="system"
            storageKey="whatsapp-gateway-theme"
        >
            <AuthProvider>
                <App />
                <Toaster position="bottom-right" richColors />
            </AuthProvider>
        </ThemeProvider>
    </BrowserRouter>,
);
