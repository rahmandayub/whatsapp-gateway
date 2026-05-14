import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { usePolling } from './usePolling';
export function useMessageLog(enabled) {
    const [messages, setMessages] = useState([]);
    const apiCall = useApi();
    const fetchMessages = useCallback(async () => {
        const data = await apiCall('/sessions/messages/log');
        if (data?.messages) {
            setMessages(data.messages);
        }
    }, [apiCall]);
    usePolling(fetchMessages, 3000, enabled);
    return { messages, fetchMessages };
}
