import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import { Layout } from './components/Layout';

const DashboardPage = lazy(() =>
    import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const SessionsPage = lazy(() =>
    import('./pages/SessionsPage').then((m) => ({ default: m.SessionsPage })),
);
const MessagesPage = lazy(() =>
    import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
);
const TemplatesPage = lazy(() =>
    import('./pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const ApiKeysPage = lazy(() =>
    import('./pages/ApiKeysPage').then((m) => ({ default: m.ApiKeysPage })),
);

function App() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <AuthScreen />;
    }

    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
            }
        >
            <Routes>
                <Route element={<Layout />}>
                    <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/sessions" element={<SessionsPage />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/templates" element={<TemplatesPage />} />
                    <Route path="/keys" element={<ApiKeysPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

export default App;
