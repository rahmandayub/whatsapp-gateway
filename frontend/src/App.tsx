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
import type { Template } from './types/api';

function App() {
    const { isAuthenticated, login } = useAuth();
    const { addToast } = useToast();

    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [qrSessionId, setQrSessionId] = useState<string | null>(null);
    const [showCreateSession, setShowCreateSession] = useState(false);
    const [showCreateTemplate, setShowCreateTemplate] = useState(false);
    const [testTemplate, setTestTemplate] = useState<Template | null>(null);
    const [showSendMessage, setShowSendMessage] = useState(false);

    const {
        sessions,
        fetchSessions,
        createSession,
        resumeSession,
        stopSession,
        deleteSession,
    } = useSessions(isAuthenticated);
    const {
        templates,
        fetchTemplates,
        refetchTemplates,
        createTemplate,
        deleteTemplate,
        sendTemplate,
    } = useTemplates(isAuthenticated);
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
        } else {
            setIsLoading(false);
        }
    }, [isAuthenticated, fetchSessions, fetchTemplates, fetchMessages]);
    /* eslint-enable @eslint-react/set-state-in-effect */

    const handleCreateSession = async (
        sessionId: string,
        webhookUrl: string,
    ) => {
        await createSession(sessionId, webhookUrl);
        await fetchSessions();
    };

    const handleResumeSession = async (sessionId: string) => {
        await resumeSession(sessionId);
        await fetchSessions();
    };

    const handleStopSession = async (sessionId: string) => {
        await stopSession(sessionId);
        await fetchSessions();
    };

    const handleDeleteSession = async (sessionId: string) => {
        await deleteSession(sessionId);
        await fetchSessions();
    };

    const handleCreateTemplate = async (template: {
        name: string;
        content: string;
        category?: string;
    }) => {
        await createTemplate(template);
        await refetchTemplates();
    };

    const handleDeleteTemplate = async (name: string) => {
        await deleteTemplate(name);
        await refetchTemplates();
    };

    const handleTestSend = async (
        sessionId: string,
        to: string,
        templateName: string,
        variables: Record<string, string>,
    ) => {
        const res = await sendTemplate(sessionId, to, templateName, variables);
        if (res?.result?.messages?.[0]?.key?.id) {
            addToast(
                `Message sent! ID: ${res.result.messages[0].key.id}`,
                'success',
            );
        }
    };

    if (!isAuthenticated) {
        return (
            <>
                <AuthScreen onLogin={login} />
                <ToastContainer />
            </>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
            {/* Background blobs */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-100 blur-[120px] opacity-60" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-[100px] opacity-60" />
            </div>

            <Header />

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-100 border-l-orange-600" />
                        <p className="mt-4 text-orange-600 font-medium animate-pulse">
                            Connecting to Gateway...
                        </p>
                    </div>
                </div>
            ) : (
                <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-8">
                            <SessionsPanel
                                sessions={sessions}
                                onCreateSession={() =>
                                    setShowCreateSession(true)
                                }
                                onViewQR={(id) => setQrSessionId(id)}
                                onResume={handleResumeSession}
                                onStop={handleStopSession}
                                onDelete={handleDeleteSession}
                            />
                            <MessageLog
                                messages={messages}
                                onSendMessage={() => setShowSendMessage(true)}
                            />
                        </div>
                        <div className="lg:col-span-4">
                            <TemplatesPanel
                                templates={templates}
                                onCreate={() => setShowCreateTemplate(true)}
                                onTestSend={(t) => setTestTemplate(t)}
                                onDelete={handleDeleteTemplate}
                            />
                        </div>
                    </div>
                </main>
            )}

            <ToastContainer />

            {qrSessionId && (
                <QRModal
                    sessionId={qrSessionId}
                    onClose={() => setQrSessionId(null)}
                />
            )}
            {showCreateSession && (
                <CreateSessionModal
                    onCreate={handleCreateSession}
                    onClose={() => setShowCreateSession(false)}
                />
            )}
            {showCreateTemplate && (
                <CreateTemplateModal
                    onCreate={handleCreateTemplate}
                    onClose={() => setShowCreateTemplate(false)}
                />
            )}
            {testTemplate && (
                <TestSendModal
                    template={testTemplate}
                    sessions={sessions}
                    onSend={handleTestSend}
                    onClose={() => setTestTemplate(null)}
                />
            )}
            {showSendMessage && (
                <SendMessageModal
                    sessions={sessions}
                    onClose={() => setShowSendMessage(false)}
                    onSent={fetchMessages}
                />
            )}
        </div>
    );
}

export default App;
