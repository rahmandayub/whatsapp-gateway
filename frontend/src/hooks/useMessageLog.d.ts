import type { MessageLogEntry } from '../types/api';
export declare function useMessageLog(enabled: boolean): {
    messages: MessageLogEntry[];
    fetchMessages: () => Promise<void>;
};
