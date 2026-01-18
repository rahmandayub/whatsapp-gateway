import { SessionData } from '../../types/session.types.js';

export class SessionStore {
    private sessions: Map<string, SessionData>;

    constructor() {
        this.sessions = new Map();
    }

    get(sessionId: string): SessionData | undefined {
        return this.sessions.get(sessionId);
    }

    set(sessionId: string, data: SessionData): void {
        this.sessions.set(sessionId, data);
    }

    delete(sessionId: string): boolean {
        return this.sessions.delete(sessionId);
    }

    has(sessionId: string): boolean {
        return this.sessions.has(sessionId);
    }

    getAll(): { sessionId: string; data: SessionData }[] {
        return Array.from(this.sessions.entries()).map(([sessionId, data]) => ({
            sessionId,
            data,
        }));
    }
}
