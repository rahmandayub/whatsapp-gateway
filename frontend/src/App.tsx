import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { MessagesPage } from './pages/MessagesPage';
import { TemplatesPage } from './pages/TemplatesPage';

function App() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <AuthScreen />;
    }

    return (
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
            </Route>
        </Routes>
    );
}

export default App;
