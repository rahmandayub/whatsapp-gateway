import { useState, useCallback } from 'react';
import { useApi } from './useApi';
import { usePolling } from './usePolling';
import type { MessageLogEntry } from '../types/api';

export function useMessageLog(enabled: boolean) {
    const [messages, setMessages] = useState<MessageLogEntry[]>([]);
    const apiCall = useApi();

    const fetchMessages = useCallback(async () => {
        const data = await apiCall('/admin/message-logs');
        if (data?.logs) {
            setMessages(data.logs as MessageLogEntry[]);
        }
    }, [apiCall]);

    usePolling(fetchMessages, 3000, enabled);

    return { messages, fetchMessages };
}
