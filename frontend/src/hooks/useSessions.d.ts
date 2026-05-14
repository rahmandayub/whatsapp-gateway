import type { Session } from '../types/api';
export declare function useSessions(enabled: boolean): {
    sessions: Session[];
    fetchSessions: () => Promise<void>;
    createSession: (sessionId: string, webhookUrl: string) => Promise<import("../types/api").ApiResponse | null>;
    resumeSession: (sessionId: string) => Promise<import("../types/api").ApiResponse | null>;
    stopSession: (sessionId: string) => Promise<import("../types/api").ApiResponse | null>;
    deleteSession: (sessionId: string) => Promise<import("../types/api").ApiResponse | null>;
    getSessionQR: (sessionId: string) => Promise<import("../types/api").ApiResponse | null>;
};
