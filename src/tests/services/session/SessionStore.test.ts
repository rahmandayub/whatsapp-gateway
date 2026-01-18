import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionStore } from '../../../services/session/SessionStore.js';
import { SessionData } from '../../../types/session.types.js';

describe('SessionStore', () => {
    let store: SessionStore;

    beforeEach(() => {
        store = new SessionStore();
    });

    it('should store and retrieve sessions', () => {
        const sessionData: SessionData = {
            sock: {},
            status: 'CONNECTED',
            reconnectAttempts: 0
        };
        store.set('test', sessionData);
        expect(store.get('test')).toBe(sessionData);
        expect(store.has('test')).toBe(true);
    });

    it('should delete sessions', () => {
        const sessionData: SessionData = {
            sock: {},
            status: 'CONNECTED',
            reconnectAttempts: 0
        };
        store.set('test', sessionData);
        store.delete('test');
        expect(store.has('test')).toBe(false);
    });

    it('should return all sessions', () => {
        store.set('1', { status: 'CONNECTED' } as any);
        store.set('2', { status: 'CONNECTING' } as any);
        expect(store.getAll().length).toBe(2);
    });
});
