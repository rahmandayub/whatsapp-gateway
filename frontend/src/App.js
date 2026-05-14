import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { useSessions } from './hooks/useSessions';
import { useTemplates } from './hooks/useTemplates';
import { useMessageLog } from './hooks/useMessageLog';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import SessionsPanel from './components/SessionsPanel';
import MessageLog from './components/MessageLog';
import TemplatesPanel from './components/TemplatesPanel';
import ToastContainer from './components/ToastContainer';
import QRModal from './components/modals/QRModal';
import CreateSessionModal from './components/modals/CreateSessionModal';
import CreateTemplateModal from './components/modals/CreateTemplateModal';
import TestSendModal from './components/modals/TestSendModal';
import SendMessageModal from './components/modals/SendMessageModal';
function App() {
    const { isAuthenticated } = useAuth();
    const { addToast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    // Modal states
    const [qrSessionId, setQrSessionId] = useState(null);
    const [showCreateSession, setShowCreateSession] = useState(false);
    const [showCreateTemplate, setShowCreateTemplate] = useState(false);
    const [testTemplate, setTestTemplate] = useState(null);
    const [showSendMessage, setShowSendMessage] = useState(false);
    const { sessions, fetchSessions, createSession, resumeSession, stopSession, deleteSession, } = useSessions(isAuthenticated);
    const { templates, fetchTemplates, refetchTemplates, createTemplate, deleteTemplate, sendTemplate, } = useTemplates(isAuthenticated);
    const { messages, fetchMessages } = useMessageLog(isAuthenticated);
    // Initial data load after auth
    /* eslint-disable @eslint-react/set-state-in-effect */
    useEffect(() => {
        if (isAuthenticated) {
            const loadData = async () => {
                setIsLoading(true);
                await Promise.all([
                    fetchSessions(),
                    fetchTemplates(),
                    fetchMessages(),
                ]);
                setIsLoading(false);
            };
            loadData();
        }
        else {
            setIsLoading(false);
        }
    }, [isAuthenticated, fetchSessions, fetchTemplates, fetchMessages]);
    /* eslint-enable @eslint-react/set-state-in-effect */
    const handleCreateSession = async (sessionId, webhookUrl) => {
        await createSession(sessionId, webhookUrl);
        await fetchSessions();
    };
    const handleResumeSession = async (sessionId) => {
        await resumeSession(sessionId);
        await fetchSessions();
    };
    const handleStopSession = async (sessionId) => {
        await stopSession(sessionId);
        await fetchSessions();
    };
    const handleDeleteSession = async (sessionId) => {
        await deleteSession(sessionId);
        await fetchSessions();
    };
    const handleCreateTemplate = async (template) => {
        await createTemplate(template);
        await refetchTemplates();
    };
    const handleDeleteTemplate = async (name) => {
        await deleteTemplate(name);
        await refetchTemplates();
    };
    const handleTestSend = async (sessionId, to, templateName, variables) => {
        const res = await sendTemplate(sessionId, to, templateName, variables);
        if (res?.result?.messages?.[0]?.key?.id) {
            addToast(`Message sent! ID: ${res.result.messages[0].key.id}`, 'success');
        }
    };
    if (!isAuthenticated) {
        return (_jsxs(_Fragment, { children: [_jsx(AuthScreen, {}), _jsx(ToastContainer, {})] }));
    }
    return (_jsxs("div", { className: "min-h-screen flex flex-col bg-slate-50 text-slate-800", children: [_jsxs("div", { className: "fixed inset-0 -z-10 overflow-hidden pointer-events-none", children: [_jsx("div", { className: "absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100 blur-[120px] opacity-60" }), _jsx("div", { className: "absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[100px] opacity-60" })] }), _jsx(Header, {}), isLoading ? (_jsx("div", { className: "flex-1 flex items-center justify-center", children: _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-4 border-orange-100 border-l-orange-600" }), _jsx("p", { className: "mt-4 text-orange-600 font-medium animate-pulse", children: "Connecting to Gateway..." })] }) })) : (_jsx("main", { className: "flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8", children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-8", children: [_jsxs("div", { className: "lg:col-span-8 space-y-8", children: [_jsx(SessionsPanel, { sessions: sessions, onCreateSession: () => setShowCreateSession(true), onViewQR: (id) => setQrSessionId(id), onResume: handleResumeSession, onStop: handleStopSession, onDelete: handleDeleteSession }), _jsx(MessageLog, { messages: messages, onSendMessage: () => setShowSendMessage(true) })] }), _jsx("div", { className: "lg:col-span-4", children: _jsx(TemplatesPanel, { templates: templates, onCreate: () => setShowCreateTemplate(true), onTestSend: (t) => setTestTemplate(t), onDelete: handleDeleteTemplate }) })] }) })), _jsx(ToastContainer, {}), qrSessionId && (_jsx(QRModal, { sessionId: qrSessionId, onClose: () => setQrSessionId(null) })), showCreateSession && (_jsx(CreateSessionModal, { onCreate: handleCreateSession, onClose: () => setShowCreateSession(false) })), showCreateTemplate && (_jsx(CreateTemplateModal, { onCreate: handleCreateTemplate, onClose: () => setShowCreateTemplate(false) })), testTemplate && (_jsx(TestSendModal, { template: testTemplate, sessions: sessions, onSend: handleTestSend, onClose: () => setTestTemplate(null) })), showSendMessage && (_jsx(SendMessageModal, { sessions: sessions, onClose: () => setShowSendMessage(false), onSent: fetchMessages }))] }));
}
export default App;
