import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { usePolling } from './usePolling';
export function useSessions(enabled) {
    const [sessions, setSessions] = useState([]);
    const apiCall = useApi();
    const fetchSessions = useCallback(async () => {
        const data = await apiCall('/sessions');
        if (data?.sessions) {
            setSessions(data.sessions);
        }
    }, [apiCall]);
    usePolling(fetchSessions, 5000, enabled);
    const createSession = useCallback(async (sessionId, webhookUrl) => {
        return apiCall('/sessions/start', 'POST', { sessionId, webhookUrl });
    }, [apiCall]);
    const resumeSession = useCallback(async (sessionId) => {
        return apiCall('/sessions/start', 'POST', { sessionId });
    }, [apiCall]);
    const stopSession = useCallback(async (sessionId) => {
        return apiCall(`/sessions/${sessionId}/stop`, 'POST');
    }, [apiCall]);
    const deleteSession = useCallback(async (sessionId) => {
        return apiCall(`/sessions/${sessionId}/logout`, 'POST');
    }, [apiCall]);
    const getSessionQR = useCallback(async (sessionId) => {
        return apiCall(`/sessions/${sessionId}/qr`);
    }, [apiCall]);
    return {
        sessions,
        fetchSessions,
        createSession,
        resumeSession,
        stopSession,
        deleteSession,
        getSessionQR,
    };
}
