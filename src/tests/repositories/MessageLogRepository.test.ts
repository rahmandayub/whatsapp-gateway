import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageLogRepository } from '../../repositories/MessageLogRepository.js';
import pool from '../../config/database.js';

// Mock database pool
vi.mock('../../config/database.js', () => ({
    default: {
        query: vi.fn(),
    },
}));

describe('MessageLogRepository', () => {
    let repo: MessageLogRepository;

    beforeEach(() => {
        repo = new MessageLogRepository();
        vi.clearAllMocks();
    });

    it('should create a log entry', async () => {
        const logData = {
            session_id: 'test',
            direction: 'incoming' as const,
            message_id: 'msg1',
            recipient: '123',
            message_type: 'text',
            content_preview: 'hello',
            status: 'sent'
        };

        await repo.create(logData);

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO message_logs'), expect.any(Array));
    });

    it('should find logs by session id', async () => {
        (pool.query as any).mockResolvedValue({
            rows: [{ id: 1, session_id: 'test', content_preview: 'hello' }]
        });

        const logs = await repo.findBySessionId('test');
        expect(logs.length).toBe(1);
        expect(logs[0].content_preview).toBe('hello');
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM message_logs'), ['test', 50, 0]);
    });
});
